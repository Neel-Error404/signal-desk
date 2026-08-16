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
import { getPrismaClient } from "@/platform/database/prisma-client";
import { CreateFeedbackSignal } from "@/workflows/feedback-to-signal/create-feedback-signal";
import { PrismaFeedbackSignalUnitOfWork } from "@/workflows/feedback-to-signal/prisma-unit-of-work";

export interface SignalDeskServices {
  readonly createFeedbackSignal: CreateFeedbackSignal;
  readonly listSignals: ListSignals;
  readonly getSignal: GetSignal;
  readonly appendTriage: AppendTriage;
}

let singleton: SignalDeskServices | undefined;

export function getSignalDeskServices(): SignalDeskServices {
  if (singleton !== undefined) {
    return singleton;
  }

  const prisma = getPrismaClient();
  const contentPolicy = new DeterministicContentPolicy();
  const signalStore = new PrismaSignalStore(prisma);
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
    getSignal: new GetSignal(signalStore),
    appendTriage: new AppendTriage(new PrepareTriage(contentPolicy), signalStore)
  };
  return singleton;
}
