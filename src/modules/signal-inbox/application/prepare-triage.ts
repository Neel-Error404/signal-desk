import {
  ContentAcknowledgementRequiredError,
  InvalidRequestError
} from "@/shared/errors";
import {
  normalizeBoundedTriageText,
  requireSignalState,
  type SignalState
} from "../domain/signal";

export interface TriageContentPolicy {
  assertAllowed(values: readonly string[]): void;
}

export interface PrepareTriageCommand {
  readonly expectedRevision: number;
  readonly toState: string;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly contentAcknowledged: boolean;
}

export interface PreparedTriage {
  readonly expectedRevision: number;
  readonly toState: SignalState;
  readonly rationale: string;
  readonly operatorLabel: string;
}

export class PrepareTriage {
  constructor(private readonly contentPolicy: TriageContentPolicy) {}

  execute(command: PrepareTriageCommand): PreparedTriage {
    if (command.contentAcknowledged !== true) {
      throw new ContentAcknowledgementRequiredError();
    }
    if (!Number.isInteger(command.expectedRevision) || command.expectedRevision < 0) {
      throw new InvalidRequestError(
        "expectedRevision must be a non-negative integer.",
        ["expectedRevision"]
      );
    }

    const toState = requireSignalState(command.toState);
    const rationale = normalizeBoundedTriageText(command.rationale, "rationale", 2_000);
    const operatorLabel = normalizeBoundedTriageText(
      command.operatorLabel,
      "operatorLabel",
      120
    );
    this.contentPolicy.assertAllowed([rationale, operatorLabel]);
    return { expectedRevision: command.expectedRevision, toState, rationale, operatorLabel };
  }
}
