import type {
  PrepareImplementationBrief,
  PrepareImplementationBriefCommand
} from "@/modules/implementation-briefs/application";
import type { ApproveImplementationBriefResult, IssueBriefUnitOfWork } from "./ports";

export class ApproveImplementationBrief {
  constructor(
    private readonly prepareImplementationBrief: PrepareImplementationBrief,
    private readonly unitOfWork: IssueBriefUnitOfWork,
    private readonly idGenerator: () => string = () => crypto.randomUUID(),
    private readonly clock: () => Date = () => new Date()
  ) {}

  execute(
    productIssueId: string,
    command: PrepareImplementationBriefCommand
  ): Promise<ApproveImplementationBriefResult> {
    const prepared = this.prepareImplementationBrief.execute(command);
    return this.unitOfWork.approve(
      productIssueId,
      prepared,
      this.idGenerator(),
      this.clock()
    );
  }
}
