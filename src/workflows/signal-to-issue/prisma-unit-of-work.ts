import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaProductIssueStore } from "@/modules/product-issues/infrastructure/prisma-product-issue-store";
import {
  ApplicationError,
  ProductIssueExistsError,
  RevisionConflictError,
  SignalNotAcceptedError,
  SignalNotFoundError,
  StorageUnavailableError
} from "@/shared/errors";
import type {
  PromoteSignalToIssueResult,
  SignalIssueUnitOfWork
} from "./ports";
import type { PreparedProductIssue } from "@/modules/product-issues/application";

interface LockedSignal {
  readonly id: string;
  readonly feedbackId: string;
  readonly state: "new" | "reviewing" | "accepted" | "rejected";
  readonly revision: number;
}

export class PrismaSignalIssueUnitOfWork implements SignalIssueUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async promote(
    signalId: string,
    prepared: PreparedProductIssue,
    issueId: string,
    createdAt: Date
  ): Promise<PromoteSignalToIssueResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const signals = await transaction.$queryRaw<LockedSignal[]>(Prisma.sql`
          SELECT "id", "feedbackId", "state", "revision"
          FROM "Signal"
          WHERE "id" = ${signalId}::uuid
          FOR UPDATE
        `);
        const signal = signals[0];
        if (signal === undefined) {
          throw new SignalNotFoundError();
        }
        if (signal.revision !== prepared.expectedSignalRevision) {
          throw new RevisionConflictError();
        }
        if (signal.state !== "accepted") {
          throw new SignalNotAcceptedError();
        }
        const existing = await transaction.productIssue.findUnique({ where: { signalId } });
        if (existing !== null) {
          throw new ProductIssueExistsError();
        }

        const productIssue = await new PrismaProductIssueStore(transaction).create({
          id: issueId,
          signalId,
          sourceSignalRevision: signal.revision,
          title: prepared.title,
          priority: prepared.priority,
          rationale: prepared.rationale,
          operatorLabel: prepared.operatorLabel,
          createdAt
        });
        return {
          productIssue,
          lineage: {
            feedbackId: signal.feedbackId,
            signalId,
            signalRevision: signal.revision
          }
        };
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        JSON.stringify(error.meta?.target ?? []).includes("signalId")
      ) {
        throw new ProductIssueExistsError();
      }
      throw new StorageUnavailableError();
    }
  }
}
