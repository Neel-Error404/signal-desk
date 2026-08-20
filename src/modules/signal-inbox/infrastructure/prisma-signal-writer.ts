import { SignalState as PrismaSignalState, type Prisma } from "@prisma/client";
import type {
  CreateSignalRecord,
  SignalWriter
} from "../application/ports";
import type { SignalRecord } from "../domain/signal";

export class PrismaSignalWriter implements SignalWriter {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async create(record: CreateSignalRecord): Promise<SignalRecord> {
    const created = await this.transaction.signal.create({
      data: {
        id: record.id,
        feedbackId: record.feedbackId,
        statement: record.statement,
        state: PrismaSignalState.NEW,
        revision: 0,
        createdAt: record.createdAt
      }
    });
    return {
      ...created,
      state: "new"
    };
  }
}
