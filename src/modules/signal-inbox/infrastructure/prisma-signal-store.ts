import {
  Prisma,
  SignalState as PrismaSignalState,
  type PrismaClient
} from "@prisma/client";
import {
  ApplicationError,
  InvalidRequestError,
  RevisionConflictError,
  SignalNotFoundError,
  StorageUnavailableError
} from "@/shared/errors";
import { requireUuid } from "@/shared/validation";
import type {
  AppendTriageRecord,
  AppendTriageResult,
  ListSignalsQuery,
  SignalPage,
  SignalStore
} from "../application/ports";
import type {
  SignalDetail,
  SignalRecord,
  SignalState,
  TriageEventRecord
} from "../domain/signal";

interface CursorPayload {
  readonly createdAt: string;
  readonly id: string;
}

interface SignalRow {
  readonly id: string;
  readonly feedbackId: string;
  readonly statement: string;
  readonly state: PrismaSignalState;
  readonly revision: number;
  readonly createdAt: Date;
}

function fromPrismaState(state: PrismaSignalState): SignalState {
  switch (state) {
    case PrismaSignalState.NEW:
      return "new";
    case PrismaSignalState.REVIEWING:
      return "reviewing";
    case PrismaSignalState.ACCEPTED:
      return "accepted";
    case PrismaSignalState.REJECTED:
      return "rejected";
  }
}

function toPrismaState(state: SignalState): PrismaSignalState {
  switch (state) {
    case "new":
      return PrismaSignalState.NEW;
    case "reviewing":
      return PrismaSignalState.REVIEWING;
    case "accepted":
      return PrismaSignalState.ACCEPTED;
    case "rejected":
      return PrismaSignalState.REJECTED;
  }
}

function toSignal(row: SignalRow): SignalRecord {
  return {
    id: row.id,
    feedbackId: row.feedbackId,
    statement: row.statement,
    state: fromPrismaState(row.state),
    revision: row.revision,
    createdAt: row.createdAt
  };
}

function encodeCursor(row: SignalRow): string {
  const payload: CursorPayload = { createdAt: row.createdAt.toISOString(), id: row.id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { readonly createdAt: Date; readonly id: string } {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("createdAt" in parsed) ||
      !("id" in parsed) ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      throw new Error("invalid cursor shape");
    }
    requireUuid(parsed.id, "cursor");
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== parsed.createdAt) {
      throw new Error("invalid cursor timestamp");
    }
    return { createdAt, id: parsed.id };
  } catch {
    throw new InvalidRequestError("cursor is invalid.", ["cursor"]);
  }
}

function mapTriageEvent(row: {
  readonly id: string;
  readonly signalId: string;
  readonly sequence: number;
  readonly fromState: PrismaSignalState;
  readonly toState: PrismaSignalState;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly createdAt: Date;
}): TriageEventRecord {
  return {
    ...row,
    fromState: fromPrismaState(row.fromState),
    toState: fromPrismaState(row.toState)
  };
}

export class PrismaSignalStore implements SignalStore {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: ListSignalsQuery): Promise<SignalPage> {
    try {
      const decoded = query.cursor === null ? null : decodeCursor(query.cursor);
      const rows = await this.prisma.signal.findMany({
        where:
          decoded === null
            ? undefined
            : {
                OR: [
                  { createdAt: { lt: decoded.createdAt } },
                  { createdAt: decoded.createdAt, id: { lt: decoded.id } }
                ]
              },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: query.limit + 1
      });
      const hasNextPage = rows.length > query.limit;
      const pageRows = rows.slice(0, query.limit);
      const lastRow = pageRows.at(-1);
      return {
        items: pageRows.map(toSignal),
        nextCursor: hasNextPage && lastRow !== undefined ? encodeCursor(lastRow) : null
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new StorageUnavailableError();
    }
  }

  async get(signalId: string): Promise<SignalDetail | null> {
    try {
      const row = await this.prisma.signal.findUnique({
        where: { id: signalId },
        include: {
          feedback: true,
          triageEvents: { orderBy: { sequence: "asc" } }
        }
      });
      if (row === null) {
        return null;
      }
      return {
        signal: toSignal(row),
        feedback: row.feedback,
        triageEvents: row.triageEvents.map(mapTriageEvent)
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new StorageUnavailableError();
    }
  }

  async appendTriage(record: AppendTriageRecord): Promise<AppendTriageResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.signal.findUnique({
          where: { id: record.signalId }
        });
        if (current === null) {
          throw new SignalNotFoundError();
        }
        if (current.revision !== record.expectedRevision) {
          throw new RevisionConflictError();
        }

        const updated = await transaction.signal.updateMany({
          where: { id: record.signalId, revision: record.expectedRevision },
          data: {
            state: toPrismaState(record.toState),
            revision: { increment: 1 }
          }
        });
        if (updated.count !== 1) {
          throw new RevisionConflictError();
        }

        const event = await transaction.triageEvent.create({
          data: {
            id: record.eventId,
            signalId: record.signalId,
            sequence: record.expectedRevision + 1,
            fromState: current.state,
            toState: toPrismaState(record.toState),
            rationale: record.rationale,
            operatorLabel: record.operatorLabel,
            createdAt: record.createdAt
          }
        });
        const signal = await transaction.signal.findUniqueOrThrow({
          where: { id: record.signalId }
        });
        return { event: mapTriageEvent(event), signal: toSignal(signal) };
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RevisionConflictError();
      }
      throw new StorageUnavailableError();
    }
  }
}
