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
import { getPrismaClient } from "@/platform/database/prisma-client";
import { CreateFeedbackSignal } from "@/workflows/feedback-to-signal/create-feedback-signal";
import { PrismaFeedbackSignalUnitOfWork } from "@/workflows/feedback-to-signal/prisma-unit-of-work";
import { PromoteSignalToIssue } from "@/workflows/signal-to-issue/promote-signal-to-issue";
import { PrismaSignalIssueUnitOfWork } from "@/workflows/signal-to-issue/prisma-unit-of-work";
import { GetSignalDetailWithIssue } from "@/workflows/signal-to-issue/signal-detail";

export interface SignalDeskServices {
  readonly createFeedbackSignal: CreateFeedbackSignal;
  readonly listSignals: ListSignals;
  readonly getSignal: GetSignal;
  readonly getSignalDetailWithIssue: GetSignalDetailWithIssue;
  readonly appendTriage: AppendTriage;
  readonly promoteSignalToIssue: PromoteSignalToIssue;
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
      new GetProductIssueBySignal(productIssueStore)
    ),
    appendTriage: new AppendTriage(new PrepareTriage(contentPolicy), signalStore),
    promoteSignalToIssue: new PromoteSignalToIssue(
      new PrepareProductIssue(contentPolicy),
      new PrismaSignalIssueUnitOfWork(prisma)
    )
  };
  return singleton;
}
