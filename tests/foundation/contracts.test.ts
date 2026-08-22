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

  it("pins a least-privilege Ubuntu pull-request workflow", async () => {
    const workflow = await text(".github/workflows/hosted-review-gate.yml");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("      - main");
    expect(workflow).toContain("      - work/sd-006-release-communication");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain("contents: read");
    expect(workflow).not.toContain("contents: write");
    expect(workflow).not.toContain("secrets.");
    expect(workflow).toContain("name: signaldesk-ordered-review-gate");
    expect(workflow).toContain("runs-on: ubuntu-24.04");
    expect(workflow).toContain('node-version: "22.18.0"');
    expect(workflow).toContain("$env:RUNNER_TEMP");
    expect(workflow).toContain("$env:GITHUB_ENV");
    expect(workflow).toContain("SIGNALDESK_TEST_RUNTIME_ROOT=$runtimeRoot");
    expect(workflow).not.toContain("$env:LOCALAPPDATA");
    expect(workflow).not.toContain("${{ runner.temp }}");
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

  it("binds the mainline correction to a separate cumulative review target", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-007A.json")) as {
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
      branch: "work/sd-007a-mainline-gate",
      base_branch: "main",
      base_commit: "5a7b43aa29e50e8eae0e91938a8aa747f19b9177",
      required_check: "signaldesk-ordered-review-gate"
    });
    expect(["in_progress", "verified"]).toContain(workItem.status);
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

  it("prepares a manifest-bound Linux Elder compatibility layout", async () => {
    const workflow = await text(".github/workflows/hosted-review-gate.yml");
    expect(workflow).toContain("Prepare the verified Linux Elder runtime layout");
    expect(workflow).toContain(".elder/capsule/manifest.json");
    expect(workflow).toContain("Get-FileHash -Algorithm SHA256");
    expect(workflow).toContain('Join-Path $toolingRoot "bin/python"');
    expect(workflow).toContain('Join-Path $compatibilityDirectory "python.exe"');
    expect(workflow).toContain("New-Item -ItemType SymbolicLink");
    expect(workflow).toContain(".elder-wheel.sha256");
  });
});

