import { InvalidRequestError } from "@/shared/errors";
import { codePointLength, normalizeLineEndings } from "@/shared/validation";

export interface ImplementationBriefRecord {
  readonly id: string;
  readonly productIssueId: string;
  readonly objective: string;
  readonly acceptanceCriteria: readonly string[];
  readonly constraints: readonly string[];
  readonly approvedBy: string;
  readonly approvedAt: Date;
}

export function normalizeBriefText(
  value: string,
  field: "objective" | "acceptanceCriteria" | "constraints" | "approvedBy",
  maximumCodePoints: number
): string {
  const normalized = normalizeLineEndings(value);
  const length = codePointLength(normalized);
  if (normalized.trim().length === 0 || length < 1 || length > maximumCodePoints) {
    throw new InvalidRequestError(
      `${field} entries must contain between 1 and ${maximumCodePoints} Unicode code points.`,
      [field]
    );
  }
  return normalized;
}

export function normalizeBriefTextList(
  values: readonly string[],
  field: "acceptanceCriteria" | "constraints",
  minimumCount: number
): readonly string[] {
  if (values.length < minimumCount || values.length > 10) {
    throw new InvalidRequestError(
      `${field} must contain between ${minimumCount} and 10 entries.`,
      [field]
    );
  }
  return values.map((value) => normalizeBriefText(value, field, 500));
}
