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
import {
  ProductIssueExistsError,
  SignalNotAcceptedError
} from "@/shared/errors";
import { PrepareProductIssue } from "@/modules/product-issues/application";
import { PromoteSignalToIssue } from "@/workflows/signal-to-issue/promote-signal-to-issue";
import { PrismaSignalIssueUnitOfWork } from "@/workflows/signal-to-issue/prisma-unit-of-work";
import { PrepareImplementationBrief } from "@/modules/implementation-briefs/application";
import { ApproveImplementationBrief } from "@/workflows/issue-to-brief/approve-implementation-brief";
import { PrismaIssueBriefUnitOfWork } from "@/workflows/issue-to-brief/prisma-unit-of-work";
import {
  PrepareReviewDelivery,
  type ReviewDeliveryPolicy
} from "@/modules/review-deliveries/application";
import { RecordReviewDelivery } from "@/workflows/brief-to-delivery/record-review-delivery";
import { PrismaBriefDeliveryUnitOfWork } from "@/workflows/brief-to-delivery/prisma-unit-of-work";
import { PrepareCompletedFix } from "@/modules/completed-fixes/application";
import { RecordCompletedFix } from "@/workflows/delivery-to-completion/record-completed-fix";
import { PrismaDeliveryCompletionUnitOfWork } from "@/workflows/delivery-to-completion/prisma-unit-of-work";
import { PrepareReleaseCommunication } from "@/modules/release-communications/application";
import { ApproveReleaseCommunication } from "@/workflows/completion-to-communication/approve-release-communication";
import { PrismaCompletionCommunicationUnitOfWork } from "@/workflows/completion-to-communication/prisma-unit-of-work";
import {
  ImplementationBriefExistsError,
  ImplementationBriefNotFoundError,
  ProductIssueNotFoundError,
  ReviewDeliveryExistsError,
  ReviewDeliveryNotFoundError,
  CompletedFixExistsError,
  CompletedFixNotFoundError,
  ReleaseCommunicationExistsError
} from "@/shared/errors";
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

function issueWorkflow(): PromoteSignalToIssue {
  return new PromoteSignalToIssue(
    new PrepareProductIssue(new DeterministicContentPolicy()),
    new PrismaSignalIssueUnitOfWork(prisma)
  );
}

function briefWorkflow(): ApproveImplementationBrief {
  return new ApproveImplementationBrief(
    new PrepareImplementationBrief(new DeterministicContentPolicy()),
    new PrismaIssueBriefUnitOfWork(prisma)
  );
}

const reviewDeliveryPolicy: ReviewDeliveryPolicy = {
  repositoryUrl: "https://github.com/Neel-Error404/signal-desk",
  trustedPullRequestUrlPrefix: "https://github.com/Neel-Error404/signal-desk/pull/",
  baseBranchPattern: "^(main|work/sd-[0-9]{3}-[a-z0-9-]+)$",
  headBranchPattern: "^work/sd-[0-9]{3}-[a-z0-9-]+$",
  requireDistinctBranches: true
};

function deliveryWorkflow(): RecordReviewDelivery {
  return new RecordReviewDelivery(
    new PrepareReviewDelivery(new DeterministicContentPolicy(), reviewDeliveryPolicy),
    new PrismaBriefDeliveryUnitOfWork(prisma)
  );
}

function completionWorkflow(): RecordCompletedFix {
  return new RecordCompletedFix(
    new PrepareCompletedFix(new DeterministicContentPolicy()),
    new PrismaDeliveryCompletionUnitOfWork(prisma)
  );
}

function communicationWorkflow(): ApproveReleaseCommunication {
  return new ApproveReleaseCommunication(
    new PrepareReleaseCommunication(new DeterministicContentPolicy()),
    new PrismaCompletionCommunicationUnitOfWork(prisma)
  );
}

