import { describe, expect, it } from "vitest";
import { DeterministicContentPolicy } from "@/modules/feedback-intake/application";
import { PrepareTriage } from "@/modules/signal-inbox/application";
import {
  ContentAcknowledgementRequiredError,
  InvalidRequestError,
  RestrictedContentError
} from "@/shared/errors";

const useCase = new PrepareTriage(new DeterministicContentPolicy());

describe("manual triage preparation", () => {
  const valid = {
    expectedRevision: 0,
    toState: "reviewing",
    rationale: "Confirm the product impact.",
    operatorLabel: "Neel",
    contentAcknowledged: true
  } as const;

  it("accepts a bounded manual event", () => {
    expect(useCase.execute(valid)).toEqual({
      expectedRevision: 0,
      toState: "reviewing",
      rationale: "Confirm the product impact.",
      operatorLabel: "Neel"
    });
  });

  it("rejects stale-shape revisions before persistence", () => {
    expect(() => useCase.execute({ ...valid, expectedRevision: -1 })).toThrow(
      InvalidRequestError
    );
  });

  it("requires acknowledgement for rationale and operator label", () => {
    expect(() => useCase.execute({ ...valid, contentAcknowledged: false })).toThrow(
      ContentAcknowledgementRequiredError
    );
  });

  it("applies the same restricted-content policy to triage text", () => {
    expect(() =>
      useCase.execute({ ...valid, rationale: "-----BEGIN PRIVATE KEY-----" })
    ).toThrow(RestrictedContentError);
  });
});
