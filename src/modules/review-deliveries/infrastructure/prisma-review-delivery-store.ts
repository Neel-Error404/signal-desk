import type { Prisma, PrismaClient } from "@prisma/client";
import { StorageUnavailableError } from "@/shared/errors";
import type {
  CreateReviewDeliveryRecord,
  ReviewDeliveryReader,
  ReviewDeliveryRecord,
  ReviewDeliveryWriter
} from "../application";

type PrismaDatabase = PrismaClient | Prisma.TransactionClient;

function toReviewDelivery(row: ReviewDeliveryRecord): ReviewDeliveryRecord {
  return row;
}

export class PrismaReviewDeliveryStore
  implements ReviewDeliveryReader, ReviewDeliveryWriter
{
  constructor(private readonly prisma: PrismaDatabase) {}

  async create(record: CreateReviewDeliveryRecord): Promise<ReviewDeliveryRecord> {
    return toReviewDelivery(
      await this.prisma.reviewDelivery.create({ data: record })
    );
  }

  async getByImplementationBriefId(
    implementationBriefId: string
  ): Promise<ReviewDeliveryRecord | null> {
    try {
      const row = await this.prisma.reviewDelivery.findUnique({
        where: { implementationBriefId }
      });
      return row === null ? null : toReviewDelivery(row);
    } catch {
      throw new StorageUnavailableError();
    }
  }
}
