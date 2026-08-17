import { describe, expect, it } from "vitest";
import { DeterministicContentPolicy } from "@/modules/feedback-intake/application";
import {
  PrepareReviewDelivery,
  type ReviewDeliveryPolicy
} from "@/modules/review-deliveries/application";
import {
  ContentAcknowledgementRequiredError,
  InvalidRequestError,
  RestrictedContentError
} from "@/shared/errors";
import { RecordReviewDelivery } from "@/workflows/brief-to-delivery/record-review-delivery";
import type { BriefDeliveryUnitOfWork } from "@/workflows/brief-to-delivery/ports";

const policy: ReviewDeliveryPolicy = {
  repositoryUrl: "https://github.com/Neel-Error404/signal-desk",
  trustedPullRequestUrlPrefix: "https://github.com/Neel-Error404/signal-desk/pull/",
  baseBranchPattern: "^(main|work/sd-[0-9]{3}-[a-z0-9-]+)$",
  headBranchPattern: "^work/sd-[0-9]{3}-[a-z0-9-]+$",
  requireDistinctBranches: true
};

const validCommand = {
  baseBranch: "work/sd-003-approved-implementation-brief",
  headBranch: "work/sd-004-review-delivery",
  commitSha: "0123456789abcdef0123456789abcdef01234567",
  pullRequestUrl: "https://github.com/Neel-Error404/signal-desk/pull/3",
  verificationSummary: "Foundation through Stress passed.",
  deliveredBy: "Neel",
  contentAcknowledged: true
} as const;

describe("SD-004 review delivery preparation", () => {
  it("derives repository and PR number from product policy", () => {
    const prepared = new PrepareReviewDelivery(
      new DeterministicContentPolicy(),
      policy
    ).execute(validCommand);
    expect(prepared).toEqual({
      repositoryUrl: policy.repositoryUrl,
      baseBranch: validCommand.baseBranch,
      headBranch: validCommand.headBranch,
      commitSha: validCommand.commitSha,
      pullRequestNumber: 3,
      pullRequestUrl: validCommand.pullRequestUrl,
      verificationSummary: validCommand.verificationSummary,
      deliveredBy: validCommand.deliveredBy
    });
  });

  it("requires acknowledgement and exact branch policy", () => {
    const prepare = new PrepareReviewDelivery(new DeterministicContentPolicy(), policy);
    expect(() =>
      prepare.execute({ ...validCommand, contentAcknowledged: false })
    ).toThrow(ContentAcknowledgementRequiredError);
    expect(() => prepare.execute({ ...validCommand, baseBranch: "release" })).toThrow(
      InvalidRequestError
    );
    expect(() =>
      prepare.execute({ ...validCommand, baseBranch: validCommand.headBranch })
    ).toThrow(InvalidRequestError);
  });

  it("rejects malformed commits and untrusted or decorated PR URLs", () => {
    const prepare = new PrepareReviewDelivery(new DeterministicContentPolicy(), policy);
    expect(() => prepare.execute({ ...validCommand, commitSha: "ABC123" })).toThrow(
      InvalidRequestError
    );
    expect(() =>
      prepare.execute({
        ...validCommand,
        pullRequestUrl: "https://github.com/another/repository/pull/3"
      })
    ).toThrow(InvalidRequestError);
    expect(() =>
      prepare.execute({ ...validCommand, pullRequestUrl: `${validCommand.pullRequestUrl}?x=1` })
    ).toThrow(InvalidRequestError);
  });

  it("applies text bounds and restricted-content checks before persistence", () => {
    const prepare = new PrepareReviewDelivery(new DeterministicContentPolicy(), policy);
    expect(() =>
      prepare.execute({ ...validCommand, verificationSummary: "x".repeat(2_001) })
    ).toThrow(InvalidRequestError);
    expect(() =>
      prepare.execute({ ...validCommand, deliveredBy: `ghp_${"a".repeat(36)}` })
    ).toThrow(RestrictedContentError);
  });

  it("binds generated identity and server delivery time", async () => {
    const captured: unknown[] = [];
    const unitOfWork: BriefDeliveryUnitOfWork = {
      async record(implementationBriefId, prepared, deliveryId, deliveredAt) {
        captured.push(implementationBriefId, prepared, deliveryId, deliveredAt);
        return {
          reviewDelivery: {
            id: deliveryId,
            implementationBriefId,
            ...prepared,
            deliveredAt
          },
          lineage: {
            feedbackId: "11111111-1111-4111-8111-111111111111",
            signalId: "22222222-2222-4222-8222-222222222222",
            signalRevision: 2,
            productIssueId: "33333333-3333-4333-8333-333333333333",
            implementationBriefId
          }
        };
      }
    };
    const deliveredAt = new Date("2026-08-18T12:00:00.000Z");
    const useCase = new RecordReviewDelivery(
      new PrepareReviewDelivery(new DeterministicContentPolicy(), policy),
      unitOfWork,
      () => "55555555-5555-4555-8555-555555555555",
      () => deliveredAt
    );
    const result = await useCase.execute(
      "44444444-4444-4444-8444-444444444444",
      validCommand
    );
    expect(result.reviewDelivery.id).toBe("55555555-5555-4555-8555-555555555555");
    expect(result.reviewDelivery.deliveredAt).toBe(deliveredAt);
    expect(captured).toHaveLength(4);
  });
});
