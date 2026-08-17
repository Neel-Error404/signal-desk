import { describe, expect, it } from "vitest";
import { DeterministicContentPolicy } from "@/modules/feedback-intake/application";
import { PrepareImplementationBrief } from "@/modules/implementation-briefs/application";
import {
  ContentAcknowledgementRequiredError,
  InvalidRequestError,
  RestrictedContentError
} from "@/shared/errors";
import { ApproveImplementationBrief } from "@/workflows/issue-to-brief/approve-implementation-brief";
import type { IssueBriefUnitOfWork } from "@/workflows/issue-to-brief/ports";

const validCommand = {
  objective: "Preserve the selected date range during export.",
  acceptanceCriteria: [
    "The exported report uses the visible date range.",
    "Reloading does not change the exported artifact."
  ],
  constraints: ["Do not change report retention."],
  approvedBy: "Neel",
  contentAcknowledged: true
} as const;

describe("SD-003 implementation brief preparation", () => {
  it("normalizes a bounded owner-approved brief", () => {
    const prepared = new PrepareImplementationBrief(
      new DeterministicContentPolicy()
    ).execute({
      ...validCommand,
      objective: "Line one\r\nLine two",
      acceptanceCriteria: ["Criterion one\r\ncontinued"]
    });
    expect(prepared).toEqual({
      objective: "Line one\nLine two",
      acceptanceCriteria: ["Criterion one\ncontinued"],
      constraints: validCommand.constraints,
      approvedBy: "Neel"
    });
  });

  it("requires acknowledgement and bounded list cardinality", () => {
    const prepare = new PrepareImplementationBrief(new DeterministicContentPolicy());
    expect(() =>
      prepare.execute({ ...validCommand, contentAcknowledged: false })
    ).toThrow(ContentAcknowledgementRequiredError);
    expect(() =>
      prepare.execute({ ...validCommand, acceptanceCriteria: [] })
    ).toThrow(InvalidRequestError);
    expect(() =>
      prepare.execute({
        ...validCommand,
        constraints: Array.from({ length: 11 }, (_, index) => `Constraint ${index}`)
      })
    ).toThrow(InvalidRequestError);
  });

  it("enforces every text bound", () => {
    const prepare = new PrepareImplementationBrief(new DeterministicContentPolicy());
    expect(() => prepare.execute({ ...validCommand, objective: " " })).toThrow(
      InvalidRequestError
    );
    expect(() =>
      prepare.execute({ ...validCommand, acceptanceCriteria: ["x".repeat(501)] })
    ).toThrow(InvalidRequestError);
    expect(() => prepare.execute({ ...validCommand, approvedBy: "x".repeat(121) })).toThrow(
      InvalidRequestError
    );
  });

  it("rejects restricted content before the unit of work", () => {
    let called = false;
    const unitOfWork: IssueBriefUnitOfWork = {
      async approve() {
        called = true;
        throw new Error("must not run");
      }
    };
    const useCase = new ApproveImplementationBrief(
      new PrepareImplementationBrief(new DeterministicContentPolicy()),
      unitOfWork
    );
    expect(() =>
      useCase.execute("11111111-1111-4111-8111-111111111111", {
        ...validCommand,
        objective: `ghp_${"a".repeat(36)}`
      })
    ).toThrow(RestrictedContentError);
    expect(called).toBe(false);
  });

  it("binds generated identity and server approval time", async () => {
    const captured: unknown[] = [];
    const unitOfWork: IssueBriefUnitOfWork = {
      async approve(productIssueId, prepared, briefId, approvedAt) {
        captured.push(productIssueId, prepared, briefId, approvedAt);
        return {
          implementationBrief: {
            id: briefId,
            productIssueId,
            ...prepared,
            approvedAt
          },
          lineage: {
            feedbackId: "22222222-2222-4222-8222-222222222222",
            signalId: "33333333-3333-4333-8333-333333333333",
            signalRevision: 2,
            productIssueId
          }
        };
      }
    };
    const approvedAt = new Date("2026-08-18T00:00:00.000Z");
    const useCase = new ApproveImplementationBrief(
      new PrepareImplementationBrief(new DeterministicContentPolicy()),
      unitOfWork,
      () => "44444444-4444-4444-8444-444444444444",
      () => approvedAt
    );
    const result = await useCase.execute(
      "11111111-1111-4111-8111-111111111111",
      validCommand
    );
    expect(result.implementationBrief).toMatchObject({
      id: "44444444-4444-4444-8444-444444444444",
      approvedBy: "Neel"
    });
    expect(captured[3]).toBe(approvedAt);
  });
});
