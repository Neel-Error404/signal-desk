import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function text(path: string): Promise<string> {
  return readFile(path, "utf8");
}

describe("SD-001 ratified static contracts", () => {
  it("keeps the work item complete and public-contract classified", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-001.json")) as {
      status: string;
      change_class: string;
      owner: string;
    };
    expect(workItem).toMatchObject({
      status: "complete",
      change_class: "public-contract",
      owner: "Neel"
    });
  });

  it("preserves every public endpoint and local-only claim boundary", async () => {
    const contract = await text("docs/contracts/SD-001.md");
    for (const endpoint of [
      "POST /api/v1/feedback",
      "GET /api/v1/signals",
      "GET /api/v1/signals/{signalId}",
      "POST /api/v1/signals/{signalId}/triage-events"
    ]) {
      expect(contract).toContain(endpoint);
    }
    expect(contract).toContain("local-only");
    expect(contract).toContain("no authentication");
    expect(contract).toContain("complete DLP");
  });

  it("keeps the component deterministic and unauthenticated", async () => {
    const component = JSON.parse(
      await text("docs/contracts/signaldesk-web.component.json")
    ) as { execution_kind: string; authority: { identity_mode: string } };
    expect(component.execution_kind).toBe("deterministic");
    expect(component.authority.identity_mode).toBe("none");
  });

  it("defines PostgreSQL-only Prisma storage and one-to-one lineage", async () => {
    const schema = await text("prisma/schema.prisma");
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain("feedbackId   String        @unique @db.Uuid");
    expect(schema).toContain("@@unique([signalId, sequence])");
  });

  it("commits checks, foreign keys, and append-only triage enforcement", async () => {
    const migration = await text(
      "prisma/migrations/20260816180000_sd001_feedback_signal/migration.sql"
    );
    expect(migration).toContain('CREATE UNIQUE INDEX "Signal_feedbackId_key"');
    expect(migration).toContain('CONSTRAINT "Feedback_content_length"');
    expect(migration).toContain('CREATE TRIGGER "TriageEvent_append_only"');
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
  });

  it("declares dependency-cruiser fail-closed rules", async () => {
    const boundaries = await text(".dependency-cruiser.cjs");
    expect(boundaries).toContain('name: "no-unresolved"');
    expect(boundaries).toContain('name: "domain-does-not-depend-outward"');
    expect(boundaries).toContain('name: "platform-does-not-depend-on-product"');
    expect(boundaries).toContain('severity: "error"');
  });

  it("offers no upload control and visibly states the UI non-claims", async () => {
    const page = await text("src/app/page.tsx");
    expect(page).not.toMatch(/type=["']file["']/);
    expect(page).toContain("No authentication or verified identity");
    expect(page).toContain("not complete DLP");
    expect(page).toContain("No uploads or hosted-operation claim");
  });

  it("keeps HTTP route handlers outside direct Prisma access", async () => {
    const routeFiles = [
      "src/app/api/v1/feedback/route.ts",
      "src/app/api/v1/signals/route.ts",
      "src/app/api/v1/signals/[signalId]/route.ts",
      "src/app/api/v1/signals/[signalId]/triage-events/route.ts"
    ];
    for (const routeFile of routeFiles) {
      expect(await text(routeFile)).not.toContain("@prisma/client");
    }
  });
});

