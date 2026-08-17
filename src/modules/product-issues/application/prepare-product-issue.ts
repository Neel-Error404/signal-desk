import {
  ContentAcknowledgementRequiredError,
  InvalidRequestError
} from "@/shared/errors";
import {
  normalizeProductIssueText,
  requireProductIssuePriority,
  type ProductIssuePriority
} from "../domain/product-issue";

export interface ProductIssueContentPolicy {
  assertAllowed(values: readonly string[]): void;
}

export interface PrepareProductIssueCommand {
  readonly expectedSignalRevision: number;
  readonly title: string;
  readonly priority: string;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly contentAcknowledged: boolean;
}

export interface PreparedProductIssue {
  readonly expectedSignalRevision: number;
  readonly title: string;
  readonly priority: ProductIssuePriority;
  readonly rationale: string;
  readonly operatorLabel: string;
}

export class PrepareProductIssue {
  constructor(private readonly contentPolicy: ProductIssueContentPolicy) {}

  execute(command: PrepareProductIssueCommand): PreparedProductIssue {
    if (command.contentAcknowledged !== true) {
      throw new ContentAcknowledgementRequiredError();
    }
    if (
      !Number.isInteger(command.expectedSignalRevision) ||
      command.expectedSignalRevision < 0
    ) {
      throw new InvalidRequestError(
        "expectedSignalRevision must be a non-negative integer.",
        ["expectedSignalRevision"]
      );
    }
    const title = normalizeProductIssueText(command.title, "title", 200);
    const priority = requireProductIssuePriority(command.priority);
    const rationale = normalizeProductIssueText(command.rationale, "rationale", 2_000);
    const operatorLabel = normalizeProductIssueText(
      command.operatorLabel,
      "operatorLabel",
      120
    );
    this.contentPolicy.assertAllowed([title, rationale, operatorLabel]);
    return {
      expectedSignalRevision: command.expectedSignalRevision,
      title,
      priority,
      rationale,
      operatorLabel
    };
  }
}
