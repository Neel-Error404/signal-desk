import { describe, expect, it } from "vitest";
import { DeterministicContentPolicy } from "@/modules/feedback-intake/application";
import { PrepareReleaseCommunication } from "@/modules/release-communications/application";
import {
  ContentAcknowledgementRequiredError,
  InvalidRequestError,
  ReleaseApprovalRequiredError,
  RestrictedContentError
} from "@/shared/errors";
import { ApproveReleaseCommunication } from "@/workflows/completion-to-communication/approve-release-communication";
import type { CompletionCommunicationUnitOfWork } from "@/workflows/completion-to-communication/ports";

const validCommand = {
  audience: "Customers who reported the affected workflow",
  subject: "The reported workflow issue is fixed",
  message: "We completed the reviewed fix. No action is required from you.",
  approvedBy: "Neel",
  approvalConfirmed: true,
  contentAcknowledged: true
} as const;

describe("SD-006 release communication preparation", () => {
  it("requires explicit owner approval and content acknowledgement", () => {
    const prepare = new PrepareReleaseCommunication(new DeterministicContentPolicy());
    expect(() => prepare.execute({ ...validCommand, approvalConfirmed: false })).toThrow(
      ReleaseApprovalRequiredError
    );
    expect(() =>
      prepare.execute({ ...validCommand, contentAcknowledged: false })
    ).toThrow(ContentAcknowledgementRequiredError);
  });

  it("validates all text bounds and restricted content", () => {
    const prepare = new PrepareReleaseCommunication(new DeterministicContentPolicy());
    expect(() => prepare.execute({ ...validCommand, audience: "x".repeat(501) })).toThrow(
      InvalidRequestError
    );
    expect(() => prepare.execute({ ...validCommand, subject: "x".repeat(201) })).toThrow(
      InvalidRequestError
    );
    expect(() => prepare.execute({ ...validCommand, message: "x".repeat(4_001) })).toThrow(
      InvalidRequestError
    );
    expect(() =>
      prepare.execute({ ...validCommand, message: `ghp_${"a".repeat(36)}` })
    ).toThrow(RestrictedContentError);
  });

  it("binds generated identity and server approval time", async () => {
    const captured: unknown[] = [];
    const unitOfWork: CompletionCommunicationUnitOfWork = {
      async approve(completedFixId, prepared, releaseCommunicationId, approvedAt) {
        captured.push(completedFixId, prepared, releaseCommunicationId, approvedAt);
        return {
          releaseCommunication: {
            id: releaseCommunicationId,
            completedFixId,
            ...prepared,
            approvedAt
          },
          lineage: {
            feedbackId: "11111111-1111-4111-8111-111111111111",
            signalId: "22222222-2222-4222-8222-222222222222",
            signalRevision: 2,
            productIssueId: "33333333-3333-4333-8333-333333333333",
            implementationBriefId: "44444444-4444-4444-8444-444444444444",
            reviewDeliveryId: "55555555-5555-4555-8555-555555555555",
            completedFixId
          }
        };
      }
    };
    const approvedAt = new Date("2026-08-19T09:00:00.000Z");
    const useCase = new ApproveReleaseCommunication(
      new PrepareReleaseCommunication(new DeterministicContentPolicy()),
      unitOfWork,
      () => "77777777-7777-4777-8777-777777777777",
      () => approvedAt
    );
    const result = await useCase.execute(
      "66666666-6666-4666-8666-666666666666",
      validCommand
    );
    expect(result.releaseCommunication).toMatchObject({
      id: "77777777-7777-4777-8777-777777777777",
      approvedAt,
      subject: validCommand.subject
    });
    expect(captured).toHaveLength(4);
  });
});
