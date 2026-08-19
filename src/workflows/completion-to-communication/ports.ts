import type {
  PreparedReleaseCommunication,
  ReleaseCommunicationRecord
} from "@/modules/release-communications/application";

export interface ReleaseCommunicationLineage {
  readonly feedbackId: string;
  readonly signalId: string;
  readonly signalRevision: number;
  readonly productIssueId: string;
  readonly implementationBriefId: string;
  readonly reviewDeliveryId: string;
  readonly completedFixId: string;
}

export interface ApproveReleaseCommunicationResult {
  readonly releaseCommunication: ReleaseCommunicationRecord;
  readonly lineage: ReleaseCommunicationLineage;
}

export interface CompletionCommunicationUnitOfWork {
  approve(
    completedFixId: string,
    prepared: PreparedReleaseCommunication,
    releaseCommunicationId: string,
    approvedAt: Date
  ): Promise<ApproveReleaseCommunicationResult>;
}
