import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CompletedFixReader,
  CompletedFixRecord,
  CompletedFixWriter
} from "../application";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class PrismaCompletedFixStore implements CompletedFixReader, CompletedFixWriter {
  constructor(private readonly prisma: PrismaLike) {}

  async create(record: CompletedFixRecord): Promise<CompletedFixRecord> {
    return this.prisma.completedFix.create({ data: record });
  }

  async getByReviewDeliveryId(reviewDeliveryId: string): Promise<CompletedFixRecord | null> {
    return this.prisma.completedFix.findUnique({ where: { reviewDeliveryId } });
  }
}
