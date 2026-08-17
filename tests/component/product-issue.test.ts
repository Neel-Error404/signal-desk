import { describe, expect, it } from "vitest";
import {
  ContentAcknowledgementRequiredError,
  InvalidRequestError,
  RestrictedContentError
} from "@/shared/errors";
import { DeterministicContentPolicy } from "@/modules/feedback-intake/application";
import { PrepareProductIssue } from "@/modules/product-issues/application";
import { PromoteSignalToIssue } from "@/workflows/signal-to-issue/promote-signal-to-issue";
import type { SignalIssueUnitOfWork } from "@/workflows/signal-to-issue/ports";

const validCommand = {
  expectedSignalRevision: 2,
  title: "Preserve the selected date range",
  priority: "high",
  rationale: "The confirmed workflow loses an explicit user selection.",
  operatorLabel: "Neel",
  contentAcknowledged: true
} as const;

describe("SD-002 product issue preparation", () => {
  it("normalizes a bounded manual issue decision", () => {
    const prepared = new PrepareProductIssue(
      new DeterministicContentPolicy()
    ).execute({ ...validCommand, title: "Line one\r\nLine two" });

    expect(prepared).toEqual({
      expectedSignalRevision: 2,
      title: "Line one\nLine two",
      priority: "high",
      rationale: validCommand.rationale,
      operatorLabel: "Neel"
    });
  });

  it("requires acknowledgement and an exact priority", () => {
    const prepare = new PrepareProductIssue(new DeterministicContentPolicy());
    expect(() =>
      prepare.execute({ ...validCommand, contentAcknowledged: false })
    ).toThrow(ContentAcknowledgementRequiredError);
    expect(() => prepare.execute({ ...validCommand, priority: "urgent" })).toThrow(
      InvalidRequestError
    );
  });

  it("enforces revision and text bounds", () => {
    const prepare = new PrepareProductIssue(new DeterministicContentPolicy());
    expect(() =>
      prepare.execute({ ...validCommand, expectedSignalRevision: -1 })
    ).toThrow(InvalidRequestError);
    expect(() => prepare.execute({ ...validCommand, title: " ".repeat(10) })).toThrow(
      InvalidRequestError
    );
    expect(() => prepare.execute({ ...validCommand, title: "x".repeat(201) })).toThrow(
      InvalidRequestError
    );
  });

  it("rejects restricted content before the unit of work", async () => {
    let called = false;
    const unitOfWork: SignalIssueUnitOfWork = {
      async promote() {
        called = true;
        throw new Error("must not run");
      }
    };
    const useCase = new PromoteSignalToIssue(
      new PrepareProductIssue(new DeterministicContentPolicy()),
      unitOfWork
    );

    expect(() =>
      useCase.execute("11111111-1111-4111-8111-111111111111", {
        ...validCommand,
        rationale: `ghp_${"a".repeat(36)}`
      })
    ).toThrow(RestrictedContentError);
    expect(called).toBe(false);
  });

  it("binds generated identity and time after deterministic preparation", async () => {
    const captured: unknown[] = [];
    const unitOfWork: SignalIssueUnitOfWork = {
      async promote(signalId, prepared, issueId, createdAt) {
        captured.push(signalId, prepared, issueId, createdAt);
        return {
          productIssue: {
            id: issueId,
            signalId,
            sourceSignalRevision: prepared.expectedSignalRevision,
            title: prepared.title,
            priority: prepared.priority,
            rationale: prepared.rationale,
            operatorLabel: prepared.operatorLabel,
            createdAt
          },
          lineage: {
            feedbackId: "22222222-2222-4222-8222-222222222222",
            signalId,
            signalRevision: prepared.expectedSignalRevision
          }
        };
      }
    };
    const createdAt = new Date("2026-08-17T00:00:00.000Z");
    const useCase = new PromoteSignalToIssue(
      new PrepareProductIssue(new DeterministicContentPolicy()),
      unitOfWork,
      () => "33333333-3333-4333-8333-333333333333",
      () => createdAt
    );

    const result = await useCase.execute(
      "11111111-1111-4111-8111-111111111111",
      validCommand
    );
    expect(result.productIssue).toMatchObject({
      sourceSignalRevision: 2,
      priority: "high"
    });
    expect(captured[2]).toBe("33333333-3333-4333-8333-333333333333");
    expect(captured[3]).toBe(createdAt);
  });
});
