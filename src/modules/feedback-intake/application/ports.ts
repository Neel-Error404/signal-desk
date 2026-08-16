import type { FeedbackRecord } from "../domain/feedback";

export interface CreateFeedbackRecord {
  readonly id: string;
  readonly content: string;
  readonly createdAt: Date;
}

export interface FeedbackWriter {
  create(record: CreateFeedbackRecord): Promise<FeedbackRecord>;
}
