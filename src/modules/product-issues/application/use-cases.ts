import type { ProductIssueRecord } from "../domain/product-issue";
import type { ProductIssueReader } from "./ports";

export class GetProductIssueBySignal {
  constructor(private readonly reader: ProductIssueReader) {}

  execute(signalId: string): Promise<ProductIssueRecord | null> {
    return this.reader.getBySignalId(signalId);
  }
}
