import { InvalidRequestError } from "@/shared/errors";
import { codePointLength, normalizeLineEndings } from "@/shared/validation";

export const MAX_FEEDBACK_CODE_POINTS = 8_000;

export interface FeedbackRecord {
  readonly id: string;
  readonly content: string;
  readonly createdAt: Date;
}

export function normalizeFeedbackContent(input: string): string {
  const content = normalizeLineEndings(input);
  const length = codePointLength(content);
  if (content.trim().length === 0 || length < 1 || length > MAX_FEEDBACK_CODE_POINTS) {
    throw new InvalidRequestError(
      `content must contain between 1 and ${MAX_FEEDBACK_CODE_POINTS} Unicode code points.`,
      ["content"]
    );
  }
  return content;
}
