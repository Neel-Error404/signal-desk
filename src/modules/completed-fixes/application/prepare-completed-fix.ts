import {
  ContentAcknowledgementRequiredError,
  ExternalMergeConfirmationRequiredError
} from "@/shared/errors";
import { prepareCompletedFixValues } from "../domain/completed-fix";

export interface CompletedFixContentPolicy {
  assertAllowed(values: readonly string[]): void;
}

export interface PrepareCompletedFixCommand {
  readonly mergedCommitSha: string;
  readonly completionSummary: string;
  readonly completedBy: string;
  readonly mergeConfirmedOutsideSignalDesk: boolean;
  readonly contentAcknowledged: boolean;
}

export type PreparedCompletedFix = ReturnType<typeof prepareCompletedFixValues>;

export class PrepareCompletedFix {
  constructor(private readonly contentPolicy: CompletedFixContentPolicy) {}

  execute(command: PrepareCompletedFixCommand): PreparedCompletedFix {
    if (command.mergeConfirmedOutsideSignalDesk !== true) {
      throw new ExternalMergeConfirmationRequiredError();
    }
    if (command.contentAcknowledged !== true) {
      throw new ContentAcknowledgementRequiredError();
    }
    const prepared = prepareCompletedFixValues(command);
    this.contentPolicy.assertAllowed([
      prepared.completionSummary,
      prepared.completedBy
    ]);
    return prepared;
  }
}
