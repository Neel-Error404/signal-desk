import type { CompletedFixRecord } from "../domain/completed-fix";

export interface CompletedFixWriter {
  create(record: CompletedFixRecord): Promise<CompletedFixRecord>;
}

export interface CompletedFixReader {
  getByReviewDeliveryId(reviewDeliveryId: string): Promise<CompletedFixRecord | null>;
}
