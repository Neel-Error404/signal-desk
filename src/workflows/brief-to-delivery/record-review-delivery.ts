import type {
  PrepareReviewDelivery,
  PrepareReviewDeliveryCommand
} from "@/modules/review-deliveries/application";
import type { BriefDeliveryUnitOfWork, RecordReviewDeliveryResult } from "./ports";

export class RecordReviewDelivery {
  constructor(
    private readonly prepareReviewDelivery: PrepareReviewDelivery,
    private readonly unitOfWork: BriefDeliveryUnitOfWork,
    private readonly idGenerator: () => string = () => crypto.randomUUID(),
    private readonly clock: () => Date = () => new Date()
  ) {}

  execute(
    implementationBriefId: string,
    command: PrepareReviewDeliveryCommand
  ): Promise<RecordReviewDeliveryResult> {
    const prepared = this.prepareReviewDelivery.execute(command);
    return this.unitOfWork.record(
      implementationBriefId,
      prepared,
      this.idGenerator(),
      this.clock()
    );
  }
}