describe("SD-002 ratified static contracts", () => {
  it("binds the approved product outcome to a reviewable-pr work item", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-002.json")) as {
      change_class: string;
      owner: string;
      ship_target: string;
    };
    expect(workItem).toMatchObject({
      change_class: "public-contract",
      owner: "Neel",
      ship_target: "reviewable-pr"
    });
  });

  it("declares the additive manual promotion endpoint and non-claims", async () => {
    const contract = await text("docs/contracts/SD-002.md");
    expect(contract).toContain("POST /api/v1/signals/{signalId}/product-issue");
    expect(contract).toContain("currently accepted");
    expect(contract).toContain("automatic prioritization");
    expect(contract).toContain("local-only");
  });

  it("enforces unique immutable Product Issue lineage in PostgreSQL", async () => {
    const schema = await text("prisma/schema.prisma");
    const migration = await text(
      "prisma/migrations/20260817193000_sd002_prioritized_product_issue/migration.sql"
    );
    expect(schema).toContain("signalId             String               @unique @db.Uuid");
    expect(migration).toContain('CREATE UNIQUE INDEX "ProductIssue_signalId_key"');
    expect(migration).toContain('CREATE TRIGGER "ProductIssue_immutable"');
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
  });

  it("keeps the new route outside direct Prisma access", async () => {
    const route = await text(
      "src/app/api/v1/signals/[signalId]/product-issue/route.ts"
    );
    expect(route).not.toContain("@prisma/client");
    expect(route).toContain("postProductIssue");
  });

  it("extends fail-closed layout and context isolation rules", async () => {
    const layout = await text("scripts/check-source-layout.mjs");
    const boundaries = await text(".dependency-cruiser.cjs");
    expect(layout).toContain("product-issues");
    expect(layout).toContain("signal-to-issue");
    expect(boundaries).toContain('name: "product-issue-domain-is-context-local"');
  });
});

describe("SD-003 ratified static contracts", () => {
  it("binds the owner-approved brief outcome to one reviewable-pr work item", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-003.json")) as {
      change_class: string;
      owner: string;
      ship_target: string;
      status: string;
    };
    expect(workItem).toMatchObject({
      change_class: "public-contract",
      owner: "Neel",
      ship_target: "reviewable-pr",
      status: "verified"
    });
  });

  it("declares one immutable owner-approved brief and its non-claims", async () => {
    const contract = await text("docs/contracts/SD-003.md");
    expect(contract).toContain(
      "POST /api/v1/product-issues/{productIssueId}/implementation-brief"
    );
    expect(contract).toContain("1 to 10 strings");
    expect(contract).toContain("unverified local label");
    expect(contract).toContain("does not create tasks");
    expect(contract).toContain("local-only");
  });

  it("enforces unique immutable Implementation Brief lineage and bounds", async () => {
    const schema = await text("prisma/schema.prisma");
    const migration = await text(
      "prisma/migrations/20260818090000_sd003_approved_implementation_brief/migration.sql"
    );
    expect(schema).toContain("productIssueId     String       @unique @db.Uuid");
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ImplementationBrief_productIssueId_key"'
    );
    expect(migration).toContain(
      'CONSTRAINT "ImplementationBrief_acceptance_criteria_bounds"'
    );
    expect(migration).toContain('CREATE TRIGGER "ImplementationBrief_immutable"');
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
  });

  it("keeps the brief route outside direct Prisma access", async () => {
    const route = await text(
      "src/app/api/v1/product-issues/[productIssueId]/implementation-brief/route.ts"
    );
    expect(route).not.toContain("@prisma/client");
    expect(route).toContain("postImplementationBrief");
  });

  it("extends fail-closed layout and context-isolation rules", async () => {
    const layout = await text("scripts/check-source-layout.mjs");
    const boundaries = await text(".dependency-cruiser.cjs");
    expect(layout).toContain("implementation-briefs");
    expect(layout).toContain("issue-to-brief");
    expect(boundaries).toContain(
      'name: "implementation-brief-domain-is-context-local"'
    );
  });
});

