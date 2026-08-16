import { Prisma, type PrismaClient } from "@prisma/client";
import type { FeedbackWriter } from "@/modules/feedback-intake/application";
import type { SignalWriter } from "@/modules/signal-inbox/application";
import {
  ApplicationError,
  LineageConflictError,
  StorageUnavailableError
} from "@/shared/errors";
import type {
  FeedbackSignalTransaction,
  FeedbackSignalUnitOfWork
} from "./ports";

type FeedbackWriterFactory = (transaction: Prisma.TransactionClient) => FeedbackWriter;
type SignalWriterFactory = (transaction: Prisma.TransactionClient) => SignalWriter;

function isFeedbackLineageConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  const target = error.meta?.target;
  const fields =
    typeof target === "string"
      ? [target]
      : Array.isArray(target)
        ? target.filter((field): field is string => typeof field === "string")
        : [];
  return fields.some(
    (field) =>
      field === "feedbackId" ||
      field.includes("Signal_feedbackId_key")
  );
}

export class PrismaFeedbackSignalUnitOfWork implements FeedbackSignalUnitOfWork {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly feedbackWriterFactory: FeedbackWriterFactory,
    private readonly signalWriterFactory: SignalWriterFactory
  ) {}

  async run<T>(work: (transaction: FeedbackSignalTransaction) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction((transaction) =>
        work({
          feedback: this.feedbackWriterFactory(transaction),
          signals: this.signalWriterFactory(transaction)
        })
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (isFeedbackLineageConflict(error)) {
        throw new LineageConflictError();
      }
      throw new StorageUnavailableError();
    }
  }
}
