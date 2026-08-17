import type { GetProductIssueBySignal } from "@/modules/product-issues/application";
import type { GetSignal, SignalDetail } from "@/modules/signal-inbox/application";
import type { ProductIssueRecord } from "@/modules/product-issues/application";
import type {
  GetImplementationBriefByProductIssue,
  ImplementationBriefRecord
} from "@/modules/implementation-briefs/application";

export interface SignalDetailWithIssue extends SignalDetail {
  readonly productIssue: ProductIssueRecord | null;
  readonly implementationBrief: ImplementationBriefRecord | null;
}

export class GetSignalDetailWithIssue {
  constructor(
    private readonly getSignal: GetSignal,
    private readonly getProductIssueBySignal: GetProductIssueBySignal,
    private readonly getImplementationBriefByProductIssue: GetImplementationBriefByProductIssue
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
    return { ...detail, productIssue, implementationBrief };
  }
}
