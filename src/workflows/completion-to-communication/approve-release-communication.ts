import type {
  PrepareReleaseCommunication,
  PrepareReleaseCommunicationCommand
} from "@/modules/release-communications/application";
import type {
  ApproveReleaseCommunicationResult,
  CompletionCommunicationUnitOfWork
} from "./ports";

export class ApproveReleaseCommunication {
  constructor(
    private readonly prepareReleaseCommunication: PrepareReleaseCommunication,
    private readonly unitOfWork: CompletionCommunicationUnitOfWork,
    private readonly idGenerator: () => string = () => crypto.randomUUID(),
    private readonly clock: () => Date = () => new Date()
  ) {}

  execute(
    completedFixId: string,
    command: PrepareReleaseCommunicationCommand
  ): Promise<ApproveReleaseCommunicationResult> {
    const prepared = this.prepareReleaseCommunication.execute(command);
    return this.unitOfWork.approve(
      completedFixId,
      prepared,
      this.idGenerator(),
      this.clock()
    );
  }
}
