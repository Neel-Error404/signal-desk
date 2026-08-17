import { ContentAcknowledgementRequiredError } from "@/shared/errors";
import {
  prepareReviewDeliveryValues,
  type ReviewDeliveryPolicy
} from "../domain/review-delivery";

export interface ReviewDeliveryContentPolicy {
  assertAllowed(values: readonly string[]): void;
}

export interface PrepareReviewDeliveryCommand {
  readonly baseBranch: string;
  readonly headBranch: string;
  readonly commitSha: string;
  readonly pullRequestUrl: string;
  readonly verificationSummary: string;
  readonly deliveredBy: string;
  readonly contentAcknowledged: boolean;
}

export type PreparedReviewDelivery = ReturnType<typeof prepareReviewDeliveryValues>;

export class PrepareReviewDelivery {
  constructor(
    private readonly contentPolicy: ReviewDeliveryContentPolicy,
    private readonly policy: ReviewDeliveryPolicy
  ) {}

  execute(command: PrepareReviewDeliveryCommand): PreparedReviewDelivery {
    if (command.contentAcknowledged !== true) {
      throw new ContentAcknowledgementRequiredError();
    }
    const prepared = prepareReviewDeliveryValues(command, this.policy);
    this.contentPolicy.assertAllowed([
      prepared.baseBranch,
      prepared.headBranch,
      prepared.verificationSummary,
      prepared.deliveredBy
    ]);
    return prepared;
  }
}
