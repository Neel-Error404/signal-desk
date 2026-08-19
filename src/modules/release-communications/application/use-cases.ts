import type { ReleaseCommunicationReader } from "./ports";
import type { ReleaseCommunicationRecord } from "../domain/release-communication";

export class GetReleaseCommunicationByCompletedFix {
  constructor(private readonly reader: ReleaseCommunicationReader) {}

  execute(completedFixId: string): Promise<ReleaseCommunicationRecord | null> {
    return this.reader.getByCompletedFixId(completedFixId);
  }
}
