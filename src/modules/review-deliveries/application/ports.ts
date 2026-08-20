import type { ReviewDeliveryRecord } from "../domain/review-delivery";

export type CreateReviewDeliveryRecord = ReviewDeliveryRecord;

export interface ReviewDeliveryWriter {
  create(record: CreateReviewDeliveryRecord): Promise<ReviewDeliveryRecord>;
}

export interface ReviewDeliveryReader {
  getByImplementationBriefId(
    implementationBriefId: string
  ): Promise<ReviewDeliveryRecord | null>;
}
