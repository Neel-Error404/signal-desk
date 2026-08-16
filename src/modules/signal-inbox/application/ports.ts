import type {
  SignalDetail,
  SignalRecord,
  SignalState,
  TriageEventRecord
} from "../domain/signal";

export interface CreateSignalRecord {
  readonly id: string;
  readonly feedbackId: string;
  readonly statement: string;
  readonly state: "new";
  readonly revision: 0;
  readonly createdAt: Date;
}

export interface SignalWriter {
  create(record: CreateSignalRecord): Promise<SignalRecord>;
}

export interface SignalPage {
  readonly items: readonly SignalRecord[];
  readonly nextCursor: string | null;
}

export interface ListSignalsQuery {
  readonly limit: number;
  readonly cursor: string | null;
}

export interface AppendTriageRecord {
  readonly signalId: string;
  readonly expectedRevision: number;
  readonly toState: SignalState;
  readonly rationale: string;
  readonly operatorLabel: string;
  readonly eventId: string;
  readonly createdAt: Date;
}

export interface AppendTriageResult {
  readonly event: TriageEventRecord;
  readonly signal: SignalRecord;
}

export interface SignalStore {
  list(query: ListSignalsQuery): Promise<SignalPage>;
  get(signalId: string): Promise<SignalDetail | null>;
  appendTriage(record: AppendTriageRecord): Promise<AppendTriageResult>;
}
