import type { GetProductIssueBySignal } from "@/modules/product-issues/application";
import type { GetSignal, SignalDetail } from "@/modules/signal-inbox/application";
import type { ProductIssueRecord } from "@/modules/product-issues/application";

export interface SignalDetailWithIssue extends SignalDetail {
  readonly productIssue: ProductIssueRecord | null;
}

export class GetSignalDetailWithIssue {
  constructor(
    private readonly getSignal: GetSignal,
    private readonly getProductIssueBySignal: GetProductIssueBySignal
  ) {}

  async execute(signalId: string): Promise<SignalDetailWithIssue> {
    const [detail, productIssue] = await Promise.all([
      this.getSignal.execute(signalId),
      this.getProductIssueBySignal.execute(signalId)
    ]);
    return { ...detail, productIssue };
  }
}
