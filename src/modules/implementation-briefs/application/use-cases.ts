import type { ImplementationBriefRecord } from "../domain/implementation-brief";
import type { ImplementationBriefReader } from "./ports";

export class GetImplementationBriefByProductIssue {
  constructor(private readonly reader: ImplementationBriefReader) {}

  execute(productIssueId: string): Promise<ImplementationBriefRecord | null> {
    return this.reader.getByProductIssueId(productIssueId);
  }
}