const issueCommand = {
  expectedSignalRevision: 1,
  title: "Preserve the selected date range",
  priority: "high",
  rationale: "The reporting workflow loses an explicit user selection.",
  operatorLabel: "Neel",
  contentAcknowledged: true
} as const;

const briefCommand = {
  objective: "Preserve the selected date range during export.",
  acceptanceCriteria: [
    "The export uses the date range visible when export begins.",
    "Reloading does not change the completed exported artifact."
  ],
  constraints: ["Do not change report retention."],
  approvedBy: "Neel",
  contentAcknowledged: true
} as const;

const deliveryCommand = {
  baseBranch: "work/sd-003-approved-implementation-brief",
  headBranch: "work/sd-004-review-delivery",
  commitSha: "0123456789abcdef0123456789abcdef01234567",
  pullRequestUrl: "https://github.com/Neel-Error404/signal-desk/pull/3",
  verificationSummary: "Foundation through Stress passed.",
  deliveredBy: "Neel",
  contentAcknowledged: true
} as const;

const completionCommand = {
  mergedCommitSha: "89abcdef0123456789abcdef0123456789abcdef",
  completionSummary: "The human owner merged the reviewed fix after all checks passed.",
  completedBy: "Neel",
  mergeConfirmedOutsideSignalDesk: true,
  contentAcknowledged: true
} as const;

const communicationCommand = {
  audience: "Customers who reported the affected workflow",
  subject: "The reported workflow issue is fixed",
  message: "We completed the reviewed fix. No action is required from you.",
  approvedBy: "Neel",
  approvalConfirmed: true,
  contentAcknowledged: true
} as const;

