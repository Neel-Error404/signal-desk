import { InvalidRequestError } from "@/shared/errors";
import { codePointLength, normalizeLineEndings } from "@/shared/validation";

export interface CompletedFixRecord {
  readonly id: string;
  readonly reviewDeliveryId: string;
  readonly mergedCommitSha: string;
  readonly completionSummary: string;
  readonly completedBy: string;
  readonly completedAt: Date;
}

function boundedText(
  value: string,
  field: "completionSummary" | "completedBy",
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

export function prepareCompletedFixValues(input: {
  readonly mergedCommitSha: string;
  readonly completionSummary: string;
  readonly completedBy: string;
}): Omit<CompletedFixRecord, "id" | "reviewDeliveryId" | "completedAt"> {
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(input.mergedCommitSha)) {
    throw new InvalidRequestError(
      "mergedCommitSha must be a lowercase 40- or 64-character hexadecimal identifier.",
      ["mergedCommitSha"]
    );
  }
  return {
    mergedCommitSha: input.mergedCommitSha,
    completionSummary: boundedText(input.completionSummary, "completionSummary", 2_000),
    completedBy: boundedText(input.completedBy, "completedBy", 120)
  };
}
