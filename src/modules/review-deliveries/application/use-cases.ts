import type { ReviewDeliveryRecord } from "../domain/review-delivery";
import type { ReviewDeliveryReader } from "./ports";

export class GetReviewDeliveryByImplementationBrief {
  constructor(private readonly reader: ReviewDeliveryReader) {}

  execute(implementationBriefId: string): Promise<ReviewDeliveryRecord | null> {
    return this.reader.getByImplementationBriefId(implementationBriefId);
  }
}
