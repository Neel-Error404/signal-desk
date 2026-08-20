import { describe, expect, it } from "vitest";
import { DeterministicContentPolicy } from "@/modules/feedback-intake/application";
import { RestrictedContentError } from "@/shared/errors";

const policy = new DeterministicContentPolicy();

function restrictedRuleIds(value: string): readonly string[] {
  try {
    policy.assertAllowed([value]);
  } catch (error) {
    if (error instanceof RestrictedContentError) {
      return error.details?.ruleIds as readonly string[];
    }
    throw error;
  }
  throw new Error("Expected restricted content to be rejected.");
}

describe("deterministic high-confidence content controls", () => {
  it("rejects PEM private-key material without returning the value", () => {
    expect(restrictedRuleIds("-----BEGIN PRIVATE KEY-----")).toEqual([
      "secret.pem-private-key.v1"
    ]);
  });

  it("rejects structurally strong token prefixes", () => {
    const value = `ghp_${"a".repeat(36)}`;
    expect(restrictedRuleIds(value)).toEqual(["secret.github-token.v1"]);
  });

  it("rejects known-issuer payment cards that pass Luhn", () => {
    expect(restrictedRuleIds("4111 1111 1111 1111")).toEqual([
      "regulated.payment-card.v1"
    ]);
  });

  it("does not claim uncertain ordinary numbers are restricted", () => {
    expect(() => policy.assertAllowed(["Customer 12345 reported issue 67890."])).not.toThrow();
  });
});
