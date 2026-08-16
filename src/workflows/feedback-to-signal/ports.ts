import type {
  FeedbackWriter,
  PreparedFeedback
} from "@/modules/feedback-intake/application";
import type {
  SignalRecord,
  SignalWriter
} from "@/modules/signal-inbox/application";
import type { FeedbackRecord } from "@/modules/feedback-intake/application";

export interface FeedbackSignalTransaction {
  readonly feedback: FeedbackWriter;
  readonly signals: SignalWriter;
}

export interface FeedbackSignalUnitOfWork {
  run<T>(work: (transaction: FeedbackSignalTransaction) => Promise<T>): Promise<T>;
}

export interface CreatedFeedbackSignal {
  readonly feedback: FeedbackRecord;
  readonly signal: SignalRecord;
}

export interface PreparedFeedbackWithIdentity extends PreparedFeedback {
  readonly feedbackId: string;
  readonly signalId: string;
  readonly createdAt: Date;
}
