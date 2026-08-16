import { PrismaClient, SignalState as PrismaSignalState } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  DeterministicContentPolicy,
  PrepareFeedback
} from "@/modules/feedback-intake/application";
import { PrismaFeedbackWriter } from "@/modules/feedback-intake/infrastructure/prisma-feedback-writer";
import {
  AppendTriage,
  PrepareTriage
} from "@/modules/signal-inbox/application";
import { PrismaSignalStore } from "@/modules/signal-inbox/infrastructure/prisma-signal-store";
import { PrismaSignalWriter } from "@/modules/signal-inbox/infrastructure/prisma-signal-writer";
import { RevisionConflictError, StorageUnavailableError } from "@/shared/errors";
import { CreateFeedbackSignal } from "@/workflows/feedback-to-signal/create-feedback-signal";
import { PrismaFeedbackSignalUnitOfWork } from "@/workflows/feedback-to-signal/prisma-unit-of-work";

const prisma = new PrismaClient();

function workflow(
  idGenerator: () => string = () => crypto.randomUUID()
): CreateFeedbackSignal {
  return new CreateFeedbackSignal(
    new PrepareFeedback(new DeterministicContentPolicy()),
    new PrismaFeedbackSignalUnitOfWork(
      prisma,
      (transaction) => new PrismaFeedbackWriter(transaction),
      (transaction) => new PrismaSignalWriter(transaction)
    ),
    idGenerator
  );
}

describe("PostgreSQL feedback-to-signal integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "TriageEvent", "Signal", "Feedback" RESTART IDENTITY CASCADE'
    );
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "TriageEvent", "Signal", "Feedback" RESTART IDENTITY CASCADE'
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("commits one Feedback and one uniquely linked Signal", async () => {
    const created = await workflow().execute({
      content: "PostgreSQL integration source",
      contentAcknowledged: true
    });
    const feedbackCount = await prisma.feedback.count({ where: { id: created.feedback.id } });
    const signalCount = await prisma.signal.count({
      where: { feedbackId: created.feedback.id }
    });

    expect(feedbackCount).toBe(1);
    expect(signalCount).toBe(1);
  });

  it("rolls back Feedback when Signal persistence fails", async () => {
    const existing = await workflow().execute({
      content: "Existing source",
      contentAcknowledged: true
    });
    const newFeedbackId = "11111111-1111-4111-8111-111111111111";
    const identifiers = [newFeedbackId, existing.signal.id];

    await expect(
      workflow(() => identifiers.shift() ?? "unexpected").execute({
        content: "This transaction must roll back.",
        contentAcknowledged: true
      })
    ).rejects.toBeInstanceOf(StorageUnavailableError);

    expect(await prisma.feedback.count({ where: { id: newFeedbackId } })).toBe(0);
  });

  it("enforces one Signal per source Feedback in PostgreSQL", async () => {
    const created = await workflow().execute({
      content: "Unique lineage source",
      contentAcknowledged: true
    });

    await expect(
      prisma.signal.create({
        data: {
          feedbackId: created.feedback.id,
          statement: "A second signal is forbidden.",
          state: PrismaSignalState.NEW
        }
      })
    ).rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.signal.count({ where: { feedbackId: created.feedback.id } })).toBe(1);
  });

  it("accepts exactly one concurrent triage append for a revision", async () => {
    const created = await workflow().execute({
      content: "Concurrent triage source",
      contentAcknowledged: true
    });
    const append = new AppendTriage(
      new PrepareTriage(new DeterministicContentPolicy()),
      new PrismaSignalStore(prisma)
    );
    const command = {
      expectedRevision: 0,
      toState: "reviewing",
      rationale: "Review the customer impact.",
      operatorLabel: "Neel",
      contentAcknowledged: true
    } as const;

    const results = await Promise.allSettled([
      append.execute(created.signal.id, command),
      append.execute(created.signal.id, command)
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      RevisionConflictError
    );
    expect(
      await prisma.triageEvent.count({ where: { signalId: created.signal.id } })
    ).toBe(1);
    expect(
      await prisma.signal.findUniqueOrThrow({ where: { id: created.signal.id } })
    ).toMatchObject({ revision: 1, state: PrismaSignalState.REVIEWING });
  });

  it("returns ordered history and rejects mutation of a committed event", async () => {
    const created = await workflow().execute({
      content: "Append-only history source",
      contentAcknowledged: true
    });
    const store = new PrismaSignalStore(prisma);
    const append = new AppendTriage(
      new PrepareTriage(new DeterministicContentPolicy()),
      store,
      () => crypto.randomUUID(),
      (() => {
        const timestamps = [
          new Date("2026-08-16T00:00:01.000Z"),
          new Date("2026-08-16T00:00:02.000Z")
        ];
        return () => timestamps.shift() ?? new Date("2026-08-16T00:00:03.000Z");
      })()
    );
    const first = await append.execute(created.signal.id, {
      expectedRevision: 0,
      toState: "reviewing",
      rationale: "Review started.",
      operatorLabel: "Neel",
      contentAcknowledged: true
    });
    await append.execute(created.signal.id, {
      expectedRevision: 1,
      toState: "accepted",
      rationale: "Impact confirmed.",
      operatorLabel: "Neel",
      contentAcknowledged: true
    });

    const detail = await store.get(created.signal.id);
    expect(detail?.triageEvents.map((event) => event.sequence)).toEqual([1, 2]);
    expect(detail?.signal).toMatchObject({ state: "accepted", revision: 2 });
    await expect(
      prisma.triageEvent.update({
        where: { id: first.event.id },
        data: { rationale: "Mutation must fail." }
      })
    ).rejects.toBeDefined();
    expect(
      await prisma.triageEvent.findUniqueOrThrow({ where: { id: first.event.id } })
    ).toMatchObject({ rationale: "Review started." });
  });
});
