import type {
  PrepareCompletedFix,
  PrepareCompletedFixCommand
} from "@/modules/completed-fixes/application";
import type {
  DeliveryCompletionUnitOfWork,
  RecordCompletedFixResult
} from "./ports";

export class RecordCompletedFix {
  constructor(
    private readonly prepareCompletedFix: PrepareCompletedFix,
    private readonly unitOfWork: DeliveryCompletionUnitOfWork,
    private readonly idGenerator: () => string = () => crypto.randomUUID(),
    private readonly clock: () => Date = () => new Date()
  ) {}

  execute(
    reviewDeliveryId: string,
    command: PrepareCompletedFixCommand
  ): Promise<RecordCompletedFixResult> {
    const prepared = this.prepareCompletedFix.execute(command);
    return this.unitOfWork.record(
      reviewDeliveryId,
      prepared,
      this.idGenerator(),
      this.clock()
    );
  }
}