describe("SD-008 ratified Azure staging contracts", () => {
  it("binds the local implementation to the exact mainline source and mutation boundary", async () => {
    const workItem = JSON.parse(await text("docs/work-items/SD-008.json")) as {
      change_class: string;
      owner: string;
      status: string;
      branch: string;
      base_branch: string;
      base_commit: string;
    };
    const adr = await text("docs/adr/0009-sd008-azure-hosted-staging-baseline.md");
    expect(workItem).toMatchObject({
      change_class: "infrastructure",
      owner: "Neel",
      status: "in_progress",
      branch: "work/sd-008-azure-staging-baseline",
      base_branch: "main",
      base_commit: "623ff665d2a276c7541622f73e34d15ee6a7d2bf"
    });
    expect(adr).toContain("## Status");
    expect(adr).toContain("Accepted for bounded local implementation");
    expect(adr).toContain("does not authorize staging, commit, push, pull-request creation");
    expect(adr).toMatch(/GitHub Environment or\s+identity mutation/);
    expect(adr).toContain("Azure mutation");
  });

  it("keeps deployment, traffic, teardown, learning, and production authority explicit", async () => {
    const contract = JSON.parse(
      await text("delivery/staging-deployment-contract.json")
    ) as {
      approvalEnvironments: string[];
      artifact: Record<string, unknown>;
      migration: Record<string, unknown>;
      learning: Record<string, unknown>;
      authority: Record<string, string>;
    };
    expect(contract.approvalEnvironments).toEqual([
      "staging-publication",
      "staging-provision",
      "staging-traffic",
      "staging-teardown"
    ]);
    expect(contract.artifact).toMatchObject({
      deploymentReference: "digest-only",
      requiredCleanBuilds: 2,
      nonRootUser: "node"
    });
    expect(contract.migration).toMatchObject({
      image: "same-exact-digest-as-application",
      policy: "expand-contract-forward-only",
      destructiveMigration: "forbidden"
    });
    expect(contract.learning).toMatchObject({
      maximumCandidates: 1,
      independentEvaluationRequired: true,
      exactHumanDecisionRequired: true,
      output: "non-mutating-promotion-packet-only"
    });
    expect(contract.authority).toMatchObject({
      localImplementation: "owner-authorized",
      stage: "not-authorized",
      commit: "not-authorized",
      push: "not-authorized",
      openPullRequest: "not-authorized",
      createGitHubEnvironments: "not-authorized",
      mutateAzure: "not-authorized",
      production: "forbidden"
    });
  });

  it("pins one non-root standalone image and normalizes the exact clean commit", async () => {
    const dockerfile = await text("Dockerfile");
    const dockerignore = await text(".dockerignore");
    const context = await text("scripts/create-container-context.mjs");
    const pinnedBase =
      "node:22.18.0-bookworm-slim@sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e";
    expect(dockerfile.match(new RegExp(pinnedBase, "g"))).toHaveLength(3);
    expect(dockerfile.indexOf("ARG SOURCE_DATE_EPOCH")).toBeLessThan(
      dockerfile.indexOf("FROM ")
    );
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain('CMD ["node", "server.js"]');
    expect(dockerfile).toContain("/app/node_modules ./node_modules");
    expect(dockerfile).not.toContain("DATABASE_URL=");
    expect(dockerignore).toContain(".env.*");
    expect(context).toContain('git("status", "--porcelain=v1", "--untracked-files=all")');
    expect(context).toContain('"archive", "--format=tar"');
    expect(context).toContain("does not match authorized commit");
  });

  it("keeps health HTTP adapters outside persistence and redacts release identity", async () => {
    const liveRoute = await text("src/app/api/v1/health/live/route.ts");
    const readyRoute = await text("src/app/api/v1/health/ready/route.ts");
    const metadata = await text(
      "src/modules/health/application/release-metadata.ts"
    );
    const service = await text("src/modules/health/application/health-service.ts");
    expect(liveRoute).not.toContain("@prisma/client");
    expect(readyRoute).not.toContain("@prisma/client");
    expect(metadata).toContain("metadata.commit.slice(0, 12)");
    expect(metadata).toContain("metadata.imageDigest.slice(7, 19)");
    expect(metadata).toContain("SIGNALDESK_DEPLOYMENT_RUN_ID");
    expect(service).toContain("DEFAULT_READINESS_TIMEOUT_MS = 2_000");
    expect(service).toContain("ReadinessUnavailableError");
  });

  it("defines private least-privilege Azure resources without production values", async () => {
    const main = await text("infra/staging/main.bicep");
    const database = await text("infra/staging/database.bicep");
    const secrets = await text("infra/staging/secrets.bicep");
    const apps = await text("infra/staging/container-apps.bicep");
    expect(main).toContain("targetScope = 'resourceGroup'");
    expect(main).toContain("'centralindia'");
    expect(database).toContain("publicNetworkAccess: 'Disabled'");
    expect(database).toContain("name: 'Standard_B1ms'");
    expect(secrets).toContain("enablePurgeProtection: true");
    expect(secrets).toContain("publicNetworkAccess: 'Disabled'");
    expect(secrets).toContain("deploymentRunId");
    expect(apps).toContain("'${runtimeIdentityId}': {}");
    expect(apps).toContain("/api/v1/health/live");
    expect(apps).toContain("/api/v1/health/ready");
    expect(apps).toContain("activeRevisionsMode: 'Multiple'");
    for (const source of [main, database, secrets, apps]) {
      expect(source.toLowerCase()).not.toContain("production");
    }
  });

  it("pins all external actions and separates provision, traffic, and teardown gates", async () => {
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain("permissions: {}");
    expect(workflow).toContain("environment: staging-publication");
    expect(workflow).toContain("environment: staging-provision");
    expect(workflow).toContain("environment: staging-traffic");
    expect(workflow).toContain("environment: staging-teardown");
    expect(workflow).toContain("non_production_confirmation");
    expect(workflow).toContain("Prove two clean application trees and OCI manifests");
    expect(
      workflow.match(
        /SOURCE_DATE_EPOCH: \$\{\{ steps\.identity\.outputs\.source-date-epoch \}\}/g
      )
    ).toHaveLength(2);
    expect(workflow).toContain(
      '[[ "$SOURCE_DATE_EPOCH" == "$context_source_date_epoch" ]]'
    );
    expect(workflow).toContain(
      '--output "type=oci,dest=.tmp/proof-${build_number}.tar,rewrite-timestamp=true,name=signaldesk:reproducibility-proof"'
    );
    expect(workflow).toContain(
      '--output "type=docker,name=signaldesk:reproducibility-proof"'
    );
    expect(workflow).not.toContain('docker load --input ".tmp/proof-${build_number}.tar"');
    expect(workflow).toContain("--revision-weight \"$BASELINE_REVISION=0\" \"$CANDIDATE_REVISION=100\"");
    expect(workflow).toContain("--revision-weight \"$BASELINE_REVISION=100\" \"$CANDIDATE_REVISION=0\"");
    expect(workflow).toContain("secrets.ENTRA_CLIENT_SECRET");
    expect(workflow).not.toContain("secrets.AZURE_CLIENT_SECRET");
    const uses = [...workflow.matchAll(/^\s*uses:\s*(.+)$/gm)].map(
      (match) => match[1] ?? ""
    );
    for (const action of uses) {
      if (action.startsWith("./")) {
        continue;
      }
      expect(action).toMatch(/^[^@\s]+@[0-9a-f]{40}$/);
    }
  });
});