describe("SD-004 ratified static contracts", () => {
  it("binds the review-delivery outcome to the stacked reviewable PR work item", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-004.json")) as {
      change_class: string;
      owner: string;
      ship_target: string;
      status: string;
      branch: string;
      base_branch: string;
    };
    expect(workItem).toMatchObject({
      change_class: "public-contract",
      owner: "Neel",
      ship_target: "reviewable-pr",
      status: "verified",
      branch: "work/sd-004-review-delivery",
      base_branch: "work/sd-003-approved-implementation-brief"
    });
  });

  it("declares the immutable operator-supplied delivery and its non-claims", async () => {
    const contract = await text("docs/contracts/SD-004.md");
    expect(contract).toContain(
      "POST /api/v1/implementation-briefs/{implementationBriefId}/review-delivery"
    );
    expect(contract).toContain("operator-supplied");
    expect(contract).toContain("does not verify GitHub");
    expect(contract).toContain("local-only");
  });

  it("owns a closed Git delivery policy with ordered checks and retained authority", async () => {
    const delivery = JSON.parse(
      await text("delivery/review-delivery-contract.json")
    ) as {
      projectId: string;
      repository: { url: string; trustedPullRequestUrlPrefix: string };
      shipTarget: string;
      contextContracts: string[];
      requiredChecks: Array<{ order: number; level: string }>;
      authority: Record<string, string>;
    };
    expect(delivery.projectId).toBe("signaldesk");
    expect(delivery.repository.url).toBe(
      "https://github.com/Neel-Error404/signal-desk"
    );
    expect(delivery.repository.trustedPullRequestUrlPrefix).toBe(
      `${delivery.repository.url}/pull/`
    );
    expect(delivery.shipTarget).toBe("reviewable-pr");
    expect(delivery.contextContracts).toEqual([
      "delivery/completed-fix-contract.json",
      "delivery/release-communication-contract.json"
    ]);
    expect(delivery.requiredChecks.map((check) => check.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8
    ]);
    expect(delivery.requiredChecks.slice(0, 5).map((check) => check.level)).toEqual([
      "foundation",
      "component",
      "integration",
      "workflow",
      "stress"
    ]);
    expect(delivery.authority).toMatchObject({
      createOrUpdatePullRequest: "owner-explicit",
      merge: "human-only",
      deployment: "human-only",
      release: "human-only",
      credentials: "external"
    });
  });

  it("enforces unique immutable Review Delivery lineage and Git bounds", async () => {
    const schema = await text("prisma/schema.prisma");
    const migration = await text(
      "prisma/migrations/20260818120000_sd004_review_delivery/migration.sql"
    );
    expect(schema).toContain("implementationBriefId String              @unique @db.Uuid");
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ReviewDelivery_implementationBriefId_key"'
    );
    expect(migration).toContain('CONSTRAINT "ReviewDelivery_commit_sha"');
    expect(migration).toContain('CONSTRAINT "ReviewDelivery_pull_request_url"');
    expect(migration).toContain('CREATE TRIGGER "ReviewDelivery_immutable"');
  });

  it("keeps the delivery route outside persistence and extends fail-closed boundaries", async () => {
    const route = await text(
      "src/app/api/v1/implementation-briefs/[implementationBriefId]/review-delivery/route.ts"
    );
    const layout = await text("scripts/check-source-layout.mjs");
    const boundaries = await text(".dependency-cruiser.cjs");
    expect(route).not.toContain("@prisma/client");
    expect(route).toContain("postReviewDelivery");
    expect(layout).toContain("review-deliveries");
    expect(layout).toContain("brief-to-delivery");
    expect(boundaries).toContain('name: "review-delivery-domain-is-context-local"');
  });
});