async function createAcceptedSignal(content: string) {
  const created = await workflow().execute({ content, contentAcknowledged: true });
  await new AppendTriage(
    new PrepareTriage(new DeterministicContentPolicy()),
    new PrismaSignalStore(prisma)
  ).execute(created.signal.id, {
    expectedRevision: 0,
    toState: "accepted",
    rationale: "Customer impact confirmed.",
    operatorLabel: "Neel",
    contentAcknowledged: true
  });
  return created;
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

  it("creates one immutable Product Issue with exact Feedback and Signal lineage", async () => {
    const created = await createAcceptedSignal("Prioritized integration source");
    const result = await issueWorkflow().execute(created.signal.id, issueCommand);

    expect(result.lineage).toEqual({
      feedbackId: created.feedback.id,
      signalId: created.signal.id,
      signalRevision: 1
    });
    expect(result.productIssue).toMatchObject({
      signalId: created.signal.id,
      sourceSignalRevision: 1,
      priority: "high",
      operatorLabel: "Neel"
    });
    await expect(
      prisma.productIssue.update({
        where: { id: result.productIssue.id },
        data: { priority: "CRITICAL" }
      })
    ).rejects.toBeDefined();
    expect(
      await prisma.productIssue.findUniqueOrThrow({
        where: { id: result.productIssue.id }
      })
    ).toMatchObject({ priority: "HIGH" });
  });

  it("rejects non-accepted, stale, and duplicate promotion explicitly", async () => {
    const created = await workflow().execute({
      content: "Eligibility integration source",
      contentAcknowledged: true
    });
    await expect(
      issueWorkflow().execute(created.signal.id, {
        ...issueCommand,
        expectedSignalRevision: 0
      })
    ).rejects.toBeInstanceOf(SignalNotAcceptedError);

    const accepted = await createAcceptedSignal("Stale integration source");
    await expect(
      issueWorkflow().execute(accepted.signal.id, {
        ...issueCommand,
        expectedSignalRevision: 0
      })
    ).rejects.toBeInstanceOf(RevisionConflictError);

    await issueWorkflow().execute(accepted.signal.id, issueCommand);
    await expect(
      issueWorkflow().execute(accepted.signal.id, issueCommand)
    ).rejects.toBeInstanceOf(ProductIssueExistsError);
  });

  it("accepts exactly one concurrent Product Issue promotion", async () => {
    const created = await createAcceptedSignal("Concurrent issue source");
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        issueWorkflow().execute(created.signal.id, issueCommand)
      )
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(7);
    expect(await prisma.productIssue.count({ where: { signalId: created.signal.id } })).toBe(1);
  });

  it("creates one immutable Implementation Brief with exact source lineage", async () => {
    const created = await createAcceptedSignal("Approved brief integration source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const result = await briefWorkflow().execute(issue.productIssue.id, briefCommand);

    expect(result.lineage).toEqual({
      feedbackId: created.feedback.id,
      signalId: created.signal.id,
      signalRevision: 1,
      productIssueId: issue.productIssue.id
    });
    expect(result.implementationBrief).toMatchObject({
      productIssueId: issue.productIssue.id,
      objective: briefCommand.objective,
      acceptanceCriteria: briefCommand.acceptanceCriteria,
      constraints: briefCommand.constraints,
      approvedBy: "Neel"
    });
    await expect(
      prisma.implementationBrief.update({
        where: { id: result.implementationBrief.id },
        data: { objective: "Mutation must fail." }
      })
    ).rejects.toBeDefined();
    expect(
      await prisma.implementationBrief.findUniqueOrThrow({
        where: { id: result.implementationBrief.id }
      })
    ).toMatchObject({ objective: briefCommand.objective });
  });

  it("rejects missing and duplicate brief sources explicitly", async () => {
    await expect(
      briefWorkflow().execute(
        "11111111-1111-4111-8111-111111111111",
        briefCommand
      )
    ).rejects.toBeInstanceOf(ProductIssueNotFoundError);

    const created = await createAcceptedSignal("Duplicate brief integration source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    await expect(
      briefWorkflow().execute(issue.productIssue.id, briefCommand)
    ).rejects.toBeInstanceOf(ImplementationBriefExistsError);
  });

  it("accepts exactly one concurrent Implementation Brief approval", async () => {
    const created = await createAcceptedSignal("Concurrent brief source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        briefWorkflow().execute(issue.productIssue.id, briefCommand)
      )
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(7);
    expect(
      await prisma.implementationBrief.count({
        where: { productIssueId: issue.productIssue.id }
      })
    ).toBe(1);
  });

  it("enforces brief array bounds in PostgreSQL", async () => {
    const created = await createAcceptedSignal("Brief database bound source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    await expect(
      prisma.implementationBrief.create({
        data: {
          productIssueId: issue.productIssue.id,
          objective: "A valid objective.",
          acceptanceCriteria: [],
          constraints: [],
          approvedBy: "Neel"
        }
      })
    ).rejects.toBeDefined();
    expect(
      await prisma.implementationBrief.count({
        where: { productIssueId: issue.productIssue.id }
      })
    ).toBe(0);
  });

  it("creates one immutable Review Delivery with exact source lineage", async () => {
    const created = await createAcceptedSignal("Review delivery integration source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const result = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );

    expect(result.lineage).toEqual({
      feedbackId: created.feedback.id,
      signalId: created.signal.id,
      signalRevision: 1,
      productIssueId: issue.productIssue.id,
      implementationBriefId: brief.implementationBrief.id
    });
    expect(result.reviewDelivery).toMatchObject({
      implementationBriefId: brief.implementationBrief.id,
      repositoryUrl: reviewDeliveryPolicy.repositoryUrl,
      baseBranch: deliveryCommand.baseBranch,
      headBranch: deliveryCommand.headBranch,
      commitSha: deliveryCommand.commitSha,
      pullRequestNumber: 3,
      pullRequestUrl: deliveryCommand.pullRequestUrl,
      deliveredBy: "Neel"
    });
    await expect(
      prisma.reviewDelivery.update({
        where: { id: result.reviewDelivery.id },
        data: { verificationSummary: "Mutation must fail." }
      })
    ).rejects.toBeDefined();
  });

  it("rejects missing and duplicate Review Delivery sources explicitly", async () => {
    await expect(
      deliveryWorkflow().execute(
        "11111111-1111-4111-8111-111111111111",
        deliveryCommand
      )
    ).rejects.toBeInstanceOf(ImplementationBriefNotFoundError);

    const created = await createAcceptedSignal("Duplicate delivery integration source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    await deliveryWorkflow().execute(brief.implementationBrief.id, deliveryCommand);
    await expect(
      deliveryWorkflow().execute(brief.implementationBrief.id, deliveryCommand)
    ).rejects.toBeInstanceOf(ReviewDeliveryExistsError);
  });

  it("accepts exactly one concurrent Review Delivery record", async () => {
    const created = await createAcceptedSignal("Concurrent delivery source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        deliveryWorkflow().execute(brief.implementationBrief.id, deliveryCommand)
      )
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(7);
    expect(
      await prisma.reviewDelivery.count({
        where: { implementationBriefId: brief.implementationBrief.id }
      })
    ).toBe(1);
  });

  it("enforces Review Delivery Git policy in PostgreSQL", async () => {
    const created = await createAcceptedSignal("Delivery database bound source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    await expect(
      prisma.reviewDelivery.create({
        data: {
          implementationBriefId: brief.implementationBrief.id,
          repositoryUrl: reviewDeliveryPolicy.repositoryUrl,
          baseBranch: "main",
          headBranch: "main",
          commitSha: "invalid",
          pullRequestNumber: 3,
          pullRequestUrl: deliveryCommand.pullRequestUrl,
          verificationSummary: "Invalid direct write.",
          deliveredBy: "Neel"
        }
      })
    ).rejects.toBeDefined();
    expect(
      await prisma.reviewDelivery.count({
        where: { implementationBriefId: brief.implementationBrief.id }
      })
    ).toBe(0);
  });

  it("creates one immutable Completed Fix with exact source lineage", async () => {
    const created = await createAcceptedSignal("Completed fix integration source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const delivery = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );
    const result = await completionWorkflow().execute(
      delivery.reviewDelivery.id,
      completionCommand
    );

    expect(result.lineage).toEqual({
      feedbackId: created.feedback.id,
      signalId: created.signal.id,
      signalRevision: 1,
      productIssueId: issue.productIssue.id,
      implementationBriefId: brief.implementationBrief.id,
      reviewDeliveryId: delivery.reviewDelivery.id
    });
    expect(result.completedFix).toMatchObject({
      reviewDeliveryId: delivery.reviewDelivery.id,
      mergedCommitSha: completionCommand.mergedCommitSha,
      completionSummary: completionCommand.completionSummary,
      completedBy: "Neel"
    });
    await expect(
      prisma.completedFix.update({
        where: { id: result.completedFix.id },
        data: { completionSummary: "Mutation must fail." }
      })
    ).rejects.toBeDefined();
  });

  it("rejects missing and duplicate Completed Fix sources explicitly", async () => {
    await expect(
      completionWorkflow().execute(
        "11111111-1111-4111-8111-111111111111",
        completionCommand
      )
    ).rejects.toBeInstanceOf(ReviewDeliveryNotFoundError);

    const created = await createAcceptedSignal("Duplicate completion integration source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const delivery = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );
    await completionWorkflow().execute(delivery.reviewDelivery.id, completionCommand);
    await expect(
      completionWorkflow().execute(delivery.reviewDelivery.id, completionCommand)
    ).rejects.toBeInstanceOf(CompletedFixExistsError);
  });

  it("accepts exactly one concurrent Completed Fix record", async () => {
    const created = await createAcceptedSignal("Concurrent completion source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const delivery = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        completionWorkflow().execute(delivery.reviewDelivery.id, completionCommand)
      )
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(7);
    expect(
      await prisma.completedFix.count({
        where: { reviewDeliveryId: delivery.reviewDelivery.id }
      })
    ).toBe(1);
  });

  it("enforces Completed Fix evidence bounds in PostgreSQL", async () => {
    const created = await createAcceptedSignal("Completion database bound source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const delivery = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );
    await expect(
      prisma.completedFix.create({
        data: {
          reviewDeliveryId: delivery.reviewDelivery.id,
          mergedCommitSha: "invalid",
          completionSummary: "Invalid direct write.",
          completedBy: "Neel"
        }
      })
    ).rejects.toBeDefined();
    expect(
      await prisma.completedFix.count({
        where: { reviewDeliveryId: delivery.reviewDelivery.id }
      })
    ).toBe(0);
  });

  it("creates one immutable Release Communication with exact source lineage", async () => {
    const created = await createAcceptedSignal("Release communication integration source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const delivery = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );
    const fix = await completionWorkflow().execute(
      delivery.reviewDelivery.id,
      completionCommand
    );
    const result = await communicationWorkflow().execute(
      fix.completedFix.id,
      communicationCommand
    );

    expect(result.lineage).toEqual({
      feedbackId: created.feedback.id,
      signalId: created.signal.id,
      signalRevision: 1,
      productIssueId: issue.productIssue.id,
      implementationBriefId: brief.implementationBrief.id,
      reviewDeliveryId: delivery.reviewDelivery.id,
      completedFixId: fix.completedFix.id
    });
    expect(result.releaseCommunication).toMatchObject({
      completedFixId: fix.completedFix.id,
      audience: communicationCommand.audience,
      subject: communicationCommand.subject,
      approvedBy: "Neel"
    });
    await expect(
      prisma.releaseCommunication.update({
        where: { id: result.releaseCommunication.id },
        data: { message: "Mutation must fail." }
      })
    ).rejects.toBeDefined();
  });

  it("rejects missing and duplicate Release Communication sources explicitly", async () => {
    await expect(
      communicationWorkflow().execute(
        "11111111-1111-4111-8111-111111111111",
        communicationCommand
      )
    ).rejects.toBeInstanceOf(CompletedFixNotFoundError);

    const created = await createAcceptedSignal("Duplicate communication source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const delivery = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );
    const fix = await completionWorkflow().execute(
      delivery.reviewDelivery.id,
      completionCommand
    );
    await communicationWorkflow().execute(fix.completedFix.id, communicationCommand);
    await expect(
      communicationWorkflow().execute(fix.completedFix.id, communicationCommand)
    ).rejects.toBeInstanceOf(ReleaseCommunicationExistsError);
  });

  it("accepts exactly one concurrent Release Communication approval", async () => {
    const created = await createAcceptedSignal("Concurrent communication source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const delivery = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );
    const fix = await completionWorkflow().execute(
      delivery.reviewDelivery.id,
      completionCommand
    );
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        communicationWorkflow().execute(fix.completedFix.id, communicationCommand)
      )
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(7);
    expect(
      await prisma.releaseCommunication.count({
        where: { completedFixId: fix.completedFix.id }
      })
    ).toBe(1);
  });

  it("enforces Release Communication content bounds in PostgreSQL", async () => {
    const created = await createAcceptedSignal("Communication database bound source");
    const issue = await issueWorkflow().execute(created.signal.id, issueCommand);
    const brief = await briefWorkflow().execute(issue.productIssue.id, briefCommand);
    const delivery = await deliveryWorkflow().execute(
      brief.implementationBrief.id,
      deliveryCommand
    );
    const fix = await completionWorkflow().execute(
      delivery.reviewDelivery.id,
      completionCommand
    );
    await expect(
      prisma.releaseCommunication.create({
        data: {
          completedFixId: fix.completedFix.id,
          audience: "Customers",
          subject: "x".repeat(201),
          message: "Invalid direct write.",
          approvedBy: "Neel"
        }
      })
    ).rejects.toBeDefined();
    expect(
      await prisma.releaseCommunication.count({
        where: { completedFixId: fix.completedFix.id }
      })
    ).toBe(0);
  });
});
