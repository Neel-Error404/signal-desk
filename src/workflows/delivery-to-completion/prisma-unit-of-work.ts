import { Prisma, type PrismaClient } from "@prisma/client";
import type { PreparedCompletedFix } from "@/modules/completed-fixes/application";
import { PrismaCompletedFixStore } from "@/modules/completed-fixes/infrastructure/prisma-completed-fix-store";
import {
  ApplicationError,
  CompletedFixExistsError,
  ReviewDeliveryNotFoundError,
  StorageUnavailableError
} from "@/shared/errors";
import type {
  DeliveryCompletionUnitOfWork,
  RecordCompletedFixResult
} from "./ports";

interface LockedReviewDelivery {
  readonly reviewDeliveryId: string;
  readonly implementationBriefId: string;
  readonly productIssueId: string;
  readonly signalId: string;
  readonly signalRevision: number;
  readonly feedbackId: string;
}

export class PrismaDeliveryCompletionUnitOfWork implements DeliveryCompletionUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async record(
    reviewDeliveryId: string,
    prepared: PreparedCompletedFix,
    completedFixId: string,
    completedAt: Date
  ): Promise<RecordCompletedFixResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const deliveries = await transaction.$queryRaw<LockedReviewDelivery[]>(Prisma.sql`
          SELECT
            delivery."id" AS "reviewDeliveryId",
            brief."id" AS "implementationBriefId",
            issue."id" AS "productIssueId",
            issue."signalId" AS "signalId",
            issue."sourceSignalRevision" AS "signalRevision",
            signal."feedbackId" AS "feedbackId"
          FROM "ReviewDelivery" AS delivery
          INNER JOIN "ImplementationBrief" AS brief
            ON brief."id" = delivery."implementationBriefId"
          INNER JOIN "ProductIssue" AS issue ON issue."id" = brief."productIssueId"
          INNER JOIN "Signal" AS signal ON signal."id" = issue."signalId"
          WHERE delivery."id" = ${reviewDeliveryId}::uuid
          FOR UPDATE OF delivery
        `);
        const delivery = deliveries[0];
        if (delivery === undefined) {
          throw new ReviewDeliveryNotFoundError();
        }
        const existing = await transaction.completedFix.findUnique({
          where: { reviewDeliveryId }
        });
        if (existing !== null) {
          throw new CompletedFixExistsError();
        }
        const completedFix = await new PrismaCompletedFixStore(transaction).create({
          id: completedFixId,
          reviewDeliveryId,
          ...prepared,
          completedAt
        });
        return { completedFix, lineage: delivery };
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new CompletedFixExistsError();
      }
      throw new StorageUnavailableError();
    }
  }
}
