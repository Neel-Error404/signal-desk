import type {
  CompletedFixRecord,
  PreparedCompletedFix
} from "@/modules/completed-fixes/application";

export interface CompletedFixLineage {
  readonly feedbackId: string;
  readonly signalId: string;
  readonly signalRevision: number;
  readonly productIssueId: string;
  readonly implementationBriefId: string;
  readonly reviewDeliveryId: string;
}

export interface RecordCompletedFixResult {
  readonly completedFix: CompletedFixRecord;
  readonly lineage: CompletedFixLineage;
}

export interface DeliveryCompletionUnitOfWork {
  record(
    reviewDeliveryId: string,
    prepared: PreparedCompletedFix,
    completedFixId: string,
    completedAt: Date
  ): Promise<RecordCompletedFixResult>;
}
