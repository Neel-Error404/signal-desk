import { InvalidRequestError } from "@/shared/errors";
import { codePointLength, normalizeLineEndings } from "@/shared/validation";

export interface ReleaseCommunicationRecord {
  readonly id: string;
  readonly completedFixId: string;
  readonly audience: string;
  readonly subject: string;
  readonly message: string;
  readonly approvedBy: string;
  readonly approvedAt: Date;
}

function boundedText(
  value: string,
  field: "audience" | "subject" | "message" | "approvedBy",
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

export function prepareReleaseCommunicationValues(input: {
  readonly audience: string;
  readonly subject: string;
  readonly message: string;
  readonly approvedBy: string;
}): Omit<ReleaseCommunicationRecord, "id" | "completedFixId" | "approvedAt"> {
  return {
    audience: boundedText(input.audience, "audience", 500),
    subject: boundedText(input.subject, "subject", 200),
    message: boundedText(input.message, "message", 4_000),
    approvedBy: boundedText(input.approvedBy, "approvedBy", 120)
  };
}
