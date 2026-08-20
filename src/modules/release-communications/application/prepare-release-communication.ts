import {
  ContentAcknowledgementRequiredError,
  ReleaseApprovalRequiredError
} from "@/shared/errors";
import { prepareReleaseCommunicationValues } from "../domain/release-communication";

export interface ReleaseCommunicationContentPolicy {
  assertAllowed(values: readonly string[]): void;
}

export interface PrepareReleaseCommunicationCommand {
  readonly audience: string;
  readonly subject: string;
  readonly message: string;
  readonly approvedBy: string;
  readonly approvalConfirmed: boolean;
  readonly contentAcknowledged: boolean;
}

export type PreparedReleaseCommunication = ReturnType<
  typeof prepareReleaseCommunicationValues
>;

export class PrepareReleaseCommunication {
  constructor(private readonly contentPolicy: ReleaseCommunicationContentPolicy) {}

  execute(command: PrepareReleaseCommunicationCommand): PreparedReleaseCommunication {
    if (command.approvalConfirmed !== true) {
      throw new ReleaseApprovalRequiredError();
    }
    if (command.contentAcknowledged !== true) {
      throw new ContentAcknowledgementRequiredError();
    }
    const prepared = prepareReleaseCommunicationValues(command);
    this.contentPolicy.assertAllowed([
      prepared.audience,
      prepared.subject,
      prepared.message,
      prepared.approvedBy
    ]);
    return prepared;
  }
}