describe("SD-005 ratified static contracts", () => {
  it("binds the completed-fix outcome to the stacked reviewable PR work item", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-005.json")) as {
      change_class: string;
      owner: string;
      ship_target: string;
      status: string;
      branch: string;
      base_branch: string;
    };
    expect(workItem).toMatchObject({
      change_class: "public-contract",
      owner: "Neel",
      ship_target: "reviewable-pr",
      status: "verified",
      branch: "work/sd-005-completed-fix",
      base_branch: "work/sd-004-review-delivery"
    });
  });

  it("declares an immutable human-confirmed completion and its non-claims", async () => {
    const contract = await text("docs/contracts/SD-005.md");
    expect(contract).toContain(
      "POST /api/v1/review-deliveries/{reviewDeliveryId}/completed-fix"
    );
    expect(contract).toContain("mergeConfirmedOutsideSignalDesk");
    expect(contract).toContain("does not query GitHub");
    expect(contract).toContain("local-only");
  });

  it("owns closed lifecycle context that preserves retained authority", async () => {
    const lifecycle = JSON.parse(
      await text("delivery/completed-fix-contract.json")
    ) as {
      projectId: string;
      lifecycleStage: string;
      outcome: { evidenceSource: string; requiredEvidence: string[] };
      authority: Record<string, string>;
      nextEligibleStage: string;
    };
    expect(lifecycle).toMatchObject({
      projectId: "signaldesk",
      lifecycleStage: "completed-fix",
      nextEligibleStage: "release-communication"
    });
    expect(lifecycle.outcome.evidenceSource).toBe(
      "operator-confirmed-not-provider-verified"
    );
    expect(lifecycle.outcome.requiredEvidence).toContain("mergedCommitSha");
    expect(lifecycle.authority).toMatchObject({
      verifyHostedMerge: "not-granted",
      merge: "human-only",
      deployment: "human-only",
      release: "human-only",
      credentials: "external"
    });
  });

  it("enforces unique immutable Completed Fix lineage and evidence bounds", async () => {
    const schema = await text("prisma/schema.prisma");
    const migration = await text(
      "prisma/migrations/20260818170000_sd005_completed_fix/migration.sql"
    );
    expect(schema).toMatch(/reviewDeliveryId\s+String\s+@unique @db\.Uuid/);
    expect(migration).toContain('CREATE UNIQUE INDEX "CompletedFix_reviewDeliveryId_key"');
    expect(migration).toContain('CONSTRAINT "CompletedFix_merged_commit_sha"');
    expect(migration).toContain('CREATE TRIGGER "CompletedFix_immutable"');
  });

  it("keeps the completion route outside persistence and extends boundaries", async () => {
    const route = await text(
      "src/app/api/v1/review-deliveries/[reviewDeliveryId]/completed-fix/route.ts"
    );
    const layout = await text("scripts/check-source-layout.mjs");
    const boundaries = await text(".dependency-cruiser.cjs");
    expect(route).not.toContain("@prisma/client");
    expect(route).toContain("postCompletedFix");
    expect(layout).toContain("completed-fixes");
    expect(layout).toContain("delivery-to-completion");
    expect(boundaries).toContain('name: "completed-fix-domain-is-context-local"');
  });
});

describe("SD-006 ratified static contracts", () => {
  it("binds approved unsent communication to the stacked reviewable PR work item", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-006.json")) as {
      change_class: string;
      owner: string;
      ship_target: string;
      status: string;
      branch: string;
      base_branch: string;
    };
    expect(workItem).toMatchObject({
      change_class: "public-contract",
      owner: "Neel",
      ship_target: "reviewable-pr",
      status: "verified",
      branch: "work/sd-006-release-communication",
      base_branch: "work/sd-005-completed-fix"
    });
  });

  it("declares one immutable approved communication without publication authority", async () => {
    const contract = await text("docs/contracts/SD-006.md");
    expect(contract).toContain(
      "POST /api/v1/completed-fixes/{completedFixId}/release-communication"
    );
    expect(contract).toContain("approvalConfirmed");
    expect(contract).toContain('publicationStatus: "not-sent"');
    expect(contract).toContain("does not send");
  });

  it("connects release communication lifecycle context without granting publication", async () => {
    const lifecycle = JSON.parse(
      await text("delivery/release-communication-contract.json")
    ) as {
      projectId: string;
      lifecycleStage: string;
      source: { recordType: string };
      outcome: { evidenceSource: string; requiredEvidence: string[] };
      authority: Record<string, string>;
    };
    expect(lifecycle).toMatchObject({
      projectId: "signaldesk",
      lifecycleStage: "release-communication",
      source: { recordType: "completed-fix" }
    });
    expect(lifecycle.outcome.evidenceSource).toBe("owner-approved-not-published");
    expect(lifecycle.outcome.requiredEvidence).toContain("message");
    expect(lifecycle.authority).toMatchObject({
      publishCommunication: "not-granted",
      deployment: "human-only",
      release: "human-only",
      credentials: "external"
    });
  });

  it("enforces unique immutable Release Communication lineage and bounds", async () => {
    const schema = await text("prisma/schema.prisma");
    const migration = await text(
      "prisma/migrations/20260819090000_sd006_release_communication/migration.sql"
    );
    expect(schema).toMatch(/completedFixId\s+String\s+@unique @db\.Uuid/);
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ReleaseCommunication_completedFixId_key"'
    );
    expect(migration).toContain('CONSTRAINT "ReleaseCommunication_message_length"');
    expect(migration).toContain('CREATE TRIGGER "ReleaseCommunication_immutable"');
  });

  it("keeps the communication route outside persistence and extends boundaries", async () => {
    const route = await text(
      "src/app/api/v1/completed-fixes/[completedFixId]/release-communication/route.ts"
    );
    const layout = await text("scripts/check-source-layout.mjs");
    const boundaries = await text(".dependency-cruiser.cjs");
    expect(route).not.toContain("@prisma/client");
    expect(route).toContain("postReleaseCommunication");
    expect(layout).toContain("release-communications");
    expect(layout).toContain("completion-to-communication");
    expect(boundaries).toContain(
      'name: "release-communication-domain-is-context-local"'
    );
  });
});

