import type {
  ProductIssuePriority,
  ProductIssueRecord
} from "../domain/product-issue";

export interface CreateProductIssueRecord {
  readonly id: string;
  readonly signalId: string;
  readonly sourceSignalRevision: number;
  readonly title: string;
  readonly priority: ProductIssuePriority;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly createdAt: Date;
}

export interface ProductIssueWriter {
  create(record: CreateProductIssueRecord): Promise<ProductIssueRecord>;
}

export interface ProductIssueReader {
  getBySignalId(signalId: string): Promise<ProductIssueRecord | null>;
}
