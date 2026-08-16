import type { Prisma } from "@prisma/client";
import type {
  CreateFeedbackRecord,
  FeedbackWriter
} from "../application/ports";
import type { FeedbackRecord } from "../domain/feedback";

export class PrismaFeedbackWriter implements FeedbackWriter {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async create(record: CreateFeedbackRecord): Promise<FeedbackRecord> {
    return this.transaction.feedback.create({ data: record });
  }
}
