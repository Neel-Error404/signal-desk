import { SignalNotFoundError } from "@/shared/errors";
import type { SignalDetail } from "../domain/signal";
import type {
  AppendTriageResult,
  ListSignalsQuery,
  SignalPage,
  SignalStore
} from "./ports";
import type { PrepareTriageCommand } from "./prepare-triage";
import { PrepareTriage } from "./prepare-triage";

export class ListSignals {
  constructor(private readonly store: SignalStore) {}

  execute(query: ListSignalsQuery): Promise<SignalPage> {
    return this.store.list(query);
  }
}

export class GetSignal {
  constructor(private readonly store: SignalStore) {}

  async execute(signalId: string): Promise<SignalDetail> {
    const detail = await this.store.get(signalId);
    if (detail === null) {
      throw new SignalNotFoundError();
    }
    return detail;
  }
}

export class AppendTriage {
  constructor(
    private readonly prepareTriage: PrepareTriage,
    private readonly store: SignalStore,
    private readonly idGenerator: () => string = () => crypto.randomUUID(),
    private readonly clock: () => Date = () => new Date()
  ) {}

  execute(signalId: string, command: PrepareTriageCommand): Promise<AppendTriageResult> {
    const prepared = this.prepareTriage.execute(command);
    return this.store.appendTriage({
      signalId,
      ...prepared,
      eventId: this.idGenerator(),
      createdAt: this.clock()
    });
  }
}
