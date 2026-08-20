import { InvalidRequestError } from "@/shared/errors";
import { codePointLength, normalizeLineEndings } from "@/shared/validation";

export interface ReviewDeliveryRecord {
  readonly id: string;
  readonly implementationBriefId: string;
  readonly repositoryUrl: string;
  readonly baseBranch: string;
  readonly headBranch: string;
  readonly commitSha: string;
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
  readonly verificationSummary: string;
  readonly deliveredBy: string;
  readonly deliveredAt: Date;
}

export interface ReviewDeliveryPolicy {
  readonly repositoryUrl: string;
  readonly trustedPullRequestUrlPrefix: string;
  readonly baseBranchPattern: string;
  readonly headBranchPattern: string;
  readonly requireDistinctBranches: boolean;
}

function boundedText(
  value: string,
  field: "verificationSummary" | "deliveredBy",
  maximumCodePoints: number
): string {
  const normalized = normalizeLineEndings(value);
  const length = codePointLength(normalized);
  if (normalized.trim().length === 0 || length < 1 || length > maximumCodePoints) {
    throw new InvalidRequestError(
      `${field} must contain between 1 and ${maximumCodePoints} Unicode code points.`,
      [field]
    );
  }
  return normalized;
}

function policyValue(
  value: string,
  field: "baseBranch" | "headBranch",
  pattern: string
): string {
  if (value.length < 1 || value.length > 255 || value.trim() !== value) {
    throw new InvalidRequestError(`${field} is not a bounded branch name.`, [field]);
  }
  let expression: RegExp;
  try {
    expression = new RegExp(pattern);
  } catch {
    throw new InvalidRequestError("The product delivery policy is invalid.");
  }
  if (!expression.test(value)) {
    throw new InvalidRequestError(`${field} is not allowed by product delivery policy.`, [field]);
  }
  return value;
}

export function prepareReviewDeliveryValues(
  input: {
    readonly baseBranch: string;
    readonly headBranch: string;
    readonly commitSha: string;
    readonly pullRequestUrl: string;
    readonly verificationSummary: string;
    readonly deliveredBy: string;
  },
  policy: ReviewDeliveryPolicy
): Omit<ReviewDeliveryRecord, "id" | "implementationBriefId" | "deliveredAt"> {
  const baseBranch = policyValue(input.baseBranch, "baseBranch", policy.baseBranchPattern);
  const headBranch = policyValue(input.headBranch, "headBranch", policy.headBranchPattern);
  if (policy.requireDistinctBranches && baseBranch === headBranch) {
    throw new InvalidRequestError("baseBranch and headBranch must be different.", [
      "baseBranch",
      "headBranch"
    ]);
  }
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(input.commitSha)) {
    throw new InvalidRequestError(
      "commitSha must be a lowercase 40- or 64-character hexadecimal identifier.",
      ["commitSha"]
    );
  }
  if (!input.pullRequestUrl.startsWith(policy.trustedPullRequestUrlPrefix)) {
    throw new InvalidRequestError("pullRequestUrl is outside the trusted repository.", [
      "pullRequestUrl"
    ]);
  }
  const pullRequestText = input.pullRequestUrl.slice(
    policy.trustedPullRequestUrlPrefix.length
  );
  if (!/^[1-9][0-9]*$/.test(pullRequestText)) {
    throw new InvalidRequestError("pullRequestUrl must end with one positive PR number.", [
      "pullRequestUrl"
    ]);
  }
  const pullRequestNumber = Number(pullRequestText);
  if (!Number.isSafeInteger(pullRequestNumber)) {
    throw new InvalidRequestError("The pull-request number is outside the supported range.", [
      "pullRequestUrl"
    ]);
  }
  return {
    repositoryUrl: policy.repositoryUrl,
    baseBranch,
    headBranch,
    commitSha: input.commitSha,
    pullRequestNumber,
    pullRequestUrl: input.pullRequestUrl,
    verificationSummary: boundedText(input.verificationSummary, "verificationSummary", 2_000),
    deliveredBy: boundedText(input.deliveredBy, "deliveredBy", 120)
  };
}
