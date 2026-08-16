import { describe, expect, it } from "vitest";
import { DeterministicContentPolicy } from "@/modules/feedback-intake/application";
import {
  AppendTriage,
  PrepareTriage,
  type AppendTriageRecord,
  type SignalStore
} from "@/modules/signal-inbox/application";
import { errorResponse } from "@/platform/http/response";
import { RestrictedContentError } from "@/shared/errors";

describe("append-only triage application boundary", () => {
  it("passes the expected revision and immutable event identity to the store", async () => {
    let received: AppendTriageRecord | undefined;
    const store: SignalStore = {
      list: async () => ({ items: [], nextCursor: null }),
      get: async () => null,
      appendTriage: async (record) => {
        received = record;
        return {
          event: {
            id: record.eventId,
            signalId: record.signalId,
            sequence: record.expectedRevision + 1,
            fromState: "new",
            toState: record.toState,
            rationale: record.rationale,
            operatorLabel: record.operatorLabel,
            createdAt: record.createdAt
          },
          signal: {
            id: record.signalId,
            feedbackId: "11111111-1111-4111-8111-111111111111",
            statement: "Export loses the selected range.",
            state: record.toState,
            revision: record.expectedRevision + 1,
            createdAt: record.createdAt
          }
        };
      }
    };
    const append = new AppendTriage(
      new PrepareTriage(new DeterministicContentPolicy()),
      store,
      () => "22222222-2222-4222-8222-222222222222",
      () => new Date("2026-08-16T00:00:00.000Z")
    );

    await append.execute("33333333-3333-4333-8333-333333333333", {
      expectedRevision: 7,
      toState: "accepted",
      rationale: "Confirmed by the product owner.",
      operatorLabel: "Neel",
      contentAcknowledged: true
    });

    expect(received).toEqual({
      signalId: "33333333-3333-4333-8333-333333333333",
      expectedRevision: 7,
      toState: "accepted",
      rationale: "Confirmed by the product owner.",
      operatorLabel: "Neel",
      eventId: "22222222-2222-4222-8222-222222222222",
      createdAt: new Date("2026-08-16T00:00:00.000Z")
    });
  });

  it("returns only bounded rule identifiers for restricted content", async () => {
    const response = errorResponse(
      new RestrictedContentError(["secret.pem-private-key.v1"]),
      "component-correlation"
    );
    const body = await response.text();

    expect(response.status).toBe(422);
    expect(body).toContain("secret.pem-private-key.v1");
    expect(body).not.toContain("BEGIN PRIVATE KEY");
  });
});
