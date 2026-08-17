import type { GetProductIssueBySignal } from "@/modules/product-issues/application";
import type { GetSignal, SignalDetail } from "@/modules/signal-inbox/application";
import type { ProductIssueRecord } from "@/modules/product-issues/application";
import type {
  GetImplementationBriefByProductIssue,
  ImplementationBriefRecord
} from "@/modules/implementation-briefs/application";
import type {
  GetReviewDeliveryByImplementationBrief,
  ReviewDeliveryRecord
} from "@/modules/review-deliveries/application";

export interface SignalDetailWithIssue extends SignalDetail {
  readonly productIssue: ProductIssueRecord | null;
  readonly implementationBrief: ImplementationBriefRecord | null;
  readonly reviewDelivery: ReviewDeliveryRecord | null;
}

export class GetSignalDetailWithIssue {
  constructor(
    private readonly getSignal: GetSignal,
    private readonly getProductIssueBySignal: GetProductIssueBySignal,
    private readonly getImplementationBriefByProductIssue: GetImplementationBriefByProductIssue,
    private readonly getReviewDeliveryByImplementationBrief: GetReviewDeliveryByImplementationBrief
  ) {}

  async execute(signalId: string): Promise<SignalDetailWithIssue> {
    const [detail, productIssue] = await Promise.all([
      this.getSignal.execute(signalId),
      this.getProductIssueBySignal.execute(signalId)
    ]);
    const implementationBrief =
      productIssue === null
        ? null
        : await this.getImplementationBriefByProductIssue.execute(productIssue.id);
    const reviewDelivery =
      implementationBrief === null
        ? null
        : await this.getReviewDeliveryByImplementationBrief.execute(implementationBrief.id);
    return { ...detail, productIssue, implementationBrief, reviewDelivery };
  }
}
