import type {
  PreparedProductIssue,
  ProductIssueRecord
} from "@/modules/product-issues/application";

export interface ProductIssueLineage {
  readonly feedbackId: string;
  readonly signalId: string;
  readonly signalRevision: number;
}

export interface PromoteSignalToIssueResult {
  readonly productIssue: ProductIssueRecord;
  readonly lineage: ProductIssueLineage;
}

export interface SignalIssueUnitOfWork {
  promote(
    signalId: string,
    prepared: PreparedProductIssue,
    issueId: string,
    createdAt: Date
  ): Promise<PromoteSignalToIssueResult>;
}
