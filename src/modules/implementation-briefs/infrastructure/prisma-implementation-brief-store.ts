import type { Prisma, PrismaClient } from "@prisma/client";
import { StorageUnavailableError } from "@/shared/errors";
import type {
  CreateImplementationBriefRecord,
  ImplementationBriefReader,
  ImplementationBriefWriter
} from "../application";
import type { ImplementationBriefRecord } from "../domain/implementation-brief";

type PrismaDatabase = PrismaClient | Prisma.TransactionClient;

function toImplementationBrief(row: {
  readonly id: string;
  readonly productIssueId: string;
  readonly objective: string;
  readonly acceptanceCriteria: string[];
  readonly constraints: string[];
  readonly approvedBy: string;
  readonly approvedAt: Date;
}): ImplementationBriefRecord {
  return row;
}

export class PrismaImplementationBriefStore
  implements ImplementationBriefReader, ImplementationBriefWriter
{
  constructor(private readonly prisma: PrismaDatabase) {}

  async create(record: CreateImplementationBriefRecord): Promise<ImplementationBriefRecord> {
    const created = await this.prisma.implementationBrief.create({
      data: {
        ...record,
        acceptanceCriteria: [...record.acceptanceCriteria],
        constraints: [...record.constraints]
      }
    });
    return toImplementationBrief(created);
  }

  async getByProductIssueId(
    productIssueId: string
  ): Promise<ImplementationBriefRecord | null> {
    try {
      const row = await this.prisma.implementationBrief.findUnique({
        where: { productIssueId }
      });
      return row === null ? null : toImplementationBrief(row);
    } catch {
      throw new StorageUnavailableError();
    }
  }
}
