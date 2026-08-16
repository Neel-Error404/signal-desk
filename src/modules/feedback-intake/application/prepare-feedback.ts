import { ContentAcknowledgementRequiredError } from "@/shared/errors";
import { normalizeFeedbackContent } from "../domain/feedback";
import type { ContentPolicy } from "./content-policy";

export interface PrepareFeedbackCommand {
  readonly content: string;
  readonly contentAcknowledged: boolean;
}

export interface PreparedFeedback {
  readonly content: string;
}

export class PrepareFeedback {
  constructor(private readonly contentPolicy: ContentPolicy) {}

  execute(command: PrepareFeedbackCommand): PreparedFeedback {
    if (command.contentAcknowledged !== true) {
      throw new ContentAcknowledgementRequiredError();
    }

    const content = normalizeFeedbackContent(command.content);
    this.contentPolicy.assertAllowed([content]);
    return { content };
  }
}
