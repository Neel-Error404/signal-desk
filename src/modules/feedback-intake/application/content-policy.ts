import {
  ContentControlUnavailableError,
  RestrictedContentError
} from "@/shared/errors";

export interface ContentPolicy {
  assertAllowed(values: readonly string[]): void;
}

interface PatternRule {
  readonly id: string;
  readonly pattern: RegExp;
}

const PATTERN_RULES: readonly PatternRule[] = [
  {
    id: "secret.pem-private-key.v1",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/
  },
  {
    id: "secret.github-token.v1",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/
  },
  {
    id: "secret.aws-access-key.v1",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/
  },
  {
    id: "secret.openai-api-key.v1",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/
  },
  {
    id: "secret.stripe-live-key.v1",
    pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/
  }
];

const PAYMENT_CARD_CANDIDATE = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;

function luhnValid(digits: string): boolean {
  let total = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const character = digits[index];
    if (character === undefined) {
      return false;
    }
    let digit = Number(character);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    total += digit;
    doubleDigit = !doubleDigit;
  }
  return total % 10 === 0;
}

function hasKnownIssuerShape(digits: string): boolean {
  const length = digits.length;
  if (digits.startsWith("4") && [13, 16, 19].includes(length)) {
    return true;
  }
  if (length === 15 && (digits.startsWith("34") || digits.startsWith("37"))) {
    return true;
  }
  if (length === 16) {
    const firstTwo = Number(digits.slice(0, 2));
    const firstFour = Number(digits.slice(0, 4));
    if ((firstTwo >= 51 && firstTwo <= 55) || (firstFour >= 2221 && firstFour <= 2720)) {
      return true;
    }
  }
  if ([16, 19].includes(length)) {
    const firstThree = Number(digits.slice(0, 3));
    if (
      digits.startsWith("6011") ||
      digits.startsWith("65") ||
      (firstThree >= 644 && firstThree <= 649)
    ) {
      return true;
    }
  }
  return false;
}

function containsPaymentCard(value: string): boolean {
  for (const match of value.matchAll(PAYMENT_CARD_CANDIDATE)) {
    const digits = match[0].replace(/[ -]/g, "");
    if (hasKnownIssuerShape(digits) && luhnValid(digits)) {
      return true;
    }
  }
  return false;
}

export class DeterministicContentPolicy implements ContentPolicy {
  assertAllowed(values: readonly string[]): void {
    try {
      const ruleIds = new Set<string>();
      for (const value of values) {
        for (const rule of PATTERN_RULES) {
          if (rule.pattern.test(value)) {
            ruleIds.add(rule.id);
          }
        }
        if (containsPaymentCard(value)) {
          ruleIds.add("regulated.payment-card.v1");
        }
      }

      if (ruleIds.size > 0) {
        throw new RestrictedContentError([...ruleIds].sort());
      }
    } catch (error) {
      if (error instanceof RestrictedContentError) {
        throw error;
      }
      throw new ContentControlUnavailableError();
    }
  }
}
