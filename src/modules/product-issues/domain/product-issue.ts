import { InvalidRequestError } from "@/shared/errors";
import { codePointLength, normalizeLineEndings } from "@/shared/validation";

export const PRODUCT_ISSUE_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical"
] as const;

export type ProductIssuePriority = (typeof PRODUCT_ISSUE_PRIORITIES)[number];

export interface ProductIssueRecord {
  readonly id: string;
  readonly signalId: string;
  readonly sourceSignalRevision: number;
  readonly title: string;
  readonly priority: ProductIssuePriority;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly createdAt: Date;
}

export function requireProductIssuePriority(value: string): ProductIssuePriority {
  if (!(PRODUCT_ISSUE_PRIORITIES as readonly string[]).includes(value)) {
    throw new InvalidRequestError("priority is not supported.", ["priority"]);
  }
  return value as ProductIssuePriority;
}

export function normalizeProductIssueText(
  value: string,
  field: "title" | "rationale" | "operatorLabel",
  maximumCodePoints: number
): string {
  const normalized = normalizeLineEndings(value);
  const length = codePointLength(normalized);
  if (normalized.trim().length === 0 || length < 1 || length > maximumCodePoints) {
    throw new InvalidRequestError(
      `${field} must contain between 1 and ${maximumCodePoints} Unicode code points.`,
      [field]
    );
  }
  return normalized;
}