describe("SD-008 ratified local bootstrap and learning corrections", () => {
  it("binds ADR 0010 ratification while keeping every external mutation separately gated", async () => {
    const adr = await text("docs/adr/0010-sd008-bootstrap-and-learning-corrections.md");
    const correction = JSON.parse(
      await text("delivery/sd008-bootstrap-correction-contract.json")
    ) as {
      status: string;
      evidence: Record<string, unknown>;
      cloudAuthority: { traffic: Record<string, unknown> };
      smokeIdentity: Record<string, unknown>;
      authority: Record<string, string>;
    };
    expect(adr).toContain("exact ratification on August 20, 2026");
    expect(adr).toContain("does not authorize\nstaging, commit, push, pull-request creation");
    expect(correction.status).toBe("ratified-local-implementation");
    expect(correction.evidence).toMatchObject({
      rawProviderArtifactUpload: "forbidden",
      publicPacket: "redacted-json",
      privatePacket: "owner-encrypted-json-envelope"
    });
    expect(correction.cloudAuthority.traffic).toMatchObject({
      effectiveContainerAppAction: "Microsoft.App/containerApps/write",
      trafficOnlyAtProvider: false
    });
    expect(correction.smokeIdentity).toMatchObject({
      application: "signaldesk-sd008-smoke",
      separateFromDeploymentPrincipals: true,
      clientSecret: false
    });
    expect(correction.authority).toMatchObject({
      localCorrectionImplementation: "owner-authorized",
      adrRatification: "owner-ratified-2026-08-20",
      stage: "not-authorized",
      githubMutation: "not-authorized",
      entraMutation: "not-authorized",
      azureMutation: "not-authorized",
      learningApplication: "forbidden",
      production: "forbidden"
    });
  });

  it("binds the ratified ADR 0011 provider-valid delegation boundary", async () => {
    const adr = await text(
      "docs/adr/0011-sd008-provider-valid-delegated-role-assignment-condition.md"
    );
    const authority = JSON.parse(
      await text("delivery/sd008-azure-authority-contract.json")
    ) as {
      roles: Array<{
        id: string;
        assignmentScope: string;
        roleAssignmentDelegation?: Record<string, unknown>;
      }>;
    };
    const delegation = authority.roles.find(
      (role) => role.id === "sd008-provision-v1"
    )?.roleAssignmentDelegation;
    expect(adr).toContain("exact ratification on August 22, 2026");
    expect(adr).toContain("does not authorize staging, commit, push, pull-request creation");
    expect(delegation).toMatchObject({
      allowedRoleDefinitionId: "4633458b-17de-408a-b874-0445c86b69e6",
      allowedRoleName: "Key Vault Secrets User",
      supportedConditionAttributes: ["RoleDefinitionId", "PrincipalId", "PrincipalType"],
      targetPrincipalTypes: ["ServicePrincipal"],
      selfAssignment: "forbidden",
      selfAssignmentOperator: "ForAnyOfAllValues:GuidNotEquals",
      scopeEnforcement: "outer-assignment-exact-resource-group",
      targetScopeCondition: "unsupported-by-provider",
      deleteConstrainedToAllowedRoleAndPrincipalType: true
    });
    expect(authority.roles.find((role) => role.id === "sd008-provision-v1")?.assignmentScope).toBe(
      "exact-resource-group"
    );
    expect(delegation).not.toHaveProperty("scopePrefix");
  });

  it("proves exact protected main before any package or attestation write", async () => {
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");
    const sourceIndex = workflow.indexOf("  protected-main-source:");
    const buildIndex = workflow.indexOf("  build-and-attest:");
    expect(sourceIndex).toBeGreaterThan(0);
    expect(buildIndex).toBeGreaterThan(sourceIndex);
    expect(workflow).toContain('[[ "$GITHUB_REF" == "refs/heads/main" ]]');
    expect(workflow).toContain('[[ "$live_main_sha" == "$AUTHORIZED_COMMIT" ]]');
    expect(workflow).toContain('REQUIRED_RULESET_ID: "21058424"');
    expect(workflow).toContain("strict_required_status_checks_policy == true");
    expect(workflow).toContain("(.bypass_actors // []) | length == 0");
    expect(workflow).toContain('.name == $required and .status == "completed"');
    expect(workflow).toContain(
      "  ordered-review-gate:\n    needs: protected-main-source\n    permissions:\n      contents: read\n    uses: ./.github/workflows/hosted-review-gate.yml"
    );
    expect(workflow).toContain("group: signaldesk-staging");
    expect(workflow).toContain("cancel-in-progress: false");
  });

  it("uploads redacted public packets and owner-encrypted envelopes instead of raw provider evidence", async () => {
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");
    for (const phase of ["provision", "traffic", "teardown"]) {
      expect(workflow).toContain(`.tmp-sd008-${phase}-public.json`);
      expect(workflow).toContain(`.tmp-sd008-${phase}-private-envelope.json`);
    }
    expect(workflow).toContain("scripts/sd008-evidence.mjs");
    expect(workflow).toContain("vars.SD008_EVIDENCE_PUBLIC_KEY_B64");
    const uploadBlocks = workflow
      .split("uses: actions/upload-artifact@")
      .slice(1)
      .map((block) => block.split(/\n\s{6}- name:/, 1)[0] ?? "")
      .join("\n");
    expect(workflow.match(/include-hidden-files: true/g)).toHaveLength(6);
    for (const rawArtifact of [
      ".tmp-sd008-what-if.json",
      ".tmp-sd008-deployment.json",
      ".tmp-sd008-job-executions.jsonl",
      ".tmp-sd008-revisions.json",
      ".tmp-sd008-activity.json",
      ".tmp-sd008-console-logs.json",
      ".tmp-sd008-vault-tombstones.json"
    ]) {
      expect(uploadBlocks).not.toContain(rawArtifact);
    }
  });

  it("makes the actual teardown-complete trace the only learning entrypoint", async () => {
    const contract = JSON.parse(
      await text("delivery/sd008-learning-contract.json")
    ) as {
      status: string;
      lane1Eligibility: { traceType: string; state: string; requiredEventOrder: string[] };
      candidate: Record<string, unknown>;
      evaluation: Record<string, unknown>;
      decision: Record<string, unknown>;
      promotion: Record<string, unknown>;
    };
    const driver = await text("scripts/invoke-sd008-learning.ps1");
    const validator = await text("scripts/validate-sd008-learning-trace.mjs");
    expect(contract.status).toBe("implemented-local-scaffold-hosted-trace-required");
    expect(contract.lane1Eligibility).toMatchObject({
      traceType: "actual-hosted-sd008",
      state: "verified-after-teardown"
    });
    expect(contract.lane1Eligibility.requiredEventOrder.at(-1)).toBe(
      "post-delete-verifier-removed"
    );
    expect(contract.candidate).toMatchObject({
      maximumPerTrace: 1,
      createdBy: "signaldesk-learning-agent",
      sd007CandidateReuse: false
    });
    expect(contract.evaluation).toMatchObject({
      evaluatorId: "signaldesk-evaluator",
      candidateOwnerMayEvaluate: false
    });
    expect(contract.promotion).toMatchObject({
      packetOnly: true,
      appliesTargetMutation: false,
      journalReplayRequired: true
    });
    expect(driver).toContain("scripts/validate-sd008-learning-trace.mjs");
    expect(driver).toContain("trace:sha256:$traceDigest");
    expect(driver).toContain("SD-008 permits at most one candidate");
    expect(driver).toContain("--evaluator-id', 'signaldesk-evaluator'");
    expect(driver).toContain("applies_target_mutation");
    expect(validator).toContain('trace.traceType === "actual-hosted-sd008"');
    expect(validator).toContain('trace.lane1?.status === "verified-after-teardown"');
    expect(validator).toContain("candidateCreated === false");
  });

  it("uses a dedicated federated smoke identity and excludes deployment principals from ingress", async () => {
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");
    const main = await text("infra/staging/main.bicep");
    const apps = await text("infra/staging/container-apps.bicep");
    const smoke = await text("scripts/get-entra-smoke-token.mjs");
    expect(workflow).toContain("scripts/get-entra-smoke-token.mjs");
    expect(workflow).toContain("vars.STAGING_SMOKE_CLIENT_ID");
    expect(workflow).toContain("vars.STAGING_SMOKE_PRINCIPAL_OBJECT_ID");
    expect(workflow).not.toContain("az account get-access-token");
    expect(main).toContain("authorizedSmokeClientId");
    expect(main).toContain("authorizedSmokePrincipalObjectId");
    expect(apps).toContain("allowedApplications: [");
    expect(apps).toContain("entraClientId\n              authorizedSmokeClientId");
    expect(apps).toContain("authorizedSmokePrincipalObjectId");
    expect(apps).not.toContain("authorizedProvisionClientId");
    expect(apps).not.toContain("authorizedTrafficClientId");
    expect(smoke).toContain("client_assertion_type");
    expect(smoke).toContain("client_assertion: githubResponse.value");
    expect(smoke).toContain("repo:Neel-Error404/signal-desk:environment:${environment}");
  });

  it("pins baseline traffic, declares exact effective roles, and requires post-delete authority closure", async () => {
    const apps = await text("infra/staging/container-apps.bicep");
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");
    const authority = JSON.parse(
      await text("delivery/sd008-azure-authority-contract.json")
    ) as { status: string; roles: Array<Record<string, unknown>>; sessionOrder: string[] };
    expect(apps).toContain("latestRevision: false");
    expect(apps).toContain("revisionName: '${resourcePrefix}-app--${revisionSuffix}'");
    expect(authority.status).toBe("ratified-local-implementation");
    expect(authority.roles.map((role) => role.name)).toEqual([
      "SignalDesk SD008 Provision",
      "SignalDesk SD008 Traffic",
      "SignalDesk SD008 Evidence Reader",
      "SignalDesk SD008 Teardown",
      "SignalDesk SD008 Post Delete Verifier"
    ]);
    expect(authority.sessionOrder.at(-1)).toBe("owner-removes-post-delete-read-only-assignment");
    expect(workflow).toContain("SignalDesk SD008 Post Delete Verifier");
    expect(workflow).toContain("hosted-trace-inputs:");
    expect(workflow).toContain("authority-closure-template.json");
    expect(workflow).toContain("unexpectedChargesDetected:false");
    expect(workflow).toContain('session_started_at="$SESSION_STARTED_AT"');
    expect(workflow).toContain('tags.createdAt -o tsv');
    expect(workflow).toContain("actions/runs/${GITHUB_RUN_ID}");
    expect(workflow).toContain('--start "$session_started_at"');
    expect(workflow).toContain('contains("ForAnyOfAllValues:GuidNotEquals")');
    expect(workflow).toContain('contains("ServicePrincipal")');
    expect(workflow).toContain('contains("RoleAssignmentScope")) | not');
    expect(workflow).not.toContain("vaultPrefix");
  });
});
