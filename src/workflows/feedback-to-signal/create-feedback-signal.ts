import type {
  PrepareFeedback,
  PrepareFeedbackCommand
} from "@/modules/feedback-intake/application";
import type {
  CreatedFeedbackSignal,
  FeedbackSignalUnitOfWork,
  PreparedFeedbackWithIdentity
} from "./ports";

export class CreateFeedbackSignal {
  constructor(
    private readonly prepareFeedback: PrepareFeedback,
    private readonly unitOfWork: FeedbackSignalUnitOfWork,
    private readonly idGenerator: () => string = () => crypto.randomUUID(),
    private readonly clock: () => Date = () => new Date()
  ) {}

  async execute(command: PrepareFeedbackCommand): Promise<CreatedFeedbackSignal> {
    const prepared = this.prepareFeedback.execute(command);
    const identified: PreparedFeedbackWithIdentity = {
      ...prepared,
      feedbackId: this.idGenerator(),
      signalId: this.idGenerator(),
      createdAt: this.clock()
    };

    return this.unitOfWork.run(async (transaction) => {
      const feedback = await transaction.feedback.create({
        id: identified.feedbackId,
        content: identified.content,
        createdAt: identified.createdAt
      });
      const signal = await transaction.signals.create({
        id: identified.signalId,
        feedbackId: feedback.id,
        statement: feedback.content,
        state: "new",
        revision: 0,
        createdAt: identified.createdAt
      });
      return { feedback, signal };
    });
  }
}
