import { InvalidRequestError } from "@/shared/errors";
import { codePointLength, normalizeLineEndings } from "@/shared/validation";

export const SIGNAL_STATES = ["new", "reviewing", "accepted", "rejected"] as const;
export type SignalState = (typeof SIGNAL_STATES)[number];

export interface SignalRecord {
  readonly id: string;
  readonly feedbackId: string;
  readonly statement: string;
  readonly state: SignalState;
  readonly revision: number;
  readonly createdAt: Date;
}

export interface TriageEventRecord {
  readonly id: string;
  readonly signalId: string;
  readonly sequence: number;
  readonly fromState: SignalState;
  readonly toState: SignalState;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly createdAt: Date;
}

export interface SignalDetail {
  readonly signal: SignalRecord;
  readonly feedback: {
    readonly id: string;
    readonly content: string;
    readonly createdAt: Date;
  };
  readonly triageEvents: readonly TriageEventRecord[];
}

export function requireSignalState(value: string): SignalState {
  if (!(SIGNAL_STATES as readonly string[]).includes(value)) {
    throw new InvalidRequestError("toState is not supported.", ["toState"]);
  }
  return value as SignalState;
}

export function normalizeBoundedTriageText(
  value: string,
  field: "rationale" | "operatorLabel",
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
