import { Prisma, type PrismaClient } from "@prisma/client";
import type { PreparedImplementationBrief } from "@/modules/implementation-briefs/application";
import { PrismaImplementationBriefStore } from "@/modules/implementation-briefs/infrastructure/prisma-implementation-brief-store";
import {
  ApplicationError,
  ImplementationBriefExistsError,
  ProductIssueNotFoundError,
  StorageUnavailableError
} from "@/shared/errors";
import type { ApproveImplementationBriefResult, IssueBriefUnitOfWork } from "./ports";

interface LockedProductIssue {
  readonly productIssueId: string;
  readonly signalId: string;
  readonly signalRevision: number;
  readonly feedbackId: string;
}

export class PrismaIssueBriefUnitOfWork implements IssueBriefUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async approve(
    productIssueId: string,
    prepared: PreparedImplementationBrief,
    briefId: string,
    approvedAt: Date
  ): Promise<ApproveImplementationBriefResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const issues = await transaction.$queryRaw<LockedProductIssue[]>(Prisma.sql`
          SELECT
            issue."id" AS "productIssueId",
            issue."signalId" AS "signalId",
            issue."sourceSignalRevision" AS "signalRevision",
            signal."feedbackId" AS "feedbackId"
          FROM "ProductIssue" AS issue
          INNER JOIN "Signal" AS signal ON signal."id" = issue."signalId"
          WHERE issue."id" = ${productIssueId}::uuid
          FOR UPDATE OF issue
        `);
        const issue = issues[0];
        if (issue === undefined) {
          throw new ProductIssueNotFoundError();
        }
        const existing = await transaction.implementationBrief.findUnique({
          where: { productIssueId }
        });
        if (existing !== null) {
          throw new ImplementationBriefExistsError();
        }
        const implementationBrief = await new PrismaImplementationBriefStore(
          transaction
        ).create({
          id: briefId,
          productIssueId,
          objective: prepared.objective,
          acceptanceCriteria: [...prepared.acceptanceCriteria],
          constraints: [...prepared.constraints],
          approvedBy: prepared.approvedBy,
          approvedAt
        });
        return { implementationBrief, lineage: issue };
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        JSON.stringify(error.meta?.target ?? []).includes("productIssueId")
      ) {
        throw new ImplementationBriefExistsError();
      }
      throw new StorageUnavailableError();
    }
  }
}
