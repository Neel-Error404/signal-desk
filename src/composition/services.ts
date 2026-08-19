import {
  DeterministicContentPolicy,
  PrepareFeedback
} from "@/modules/feedback-intake/application";
import { PrismaFeedbackWriter } from "@/modules/feedback-intake/infrastructure/prisma-feedback-writer";
import {
  AppendTriage,
  GetSignal,
  ListSignals,
  PrepareTriage
} from "@/modules/signal-inbox/application";
import { PrismaSignalStore } from "@/modules/signal-inbox/infrastructure/prisma-signal-store";
import { PrismaSignalWriter } from "@/modules/signal-inbox/infrastructure/prisma-signal-writer";
import {
  GetProductIssueBySignal,
  PrepareProductIssue
} from "@/modules/product-issues/application";
import { PrismaProductIssueStore } from "@/modules/product-issues/infrastructure/prisma-product-issue-store";
import {
  GetImplementationBriefByProductIssue,
  PrepareImplementationBrief
} from "@/modules/implementation-briefs/application";
import { PrismaImplementationBriefStore } from "@/modules/implementation-briefs/infrastructure/prisma-implementation-brief-store";
import {
  GetReviewDeliveryByImplementationBrief,
  PrepareReviewDelivery,
  type ReviewDeliveryPolicy
} from "@/modules/review-deliveries/application";
import { PrismaReviewDeliveryStore } from "@/modules/review-deliveries/infrastructure/prisma-review-delivery-store";
import {
  GetCompletedFixByReviewDelivery,
  PrepareCompletedFix
} from "@/modules/completed-fixes/application";
import { PrismaCompletedFixStore } from "@/modules/completed-fixes/infrastructure/prisma-completed-fix-store";
import {
  GetReleaseCommunicationByCompletedFix,
  PrepareReleaseCommunication
} from "@/modules/release-communications/application";
import { PrismaReleaseCommunicationStore } from "@/modules/release-communications/infrastructure/prisma-release-communication-store";
import { getPrismaClient } from "@/platform/database/prisma-client";
import { CreateFeedbackSignal } from "@/workflows/feedback-to-signal/create-feedback-signal";
import { PrismaFeedbackSignalUnitOfWork } from "@/workflows/feedback-to-signal/prisma-unit-of-work";
import { PromoteSignalToIssue } from "@/workflows/signal-to-issue/promote-signal-to-issue";
import { PrismaSignalIssueUnitOfWork } from "@/workflows/signal-to-issue/prisma-unit-of-work";
import { GetSignalDetailWithIssue } from "@/workflows/signal-to-issue/signal-detail";
import { ApproveImplementationBrief } from "@/workflows/issue-to-brief/approve-implementation-brief";
import { PrismaIssueBriefUnitOfWork } from "@/workflows/issue-to-brief/prisma-unit-of-work";
import { RecordReviewDelivery } from "@/workflows/brief-to-delivery/record-review-delivery";
import { PrismaBriefDeliveryUnitOfWork } from "@/workflows/brief-to-delivery/prisma-unit-of-work";
import { RecordCompletedFix } from "@/workflows/delivery-to-completion/record-completed-fix";
import { PrismaDeliveryCompletionUnitOfWork } from "@/workflows/delivery-to-completion/prisma-unit-of-work";
import { ApproveReleaseCommunication } from "@/workflows/completion-to-communication/approve-release-communication";
import { PrismaCompletionCommunicationUnitOfWork } from "@/workflows/completion-to-communication/prisma-unit-of-work";
import deliveryContract from "../../delivery/review-delivery-contract.json";

const reviewDeliveryPolicy: ReviewDeliveryPolicy = {
  repositoryUrl: deliveryContract.repository.url,
  trustedPullRequestUrlPrefix: deliveryContract.repository.trustedPullRequestUrlPrefix,
  baseBranchPattern: deliveryContract.branchPolicy.basePattern,
  headBranchPattern: deliveryContract.branchPolicy.headPattern,
  requireDistinctBranches: deliveryContract.branchPolicy.requireDistinctBranches
};

export interface SignalDeskServices {
  readonly createFeedbackSignal: CreateFeedbackSignal;
  readonly listSignals: ListSignals;
  readonly getSignal: GetSignal;
  readonly getSignalDetailWithIssue: GetSignalDetailWithIssue;
  readonly appendTriage: AppendTriage;
  readonly promoteSignalToIssue: PromoteSignalToIssue;
  readonly approveImplementationBrief: ApproveImplementationBrief;
  readonly recordReviewDelivery: RecordReviewDelivery;
  readonly recordCompletedFix: RecordCompletedFix;
  readonly approveReleaseCommunication: ApproveReleaseCommunication;
}

let singleton: SignalDeskServices | undefined;

export function getSignalDeskServices(): SignalDeskServices {
  if (singleton !== undefined) {
    return singleton;
  }

  const prisma = getPrismaClient();
  const contentPolicy = new DeterministicContentPolicy();
  const signalStore = new PrismaSignalStore(prisma);
  const productIssueStore = new PrismaProductIssueStore(prisma);
  const implementationBriefStore = new PrismaImplementationBriefStore(prisma);
  const reviewDeliveryStore = new PrismaReviewDeliveryStore(prisma);
  const completedFixStore = new PrismaCompletedFixStore(prisma);
  const releaseCommunicationStore = new PrismaReleaseCommunicationStore(prisma);
  const getSignal = new GetSignal(signalStore);
  const unitOfWork = new PrismaFeedbackSignalUnitOfWork(
    prisma,
    (transaction) => new PrismaFeedbackWriter(transaction),
    (transaction) => new PrismaSignalWriter(transaction)
  );
  singleton = {
    createFeedbackSignal: new CreateFeedbackSignal(
      new PrepareFeedback(contentPolicy),
      unitOfWork
    ),
    listSignals: new ListSignals(signalStore),
    getSignal,
    getSignalDetailWithIssue: new GetSignalDetailWithIssue(
      getSignal,
      new GetProductIssueBySignal(productIssueStore),
      new GetImplementationBriefByProductIssue(implementationBriefStore),
      new GetReviewDeliveryByImplementationBrief(reviewDeliveryStore),
      new GetCompletedFixByReviewDelivery(completedFixStore),
      new GetReleaseCommunicationByCompletedFix(releaseCommunicationStore)
    ),
    appendTriage: new AppendTriage(new PrepareTriage(contentPolicy), signalStore),
    promoteSignalToIssue: new PromoteSignalToIssue(
      new PrepareProductIssue(contentPolicy),
      new PrismaSignalIssueUnitOfWork(prisma)
    ),
    approveImplementationBrief: new ApproveImplementationBrief(
      new PrepareImplementationBrief(contentPolicy),
      new PrismaIssueBriefUnitOfWork(prisma)
    ),
    recordReviewDelivery: new RecordReviewDelivery(
      new PrepareReviewDelivery(contentPolicy, reviewDeliveryPolicy),
      new PrismaBriefDeliveryUnitOfWork(prisma)
    ),
    recordCompletedFix: new RecordCompletedFix(
      new PrepareCompletedFix(contentPolicy),
      new PrismaDeliveryCompletionUnitOfWork(prisma)
    ),
    approveReleaseCommunication: new ApproveReleaseCommunication(
      new PrepareReleaseCommunication(contentPolicy),
      new PrismaCompletionCommunicationUnitOfWork(prisma)
    )
  };
  return singleton;
}
