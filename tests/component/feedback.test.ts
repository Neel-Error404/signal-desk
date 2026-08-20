import { describe, expect, it } from "vitest";
import {
  DeterministicContentPolicy,
  PrepareFeedback
} from "@/modules/feedback-intake/application";
import {
  ContentAcknowledgementRequiredError,
  InvalidRequestError
} from "@/shared/errors";

const useCase = new PrepareFeedback(new DeterministicContentPolicy());

describe("Feedback Intake component", () => {
  it("requires the literal acknowledgement", () => {
    expect(() =>
      useCase.execute({ content: "A real observation", contentAcknowledged: false })
    ).toThrow(ContentAcknowledgementRequiredError);
  });

  it("normalizes line endings without rewriting source wording", () => {
    expect(
      useCase.execute({ content: "first\r\nsecond\rthird", contentAcknowledged: true })
    ).toEqual({ content: "first\nsecond\nthird" });
  });

  it("rejects whitespace-only feedback", () => {
    expect(() => useCase.execute({ content: "  \n ", contentAcknowledged: true })).toThrow(
      InvalidRequestError
    );
  });

  it("counts Unicode code points for the 8,000 limit", () => {
    const emoji = "\u{1F642}";
    expect(
      useCase.execute({ content: emoji.repeat(8_000), contentAcknowledged: true })
    ).toEqual({ content: emoji.repeat(8_000) });
    expect(() =>
      useCase.execute({ content: emoji.repeat(8_001), contentAcknowledged: true })
    ).toThrow(InvalidRequestError);
  });
});
