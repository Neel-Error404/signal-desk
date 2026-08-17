import type {
  PreparedReviewDelivery,
  ReviewDeliveryRecord
} from "@/modules/review-deliveries/application";

export interface ReviewDeliveryLineage {
  readonly feedbackId: string;
  readonly signalId: string;
  readonly signalRevision: number;
  readonly productIssueId: string;
  readonly implementationBriefId: string;
}

export interface RecordReviewDeliveryResult {
  readonly reviewDelivery: ReviewDeliveryRecord;
  readonly lineage: ReviewDeliveryLineage;
}

export interface BriefDeliveryUnitOfWork {
  record(
    implementationBriefId: string,
    prepared: PreparedReviewDelivery,
    deliveryId: string,
    deliveredAt: Date
  ): Promise<RecordReviewDeliveryResult>;
}
