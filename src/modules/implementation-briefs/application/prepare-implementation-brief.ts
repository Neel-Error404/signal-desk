import { ContentAcknowledgementRequiredError } from "@/shared/errors";
import {
  normalizeBriefText,
  normalizeBriefTextList
} from "../domain/implementation-brief";

export interface ImplementationBriefContentPolicy {
  assertAllowed(values: readonly string[]): void;
}

export interface PrepareImplementationBriefCommand {
  readonly objective: string;
  readonly acceptanceCriteria: readonly string[];
  readonly constraints: readonly string[];
  readonly approvedBy: string;
  readonly contentAcknowledged: boolean;
}

export interface PreparedImplementationBrief {
  readonly objective: string;
  readonly acceptanceCriteria: readonly string[];
  readonly constraints: readonly string[];
  readonly approvedBy: string;
}

export class PrepareImplementationBrief {
  constructor(private readonly contentPolicy: ImplementationBriefContentPolicy) {}

  execute(command: PrepareImplementationBriefCommand): PreparedImplementationBrief {
    if (command.contentAcknowledged !== true) {
      throw new ContentAcknowledgementRequiredError();
    }
    const objective = normalizeBriefText(command.objective, "objective", 2_000);
    const acceptanceCriteria = normalizeBriefTextList(
      command.acceptanceCriteria,
      "acceptanceCriteria",
      1
    );
    const constraints = normalizeBriefTextList(command.constraints, "constraints", 0);
    const approvedBy = normalizeBriefText(command.approvedBy, "approvedBy", 120);
    this.contentPolicy.assertAllowed([
      objective,
      ...acceptanceCriteria,
      ...constraints,
      approvedBy
    ]);
    return { objective, acceptanceCriteria, constraints, approvedBy };
  }
}
