import type { ImplementationBriefRecord } from "../domain/implementation-brief";

export type CreateImplementationBriefRecord = ImplementationBriefRecord;

export interface ImplementationBriefWriter {
  create(record: CreateImplementationBriefRecord): Promise<ImplementationBriefRecord>;
}

export interface ImplementationBriefReader {
  getByProductIssueId(productIssueId: string): Promise<ImplementationBriefRecord | null>;
}