describe("SD-007 hosted review gate contracts", () => {
  it("binds one infrastructure work item to the exact stacked delivery target", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-007.json")) as {
      change_class: string;
      owner: string;
      ship_target: string;
      status: string;
      branch: string;
      base_branch: string;
      base_commit: string;
      required_check: string;
    };
    expect(workItem).toMatchObject({
      change_class: "infrastructure",
      owner: "Neel",
      ship_target: "reviewable-pr",
      branch: "work/sd-007-hosted-review-gate",
      base_branch: "work/sd-006-release-communication",
      base_commit: "5879dc0c7285ecdddddcf23b1c4ea632db21b15c",
      required_check: "signaldesk-ordered-review-gate"
    });
    expect(["in_progress", "verified"]).toContain(workItem.status);
  });

  it("pins a least-privilege Windows pull-request workflow", async () => {
    const workflow = await text(".github/workflows/hosted-review-gate.yml");
    expect(workflow).toContain("pull_request:");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain("contents: read");
    expect(workflow).not.toContain("contents: write");
    expect(workflow).not.toContain("secrets.");
    expect(workflow).toContain("name: signaldesk-ordered-review-gate");
    expect(workflow).toContain("runs-on: windows-2022");
    expect(workflow).toContain('node-version: "22.18.0"');
    expect(workflow).toContain(
      "SIGNALDESK_TEST_RUNTIME_ROOT: ${{ runner.temp }}\\signaldesk-runtime"
    );
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain(
      "actions/checkout@11d5960a326750d5838078e36cf38b85af677262"
    );
    expect(workflow).toContain(
      "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020"
    );
    expect(workflow).toContain(
      "actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065"
    );
  });

  it("runs the product-owned checks once and in exact order", async () => {
    const delivery = JSON.parse(
      await text("delivery/review-delivery-contract.json")
    ) as { requiredChecks: Array<{ order: number; command: string }> };
    const workflow = await text(".github/workflows/hosted-review-gate.yml");
    const checks = [...delivery.requiredChecks].sort((left, right) => left.order - right.order);
    let previousIndex = -1;
    for (const check of checks) {
      const firstIndex = workflow.indexOf(`run: ${check.command}`);
      expect(firstIndex).toBeGreaterThan(previousIndex);
      expect(workflow.indexOf(`run: ${check.command}`, firstIndex + 1)).toBe(-1);
      previousIndex = firstIndex;
    }
  });

  it("keeps the reproduced Windows cleanup bounded and explicit", async () => {
    const runtime = await text("scripts/local-test-runtime.mjs");
    const integration = await text("scripts/run-integration.mjs");
    const stress = await text("scripts/run-stress.mjs");
    expect(runtime).toContain("SIGNALDESK_TEST_RUNTIME_ROOT must be an absolute path");
    expect(integration).toContain("testRuntimeRoot()");
    expect(stress).toContain("testRuntimeRoot()");
    expect(runtime).toContain("maxRetries: 10");
    expect(runtime).toContain("retryDelay: 100");
    expect(runtime).toContain("Local PostgreSQL process did not exit within");
    expect(runtime).not.toContain("Local PostgreSQL taskkill failed");
    expect(stress).toContain("maxRetries: 10");
    expect(stress).toContain("retryDelay: 100");
    expect(stress).toContain("Refused to remove unexpected PostgreSQL path");
  });

  it("bounds the full cold-start Workflow path without retries", async () => {
    const playwright = await text("playwright.config.ts");
    expect(playwright).toContain("timeout: 60_000");
    expect(playwright).toContain("retries: 0");
  });
});
