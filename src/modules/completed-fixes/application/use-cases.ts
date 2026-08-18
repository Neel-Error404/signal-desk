import type { CompletedFixRecord } from "../domain/completed-fix";
import type { CompletedFixReader } from "./ports";

export class GetCompletedFixByReviewDelivery {
  constructor(private readonly reader: CompletedFixReader) {}

  execute(reviewDeliveryId: string): Promise<CompletedFixRecord | null> {
    return this.reader.getByReviewDeliveryId(reviewDeliveryId);
  }
}
