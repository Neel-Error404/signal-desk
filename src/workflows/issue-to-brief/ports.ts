import type {
  ImplementationBriefRecord,
  PreparedImplementationBrief
} from "@/modules/implementation-briefs/application";

export interface ImplementationBriefLineage {
  readonly feedbackId: string;
  readonly signalId: string;
  readonly signalRevision: number;
  readonly productIssueId: string;
}

export interface ApproveImplementationBriefResult {
  readonly implementationBrief: ImplementationBriefRecord;
  readonly lineage: ImplementationBriefLineage;
}

export interface IssueBriefUnitOfWork {
  approve(
    productIssueId: string,
    prepared: PreparedImplementationBrief,
    briefId: string,
    approvedAt: Date
  ): Promise<ApproveImplementationBriefResult>;
}
