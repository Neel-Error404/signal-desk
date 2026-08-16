import { describe, expect, it } from "vitest";
import {
  DeterministicContentPolicy,
  PrepareFeedback,
  type FeedbackWriter
} from "@/modules/feedback-intake/application";
import type { SignalWriter } from "@/modules/signal-inbox/application";
import { CreateFeedbackSignal } from "@/workflows/feedback-to-signal/create-feedback-signal";
import type {
  FeedbackSignalTransaction,
  FeedbackSignalUnitOfWork
} from "@/workflows/feedback-to-signal/ports";

class RecordingUnitOfWork implements FeedbackSignalUnitOfWork {
  readonly writes: string[] = [];

  private readonly feedback: FeedbackWriter = {
    create: async (record) => {
      this.writes.push(`feedback:${record.id}`);
      return record;
    }
  };

  private readonly signals: SignalWriter = {
    create: async (record) => {
      this.writes.push(`signal:${record.id}:${record.feedbackId}`);
      return record;
    }
  };

  run<T>(work: (transaction: FeedbackSignalTransaction) => Promise<T>): Promise<T> {
    return work({ feedback: this.feedback, signals: this.signals });
  }
}

describe("one-feedback-to-one-signal workflow component", () => {
  it("coordinates exactly one source and one linked signal through one unit-of-work callback", async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const identifiers = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    ];
    const workflow = new CreateFeedbackSignal(
      new PrepareFeedback(new DeterministicContentPolicy()),
      unitOfWork,
      () => identifiers.shift() ?? "unexpected",
      () => new Date("2026-08-16T00:00:00.000Z")
    );

    const result = await workflow.execute({
      content: "Export ignores the selected range.",
      contentAcknowledged: true
    });

    expect(result.signal.feedbackId).toBe(result.feedback.id);
    expect(result.signal.statement).toBe(result.feedback.content);
    expect(result.signal.state).toBe("new");
    expect(result.signal.revision).toBe(0);
    expect(unitOfWork.writes).toEqual([
      "feedback:11111111-1111-4111-8111-111111111111",
      "signal:22222222-2222-4222-8222-222222222222:11111111-1111-4111-8111-111111111111"
    ]);
  });
});
