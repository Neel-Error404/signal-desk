import { describe, expect, it } from "vitest";
import { DeterministicContentPolicy } from "@/modules/feedback-intake/application";
import { PrepareCompletedFix } from "@/modules/completed-fixes/application";
import {
  ContentAcknowledgementRequiredError,
  ExternalMergeConfirmationRequiredError,
  InvalidRequestError,
  RestrictedContentError
} from "@/shared/errors";
import { RecordCompletedFix } from "@/workflows/delivery-to-completion/record-completed-fix";
import type { DeliveryCompletionUnitOfWork } from "@/workflows/delivery-to-completion/ports";

const validCommand = {
  mergedCommitSha: "89abcdef0123456789abcdef0123456789abcdef",
  completionSummary: "The human owner merged the reviewed fix after all checks passed.",
  completedBy: "Neel",
  mergeConfirmedOutsideSignalDesk: true,
  contentAcknowledged: true
} as const;

describe("SD-005 completed fix preparation", () => {
  it("requires explicit external merge confirmation and content acknowledgement", () => {
    const prepare = new PrepareCompletedFix(new DeterministicContentPolicy());
    expect(() =>
      prepare.execute({ ...validCommand, mergeConfirmedOutsideSignalDesk: false })
    ).toThrow(ExternalMergeConfirmationRequiredError);
    expect(() =>
      prepare.execute({ ...validCommand, contentAcknowledged: false })
    ).toThrow(ContentAcknowledgementRequiredError);
  });

  it("validates commit format, text bounds, and restricted content", () => {
    const prepare = new PrepareCompletedFix(new DeterministicContentPolicy());
    expect(() => prepare.execute({ ...validCommand, mergedCommitSha: "ABC123" })).toThrow(
      InvalidRequestError
    );
    expect(() =>
      prepare.execute({ ...validCommand, completionSummary: "x".repeat(2_001) })
    ).toThrow(InvalidRequestError);
    expect(() =>
      prepare.execute({ ...validCommand, completedBy: `ghp_${"a".repeat(36)}` })
    ).toThrow(RestrictedContentError);
  });

  it("binds generated identity and server completion time", async () => {
    const captured: unknown[] = [];
    const unitOfWork: DeliveryCompletionUnitOfWork = {
      async record(reviewDeliveryId, prepared, completedFixId, completedAt) {
        captured.push(reviewDeliveryId, prepared, completedFixId, completedAt);
        return {
          completedFix: {
            id: completedFixId,
            reviewDeliveryId,
            ...prepared,
            completedAt
          },
          lineage: {
            feedbackId: "11111111-1111-4111-8111-111111111111",
            signalId: "22222222-2222-4222-8222-222222222222",
            signalRevision: 2,
            productIssueId: "33333333-3333-4333-8333-333333333333",
            implementationBriefId: "44444444-4444-4444-8444-444444444444",
            reviewDeliveryId
          }
        };
      }
    };
    const completedAt = new Date("2026-08-18T17:00:00.000Z");
    const useCase = new RecordCompletedFix(
      new PrepareCompletedFix(new DeterministicContentPolicy()),
      unitOfWork,
      () => "66666666-6666-4666-8666-666666666666",
      () => completedAt
    );
    const result = await useCase.execute(
      "55555555-5555-4555-8555-555555555555",
      validCommand
    );
    expect(result.completedFix).toMatchObject({
      id: "66666666-6666-4666-8666-666666666666",
      completedAt,
      mergedCommitSha: validCommand.mergedCommitSha
    });
    expect(captured).toHaveLength(4);
  });
});
