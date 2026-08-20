import type {
  PrepareProductIssueCommand,
  PrepareProductIssue
} from "@/modules/product-issues/application";
import type {
  PromoteSignalToIssueResult,
  SignalIssueUnitOfWork
} from "./ports";

export class PromoteSignalToIssue {
  constructor(
    private readonly prepareProductIssue: PrepareProductIssue,
    private readonly unitOfWork: SignalIssueUnitOfWork,
    private readonly idGenerator: () => string = () => crypto.randomUUID(),
    private readonly clock: () => Date = () => new Date()
  ) {}

  execute(
    signalId: string,
    command: PrepareProductIssueCommand
  ): Promise<PromoteSignalToIssueResult> {
    const prepared = this.prepareProductIssue.execute(command);
    return this.unitOfWork.promote(
      signalId,
      prepared,
      this.idGenerator(),
      this.clock()
    );
  }
}
