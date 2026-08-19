import { Prisma, type PrismaClient } from "@prisma/client";
import type { PreparedReleaseCommunication } from "@/modules/release-communications/application";
import { PrismaReleaseCommunicationStore } from "@/modules/release-communications/infrastructure/prisma-release-communication-store";
import {
  ApplicationError,
  CompletedFixNotFoundError,
  ReleaseCommunicationExistsError,
  StorageUnavailableError
} from "@/shared/errors";
import type {
  ApproveReleaseCommunicationResult,
  CompletionCommunicationUnitOfWork
} from "./ports";

interface LockedCompletedFix {
  readonly completedFixId: string;
  readonly reviewDeliveryId: string;
  readonly implementationBriefId: string;
  readonly productIssueId: string;
  readonly signalId: string;
  readonly signalRevision: number;
  readonly feedbackId: string;
}

export class PrismaCompletionCommunicationUnitOfWork
  implements CompletionCommunicationUnitOfWork
{
  constructor(private readonly prisma: PrismaClient) {}

  async approve(
    completedFixId: string,
    prepared: PreparedReleaseCommunication,
    releaseCommunicationId: string,
    approvedAt: Date
  ): Promise<ApproveReleaseCommunicationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const fixes = await transaction.$queryRaw<LockedCompletedFix[]>(Prisma.sql`
          SELECT
            fix."id" AS "completedFixId",
            delivery."id" AS "reviewDeliveryId",
            brief."id" AS "implementationBriefId",
            issue."id" AS "productIssueId",
            issue."signalId" AS "signalId",
            issue."sourceSignalRevision" AS "signalRevision",
            signal."feedbackId" AS "feedbackId"
          FROM "CompletedFix" AS fix
          INNER JOIN "ReviewDelivery" AS delivery ON delivery."id" = fix."reviewDeliveryId"
          INNER JOIN "ImplementationBrief" AS brief
            ON brief."id" = delivery."implementationBriefId"
          INNER JOIN "ProductIssue" AS issue ON issue."id" = brief."productIssueId"
          INNER JOIN "Signal" AS signal ON signal."id" = issue."signalId"
          WHERE fix."id" = ${completedFixId}::uuid
          FOR UPDATE OF fix
        `);
        const fix = fixes[0];
        if (fix === undefined) {
          throw new CompletedFixNotFoundError();
        }
        const existing = await transaction.releaseCommunication.findUnique({
          where: { completedFixId }
        });
        if (existing !== null) {
          throw new ReleaseCommunicationExistsError();
        }
        const releaseCommunication = await new PrismaReleaseCommunicationStore(
          transaction
        ).create({
          id: releaseCommunicationId,
          completedFixId,
          ...prepared,
          approvedAt
        });
        return { releaseCommunication, lineage: fix };
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ReleaseCommunicationExistsError();
      }
      throw new StorageUnavailableError();
    }
  }
}
