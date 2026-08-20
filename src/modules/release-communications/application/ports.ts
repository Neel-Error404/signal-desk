import type { ReleaseCommunicationRecord } from "../domain/release-communication";

export interface ReleaseCommunicationWriter {
  create(record: ReleaseCommunicationRecord): Promise<ReleaseCommunicationRecord>;
}

export interface ReleaseCommunicationReader {
  getByCompletedFixId(completedFixId: string): Promise<ReleaseCommunicationRecord | null>;
}
