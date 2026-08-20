import { Prisma, type PrismaClient } from "@prisma/client";
import type { PreparedReviewDelivery } from "@/modules/review-deliveries/application";
import { PrismaReviewDeliveryStore } from "@/modules/review-deliveries/infrastructure/prisma-review-delivery-store";
import {
  ApplicationError,
  ImplementationBriefNotFoundError,
  ReviewDeliveryExistsError,
  StorageUnavailableError
} from "@/shared/errors";
import type { BriefDeliveryUnitOfWork, RecordReviewDeliveryResult } from "./ports";

interface LockedImplementationBrief {
  readonly implementationBriefId: string;
  readonly productIssueId: string;
  readonly signalId: string;
  readonly signalRevision: number;
  readonly feedbackId: string;
}

export class PrismaBriefDeliveryUnitOfWork implements BriefDeliveryUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async record(
    implementationBriefId: string,
    prepared: PreparedReviewDelivery,
    deliveryId: string,
    deliveredAt: Date
  ): Promise<RecordReviewDeliveryResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const briefs = await transaction.$queryRaw<LockedImplementationBrief[]>(Prisma.sql`
          SELECT
            brief."id" AS "implementationBriefId",
            issue."id" AS "productIssueId",
            issue."signalId" AS "signalId",
            issue."sourceSignalRevision" AS "signalRevision",
            signal."feedbackId" AS "feedbackId"
          FROM "ImplementationBrief" AS brief
          INNER JOIN "ProductIssue" AS issue ON issue."id" = brief."productIssueId"
          INNER JOIN "Signal" AS signal ON signal."id" = issue."signalId"
          WHERE brief."id" = ${implementationBriefId}::uuid
          FOR UPDATE OF brief
        `);
        const brief = briefs[0];
        if (brief === undefined) {
          throw new ImplementationBriefNotFoundError();
        }
        const existing = await transaction.reviewDelivery.findUnique({
          where: { implementationBriefId }
        });
        if (existing !== null) {
          throw new ReviewDeliveryExistsError();
        }
        const reviewDelivery = await new PrismaReviewDeliveryStore(transaction).create({
          id: deliveryId,
          implementationBriefId,
          ...prepared,
          deliveredAt
        });
        return { reviewDelivery, lineage: brief };
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ReviewDeliveryExistsError();
      }
      throw new StorageUnavailableError();
    }
  }
}
