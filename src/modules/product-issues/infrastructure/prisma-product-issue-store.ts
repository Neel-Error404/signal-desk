import {
  ProductIssuePriority as PrismaProductIssuePriority,
  type Prisma,
  type PrismaClient
} from "@prisma/client";
import { StorageUnavailableError } from "@/shared/errors";
import type {
  CreateProductIssueRecord,
  ProductIssueReader,
  ProductIssueWriter
} from "../application";
import type {
  ProductIssuePriority,
  ProductIssueRecord
} from "../domain/product-issue";

type PrismaDatabase = PrismaClient | Prisma.TransactionClient;

function fromPrismaPriority(priority: PrismaProductIssuePriority): ProductIssuePriority {
  switch (priority) {
    case PrismaProductIssuePriority.LOW:
      return "low";
    case PrismaProductIssuePriority.MEDIUM:
      return "medium";
    case PrismaProductIssuePriority.HIGH:
      return "high";
    case PrismaProductIssuePriority.CRITICAL:
      return "critical";
  }
}

function toPrismaPriority(priority: ProductIssuePriority): PrismaProductIssuePriority {
  switch (priority) {
    case "low":
      return PrismaProductIssuePriority.LOW;
    case "medium":
      return PrismaProductIssuePriority.MEDIUM;
    case "high":
      return PrismaProductIssuePriority.HIGH;
    case "critical":
      return PrismaProductIssuePriority.CRITICAL;
  }
}

function toProductIssue(row: {
  readonly id: string;
  readonly signalId: string;
  readonly sourceSignalRevision: number;
  readonly title: string;
  readonly priority: PrismaProductIssuePriority;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly createdAt: Date;
}): ProductIssueRecord {
  return { ...row, priority: fromPrismaPriority(row.priority) };
}

export class PrismaProductIssueStore implements ProductIssueReader, ProductIssueWriter {
  constructor(private readonly prisma: PrismaDatabase) {}

  async create(record: CreateProductIssueRecord): Promise<ProductIssueRecord> {
    const created = await this.prisma.productIssue.create({
      data: { ...record, priority: toPrismaPriority(record.priority) }
    });
    return toProductIssue(created);
  }

  async getBySignalId(signalId: string): Promise<ProductIssueRecord | null> {
    try {
      const row = await this.prisma.productIssue.findUnique({ where: { signalId } });
      return row === null ? null : toProductIssue(row);
    } catch {
      throw new StorageUnavailableError();
    }
  }
}
