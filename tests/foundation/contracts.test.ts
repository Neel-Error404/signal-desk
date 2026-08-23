import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

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
      deploymentReference: "registry-digest-only",
      canonicalDeployableBuilds: 1,
      independentAdvisoryBuilds: 1,
      applicationTreeEquality: "blocking",
      ociBitIdentity: "advisory",
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
    expect(workflow).toContain("Build canonical image once and emit OCI diagnostics");
    expect(
      workflow.match(
        /SOURCE_DATE_EPOCH: \$\{\{ steps\.identity\.outputs\.source-date-epoch \}\}/g
      )
    ).toHaveLength(1);
    expect(workflow).toContain(
      '[[ "$SOURCE_DATE_EPOCH" == "$context_source_date_epoch" ]]'
    );
    expect(workflow).toContain('status: applicationTreeEqual ? "blocking-pass" : "blocking-failure"');
    expect(workflow).toContain("configBitIdentical");
    expect(workflow).toContain("manifestBitIdentical");
    expect(workflow).toContain("layersIdentical");
    expect(workflow).toContain("finalDigestIdentical");
    expect(workflow).toContain(
      '--output "type=oci,dest=.tmp/canonical.tar,rewrite-timestamp=true,name=$CANONICAL_IMAGE"'
    );
    expect(workflow).toContain(
      '--output "type=docker,name=$CANONICAL_IMAGE"'
    );
    expect(workflow).not.toContain("docker load --input");
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

describe("SD-008 ADR 0012 rescue artifact contract", () => {
  it("records the ADR 0012 phase-proportional artifact boundary", async () => {
    const adr = await text(
      "docs/adr/0012-sd008-phase-proportional-artifact-evidence.md"
    );
    const workItem = JSON.parse(await text("docs/work-items/SD-008.json")) as {
      artifact_gate: Record<string, unknown>;
      authority_sequence: string[];
      completion_requires: string[];
    };
    const contract = JSON.parse(
      await text("delivery/staging-deployment-contract.json")
    ) as {
      artifact: Record<string, unknown>;
      authority: Record<string, unknown>;
    };

    expect(adr).toContain("ADR 0012");
    expect(adr).toContain("amends ADRs 0009, 0010, and 0011");
    expect(adr).toContain("Application-tree equality remains blocking");
    expect(adr).toContain("OCI config, manifest/layer, and final-digest bit identity is advisory");
    expect(adr).toContain("suppresses every reproducibility success claim");
    expect(adr).toContain("private initial publication");
    expect(adr).toContain("owner approval of staging provisioning");
    expect(adr).toContain("rollback, teardown, protected environments, separated identities");

    expect(workItem.artifact_gate).toMatchObject({
      canonicalDeployableBuilds: 1,
      independentAdvisoryBuilds: 1,
      applicationTreeEquality: "blocking",
      ociBitIdentity: "advisory",
      diagnosticRetention: "always-after-generation",
      diagnosticDetail: "sanitized-digests-comparison-booleans-and-claim-suppression",
      reproducibilityClaimOnOciMismatch: "suppressed",
      initialPublication: "private",
      deploymentReference: "registry-digest-only"
    });
    expect(workItem.artifact_gate.canonicalLifecycle).toEqual(
      expect.arrayContaining(["real-cmd-http-liveness"])
    );
    expect(workItem.authority_sequence).toEqual([
      "exact-artifact-publication-evidence",
      "staging-publication-approval-and-verification",
      "owner-approved-staging-provisioning",
      "cloud-authority"
    ]);
    expect(workItem.completion_requires).toEqual(
      expect.arrayContaining([
        "complete-staging-proof",
        "controlled-rollback-proof",
        "approved-teardown-and-absence-proof",
        "hosted-trace-and-governed-learning-decision"
      ])
    );
    expect(contract.artifact).toMatchObject(workItem.artifact_gate);
    expect(contract.authority).toMatchObject({
      cloudAuthorityBeginsAfter:
        "exact-artifact-publication-evidence-then-separately-owner-approved-staging-publication-visibility-change-and-verification-then-owner-approved-staging-provision"
    });
  });

  it("defines phase-scoped JIT authority and guards every Azure mutation window", async () => {
    const adr = await text(
      "docs/adr/0012-sd008-phase-proportional-artifact-evidence.md"
    );
    const authority = JSON.parse(
      await text("delivery/sd008-azure-authority-contract.json")
    ) as {
      justInTimeAuthority: {
        packetMode: string;
        maximumLeaseMinutes: number;
        providerEnforcedAssignmentExpiry: boolean;
        assignmentExpiryEvidence: string;
        minimumRemainingMinutesByMutation: Record<string, number>;
        phases: {
          provision: { roleIds: string[]; preconditions: string[] };
          traffic: { roleIds: string[]; preconditions: string[] };
          teardown: { roleIds: string[]; preconditions: string[]; removalOrder: string[] };
        };
        ingressCredential: Record<string, unknown>;
        partialBootstrapCompensation: Record<string, unknown>;
      };
      sessionOrder: string[];
    };
    const workItem = JSON.parse(await text("docs/work-items/SD-008.json")) as {
      jit_authority: Record<string, unknown>;
    };
    const deployment = JSON.parse(
      await text("delivery/staging-deployment-contract.json")
    ) as { authority: { justInTime: Record<string, unknown> } };
    const closure = JSON.parse(
      await text("delivery/sd008-authority-closure.example.json")
    ) as Record<string, unknown>;
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");

    expect(adr).toContain("one phase-specific, non-mutating authority packet");
    expect(adr).toContain("Azure RBAC assignment expiry is procedural evidence");
    expect(adr).toContain("maximum eight-hour lease");
    expect(adr).toContain("bounded compensating cleanup");
    expect(authority.justInTimeAuthority).toMatchObject({
      packetMode: "exactly-one-requested-phase",
      maximumLeaseMinutes: 480,
      providerEnforcedAssignmentExpiry: false,
      assignmentExpiryEvidence: "procedural",
      minimumRemainingMinutesByMutation: {
        "provision-deployment": 90,
        "provision-bootstrap-job-start": 90,
        "provision-migration-job-start": 90,
        "provision-app-update": 90,
        "traffic-promotion": 45,
        "traffic-rollback": 15,
        "traffic-restore": 15,
        "teardown-delete": 60,
        "teardown-closure": 60
      }
    });
    expect(authority.justInTimeAuthority.phases.provision.roleIds).toEqual([
      "sd008-provision-v1"
    ]);
    expect(authority.justInTimeAuthority.phases.traffic.roleIds).toEqual([
      "sd008-traffic-v1",
      "sd008-evidence-reader-v1"
    ]);
    expect(authority.justInTimeAuthority.phases.traffic.preconditions).toEqual(
      expect.arrayContaining(["exact-container-app-exists", "provision-assignment-absent"])
    );
    expect(authority.justInTimeAuthority.phases.teardown.roleIds).toEqual([
      "sd008-teardown-v1",
      "sd008-post-delete-verifier-v1"
    ]);
    expect(authority.justInTimeAuthority.phases.teardown.removalOrder?.at(-1)).toBe(
      "sd008-post-delete-verifier-v1"
    );
    expect(authority.justInTimeAuthority.ingressCredential).toMatchObject({
      justInTime: true,
      longLived: false,
      githubEnvironment: "staging-provision"
    });
    expect(authority.justInTimeAuthority.partialBootstrapCompensation).toMatchObject({
      bounded: true,
      automaticAuthorityRenewal: false,
      maximumCleanupMinutes: 15
    });
    expect(authority.sessionOrder).not.toContain(
      "owner-assigns-provision-teardown-and-post-delete-roles"
    );
    expect(workItem.jit_authority).toMatchObject({
      packetMode: "one-phase-at-a-time",
      maximumLeaseMinutes: 480,
      providerEnforcedExpiry: false
    });
    expect(deployment.authority.justInTime).toMatchObject(workItem.jit_authority);
    expect(closure.schemaVersion).toBe(1);

    expect(workflow).toContain("publication-evidence-sha256:");
    expect(workflow.match(/SD008_AUTHORITY_PACKET_B64/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(workflow.match(/SD008_AUTHORITY_PACKET_SHA256/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    for (const mutation of [
      "provision-deployment",
      "provision-app-update",
      "traffic-promotion",
      "teardown-delete",
      "teardown-closure"
    ]) {
      expect(workflow).toContain(`validate_authority ${mutation}`);
    }
    for (const placement of [
      /validate_authority provision-deployment\s+deployment_json="\$\(az deployment group create/,
      /validate_authority "\$mutation"\s+execution_name="\$\(az containerapp job start/,
      /validate_authority provision-app-update\s+az containerapp update/,
      /validate_authority traffic-promotion\s+traffic_shifted=true\s+az containerapp ingress traffic set/,
      /validate_authority teardown-delete\s+az group delete/
    ]) {
      expect(workflow).toMatch(placement);
    }
    expect(workflow).toContain("restore_traffic traffic-rollback");
    expect(workflow).toContain("restore_traffic traffic-restore");
    expect(workflow).toContain('validate_authority "$mutation"');
    expect(workflow).toContain('wait_for_job "$bootstrap_job" provision-bootstrap-job-start');
    expect(workflow).toContain('wait_for_job "$migration_job" provision-migration-job-start');
    for (const binding of [
      '--source-commit "$AUTHORIZED_COMMIT"',
      '--image-digest "$IMAGE_DIGEST"',
      '--publication-evidence-digest "$PUBLICATION_EVIDENCE_DIGEST"',
      '--session-run-id "$GITHUB_RUN_ID"'
    ]) {
      expect(workflow).toContain(binding);
    }
    expect(workflow).toContain("Authority revalidation failed immediately before Azure mutation");
    expect(workflow).toContain("app-name: ${{ steps.staging-names.outputs.app-name }}");
    expect(workflow.indexOf("id: staging-names")).toBeLessThan(
      workflow.indexOf("id: provision")
    );
    expect(workflow).toContain('[[ "$app_name" == "$APP_NAME" ]]');
    expect(workflow).toContain('[[ "$bootstrap_job" == "$BOOTSTRAP_JOB_NAME" ]]');
    expect(workflow).toContain('[[ "$migration_job" == "$MIGRATION_JOB_NAME" ]]');
    const teardownPrecheckStart = workflow.indexOf("- name: Prove mutation leases are separated before teardown");
    const teardownDeleteStart = workflow.indexOf("- name: Delete exact SD-008 resource group and verify absence");
    const teardownPrecheck = workflow.slice(teardownPrecheckStart, teardownDeleteStart);
    expect(teardownPrecheck).toContain('app_exists=false');
    expect(teardownPrecheck).toContain(
      'if app_id="$(az containerapp show --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --query id -o tsv 2>/dev/null)"; then'
    );
    const existingAppBranch = teardownPrecheck.match(
      /if \[\[ "\$app_exists" == "true" \]\]; then([\s\S]*?)\n          fi/
    )?.[1];
    expect(existingAppBranch).toContain('[[ "$TRAFFIC_PRINCIPAL_OBJECT_ID" =~');
    expect(existingAppBranch).toContain('--assignee-object-id "$TRAFFIC_PRINCIPAL_OBJECT_ID"');
    expect(existingAppBranch).toContain('--scope "$app_id" --include-inherited');
    const teardownStepEnd = workflow.indexOf("\n      - name:", teardownDeleteStart + 1);
    const teardownDelete = workflow.slice(teardownDeleteStart, teardownStepEnd);
    expect(teardownDelete).toContain("Resource group identity or required cleanup tags do not match this SD-008 run");
    expect(teardownDelete).toContain("validate_authority teardown-delete");
    expect(teardownDelete).toContain('az group delete --name "$RESOURCE_GROUP" --yes --no-wait');
    expect(teardownDelete).toContain("validate_authority teardown-closure");
    expect(workflow.match(/refresh_scoped_authority\(\)/g)).toHaveLength(3);
    expect(workflow.match(/if ! refresh_scoped_authority "\$mutation"; then[\s\S]*?return 1[\s\S]*?fi\s+if ! node scripts\/render-sd008-azure-authority\.mjs/g)).toHaveLength(3);
    expect(workflow.match(/az account show --query user\.type -o tsv/g)).toHaveLength(3);
    expect(workflow.match(/az account get-access-token --resource https:\/\/management\.azure\.com\/ --query accessToken -o tsv/g)).toHaveLength(3);
    expect(workflow.match(/az role assignment list/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(workflow.match(/--include-inherited/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(workflow.match(/az role definition list --custom-role-only --scope "\$AUTHORITY_QUERY_SCOPE"/g)).toHaveLength(3);
    expect(workflow.match(/--scope "\$AUTHORITY_QUERY_SCOPE" --assignee-object-id/g)).toHaveLength(3);
    expect(workflow).not.toContain("graph.microsoft.com");
    expect(workflow).not.toContain("az ad sp show");
    expect(workflow).not.toContain("--all --include-inherited");
    expect(workflow).not.toMatch(/az role assignment list[\s\S]{0,200}?--all\b/);
    expect(workflow).not.toContain("az account show --query user.name");
    expect(workflow.match(/--decode-arm-token stdin/g)).toHaveLength(3);
    expect(workflow).toContain("--post-delete-teardown-assignment .tmp-sd008-post-delete-teardown-assignment.json");
    expect(workflow).toContain("post-delete teardown assignment absence could not be proven by exact ARM lookup");
    expect(workflow).toContain(
      '"https://management.azure.com${teardown_assignment_id}?api-version=2022-04-01"'
    );
    const logicalWorkflow = workflow.replace(/\\\r?\n\s*/g, " ");
    const curlCommands = logicalWorkflow
      .split(/\r?\n/)
      .filter((line) => /\bcurl\b/.test(line));
    for (const command of curlCommands) {
      const curlArgv = command.slice(command.indexOf("curl"));
      expect(curlArgv).not.toMatch(/(?:^|\s)-H(?:\s|=)/);
      expect(curlArgv).not.toMatch(/(?:^|\s)--header=/);
      expect(curlArgv).not.toMatch(/(?:^|\s)--header\s+(?!@-(?:\s|$))/);
      expect(curlArgv).not.toMatch(/Authorization:\s*Bearer/i);
      expect(curlArgv).not.toMatch(/\$(?:arm_)?access_token\b/);
    }
    expect(
      workflow.match(/printf 'Authorization: Bearer %s\\n' "\$(?:arm_)?access_token"/g)
    ).toHaveLength(5);
    expect(workflow.match(/--header @-/g)).toHaveLength(5);
    expect(workflow).not.toContain("--config -");
    for (const scopeCase of [
      '"provision-deployment")',
      '"provision-bootstrap-job-start")',
      '"provision-migration-job-start")',
      '"provision-app-update")'
    ]) {
      expect(workflow).toContain(scopeCase);
    }
    expect(workflow).toContain('Unknown provision authority mutation: ${mutation}');
    for (const binding of [
      '--azure-client-id "$AZURE_CLIENT_ID"',
      '--authenticated-azure-client-id "$AUTHENTICATED_AZURE_CLIENT_ID"',
      '--authenticated-principal-object-id "$AUTHENTICATED_PRINCIPAL_OBJECT_ID"',
      '--authenticated-principal-type "$AUTHENTICATED_PRINCIPAL_TYPE"',
      '--authenticated-tenant-id "$AUTHENTICATED_TENANT_ID"',
      "--live-role-assignments .tmp-sd008-live-role-assignments.json",
      "--live-role-definitions .tmp-sd008-live-role-definitions.json"
    ]) {
      expect(workflow.match(new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(3);
    }
    expect(workflow).not.toMatch(/az role assignment (create|delete)/);
    expect(workflow).not.toMatch(/gh (api|secret).*ENTRA_CLIENT_SECRET/);
  });

  it("guards rollback validation explicitly when errexit is disabled", async () => {
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");
    const restoreFunction = workflow.match(
      /          restore_traffic\(\) \{[\s\S]*?\n          \}/
    )?.[0];
    if (restoreFunction === undefined) {
      throw new Error("restore_traffic public seam is missing from the workflow.");
    }
    expect(restoreFunction).toMatch(
      /if ! validate_authority "\$mutation"; then[\s\S]*?return 1[\s\S]*?fi\s+if ! az containerapp ingress traffic set/
    );
    expect(restoreFunction).toMatch(
      /if ! az containerapp ingress traffic set[\s\S]*?return 1[\s\S]*?fi/
    );
    expect(restoreFunction).toMatch(
      /if ! baseline_weight="\$\(az containerapp ingress traffic show[\s\S]*?return 1[\s\S]*?fi/
    );
    expect(restoreFunction.indexOf("traffic_restored=true")).toBeGreaterThan(
      restoreFunction.indexOf('[[ "$baseline_weight" != "100" ]]')
    );
  });

  it("reuses one canonical image through publication and reports advisory OCI diagnostics", async () => {
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");

    expect(workflow).toContain("Build canonical image once and emit OCI diagnostics");
    expect(workflow).toContain("CANONICAL_IMAGE: signaldesk:sd008-canonical");
    expect(workflow).toContain("ADVISORY_IMAGE: signaldesk:sd008-advisory");
    expect(workflow.match(/docker buildx build \\/g)).toHaveLength(2);
    expect(workflow).toContain(
      '--output "type=oci,dest=.tmp/canonical.tar,rewrite-timestamp=true,name=$CANONICAL_IMAGE"'
    );
    expect(workflow).toContain(
      '--output "type=docker,name=$CANONICAL_IMAGE"'
    );
    expect(workflow).toContain(
      '--output "type=oci,dest=.tmp/advisory.tar,rewrite-timestamp=true,name=$ADVISORY_IMAGE"'
    );
    expect(workflow).toContain(
      '--output "type=docker,name=$ADVISORY_IMAGE"'
    );
    expect(workflow).not.toContain("docker load --input");
    expect(workflow).toContain('docker run --detach --name "$container_name"');
    expect(workflow).toContain('"http://127.0.0.1:${host_port}/api/v1/health/live"');
    expect(workflow).toContain("Canonical image liveness response was not live");
    expect(workflow).not.toContain('docker run --rm --entrypoint node "$CANONICAL_IMAGE" --version');
    expect(workflow).toContain("Canonical/advisory application-tree mismatch is blocking");
    expect(workflow).toContain(".tmp/reproducibility-diagnostics.json");
    expect(workflow).toContain(
      'reproducibilityClaim: advisoryFailure || !applicationTreeEqual ? "suppressed" : "advisory-only"'
    );
    expect(workflow).toContain('echo "::warning::Independent OCI bit identity failed; reproducibility claim is suppressed."');
    expect(workflow).toContain("image: signaldesk:sd008-canonical");
    expect(workflow).toContain('docker push "$PUBLICATION_TAG"');
    expect(workflow).toContain('[[ "$package_visibility" == "private" ]]');
    expect(workflow).toContain('docker buildx imagetools inspect "$PUBLICATION_TAG" --raw');
    expect(workflow).toContain('[[ "$canonical_config_digest" == "$registry_config_digest" ]]');
    expect(workflow).toContain("Attest exact privately published digest");
    expect(workflow).not.toContain("docker/build-push-action@");
    expect(workflow.indexOf("environment: staging-publication")).toBeLessThan(
      workflow.indexOf("environment: staging-provision")
    );
    expect(workflow).toContain("needs: [build-and-attest, staging-publication]");
    expect(workflow).toContain(
      "IMAGE_DIGEST: ${{ needs.build-and-attest.outputs.image-digest }}"
    );
  });

  it("reports non-mutating SD-008 adapter admission and runtime diagnostics", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["scripts/check-sd008-artifact-adapter.mjs", "--format", "json"],
      { cwd: process.cwd() }
    );
    const report = JSON.parse(stdout) as {
      claim: string;
      overall: string;
      checks: Array<{ id: string; status: string; evidenceKind: string }>;
    };
    const checks = new Map(report.checks.map((check) => [check.id, check]));

    expect(report.claim).toBe("local-adapter-evidence-only-not-provider-acceptance");
    expect(report.overall).toMatch(/^(pass|pass-with-blocked-capabilities)$/);
    expect(checks.get("reusable-workflow-permissions")).toMatchObject({
      status: "pass",
      evidenceKind: "local-static-contract"
    });
    expect(checks.get("workflow-graph-admission")).toMatchObject({
      status: "pass",
      evidenceKind: "local-static-contract"
    });
    expect(checks.get("oci-docker-exporter-compatibility")).toMatchObject({
      status: "pass",
      evidenceKind: "local-static-contract"
    });
    expect(checks.get("diagnostic-output-presence")).toMatchObject({
      status: "pass",
      evidenceKind: "local-static-contract"
    });
    expect(["pass", "blocked"]).toContain(checks.get("docker-load-run")?.status);
    expect(["pass", "blocked"]).toContain(checks.get("actionlint-admission")?.status);
    expect(["pass", "blocked"]).toContain(checks.get("jq-availability")?.status);

    const missingToolEnvironment = { ...process.env, PATH: "" };
    const localMissingTools = await execFileAsync(
      process.execPath,
      ["scripts/check-sd008-artifact-adapter.mjs", "--format", "json"],
      { cwd: process.cwd(), env: missingToolEnvironment }
    );
    const localMissingToolsReport = JSON.parse(localMissingTools.stdout) as {
      overall: string;
      checks: Array<{ id: string; status: string }>;
    };
    expect(localMissingToolsReport.overall).toBe("pass-with-blocked-capabilities");
    expect(localMissingToolsReport.checks).toContainEqual(
      expect.objectContaining({ id: "actionlint-admission", status: "blocked" })
    );

    let hostedStdout = "";
    try {
      const hosted = await execFileAsync(
        process.execPath,
        ["scripts/check-sd008-artifact-adapter.mjs", "--format", "json", "--mode", "hosted"],
        { cwd: process.cwd(), env: missingToolEnvironment }
      );
      hostedStdout = hosted.stdout;
    } catch (error) {
      hostedStdout = (error as { stdout?: string }).stdout ?? "";
    }
    const hostedReport = JSON.parse(hostedStdout) as {
      overall: string;
      checks: Array<{ id: string; status: string }>;
    };
    expect(hostedReport.overall).toBe("fail");
    expect(hostedReport.checks).toContainEqual(
      expect.objectContaining({ id: "actionlint-admission", status: "fail" })
    );
  });

  it("behaviorally rejects an unexpected write permission in the reusable caller", async () => {
    await mkdir(".tmp", { recursive: true });
    const directory = await mkdtemp(join(process.cwd(), ".tmp", "sd008-permission-fixture-"));
    try {
      const workflowPath = join(directory, "workflow.yml");
      const reusablePath = join(directory, "reusable.yml");
      const workflowSource = (await text(".github/workflows/sd008-azure-staging.yml")).replace(
        /\r?\n/g,
        "\r\n"
      );
      const permissionBlock =
        /    permissions:\r?\n      contents: read\r?\n    uses: \.\/\.github\/workflows\/hosted-review-gate\.yml/;
      expect(workflowSource).toMatch(permissionBlock);
      const workflow = workflowSource.replace(
        permissionBlock,
        "    permissions:\n      contents: read\n      packages: write\n    uses: ./.github/workflows/hosted-review-gate.yml"
      );
      expect(workflow).not.toBe(workflowSource);
      expect(workflow).toContain("packages: write");
      await Promise.all([
        writeFile(workflowPath, workflow),
        writeFile(reusablePath, await text(".github/workflows/hosted-review-gate.yml"))
      ]);

      let stdout = "";
      try {
        const result = await execFileAsync(
          process.execPath,
          [
            "scripts/check-sd008-artifact-adapter.mjs",
            "--format",
            "json",
            "--mode",
            "permissions-only",
            "--workflow",
            workflowPath,
            "--reusable",
            reusablePath
          ],
          { cwd: process.cwd() }
        );
        stdout = result.stdout;
      } catch (error) {
        stdout = (error as { stdout?: string }).stdout ?? "";
      }
      const report = JSON.parse(stdout) as {
        overall: string;
        checks: Array<{ id: string; status: string; detail: string }>;
      };
      expect(report.overall).toBe("fail");
      expect(report.checks).toContainEqual(
        expect.objectContaining({
          id: "reusable-workflow-permissions",
          status: "fail",
          detail: expect.stringContaining("packages:write")
        })
      );
    } finally {
      await rm(directory, { recursive: true });
    }
  });

  it("requires real canonical startup sanitized diagnostics and checked Docker cleanup", async () => {
    const workflow = await text(".github/workflows/sd008-azure-staging.yml");
    const reviewGate = await text(".github/workflows/hosted-review-gate.yml");
    const adapter = await text("scripts/check-sd008-artifact-adapter.mjs");
    const adapterDocs = (
      await Promise.all([
        text("docs/adr/0012-sd008-phase-proportional-artifact-evidence.md"),
        text("docs/plans/2026-08-23-sd008-rescue-artifact-gate.md"),
        text("docs/test-reproduction/SD-008-ADR-0012.md"),
        text("docs/evidence/SD-008-ADR-0012-local-rescue.md")
      ])
    ).join("\n");

    expect(workflow).not.toContain(
      'docker run --rm --entrypoint node "$CANONICAL_IMAGE" --version'
    );
    expect(workflow).toContain("Start canonical application and probe HTTP liveness");
    expect(workflow).toContain('docker run --detach --name "$container_name"');
    expect(workflow).toContain('"$CANONICAL_IMAGE"');
    expect(workflow).toContain("/api/v1/health/live");
    expect(workflow).toContain("trap preserve_status_and_cleanup EXIT");
    expect(workflow).toContain('docker logs "$container_name"');
    expect(workflow).toContain('if ! docker rm --force "$container_name"');
    expect(workflow).toContain("Canonical container cleanup failed");
    expect(workflow).not.toMatch(/docker rm --force[^\n]+\|\| true/);
    expect(workflow).toContain("secret_scan_status=0");
    expect(workflow).toContain('|| secret_scan_status=$?');
    expect(workflow).toContain(
      'node scripts/check-sd008-secret-scan-exit.mjs "$secret_scan_status"'
    );
    expect(workflow).not.toMatch(/!\s+docker run[^\n]*[\s\S]{0,300}?grep -R/);

    const diagnosticRetention = workflow.indexOf(
      "Retain independent-build diagnostics even when later gates fail"
    );
    expect(diagnosticRetention).toBeGreaterThan(
      workflow.indexOf("Build canonical image once and emit OCI diagnostics")
    );
    expect(diagnosticRetention).toBeLessThan(
      workflow.indexOf("Reject forbidden files and secret-shaped application content")
    );
    const diagnosticUpload = workflow.slice(
      diagnosticRetention,
      workflow.indexOf("Reject forbidden files and secret-shaped application content")
    );
    expect(diagnosticUpload).toContain("if: ${{ always() }}");
    expect(diagnosticUpload).toContain("if-no-files-found: error");
    expect(diagnosticUpload).toContain(".tmp/reproducibility-diagnostics.json");
    for (const forbiddenUpload of [
      ".tmp/canonical-application.log",
      ".tmp/canonical-container-id.txt",
      ".tmp/canonical-live.json",
      ".tmp/canonical-tree.txt",
      ".tmp/advisory-tree.txt",
      ".tmp/canonical-oci-config.json",
      ".tmp/canonical-oci-manifest.json",
      ".tmp/advisory-oci-config.json",
      ".tmp/advisory-oci-manifest.json"
    ]) {
      expect(diagnosticUpload).not.toContain(forbiddenUpload);
    }
    expect(workflow).toContain(".tmp/canonical-oci-config.json");
    expect(workflow).toContain(".tmp/canonical-oci-manifest.json");
    expect(workflow).toContain(".tmp/advisory-oci-config.json");
    expect(workflow).toContain(".tmp/advisory-oci-manifest.json");
    const allUploadBlocks = workflow
      .split("uses: actions/upload-artifact@")
      .slice(1)
      .map((block) => block.split(/\n\s{6}- name:/, 1)[0] ?? "")
      .join("\n");
    for (const forbiddenUpload of [
      ".tmp/canonical-application.log",
      ".tmp/canonical-oci-config.json",
      ".tmp/canonical-oci-manifest.json",
      ".tmp/advisory-oci-config.json",
      ".tmp/advisory-oci-manifest.json",
      ".tmp/registry-manifest.json"
    ]) {
      expect(allUploadBlocks).not.toContain(forbiddenUpload);
    }
    const diagnosticObject = workflow.slice(
      workflow.indexOf("function digestSummary"),
      workflow.indexOf('fs.writeFileSync(".tmp/canonical-oci-config.json"')
    );
    expect(diagnosticObject).toContain("canonicalSha256:");
    expect(diagnosticObject).toContain("advisorySha256:");
    expect(diagnosticObject).toContain('status: applicationTreeEqual ? "blocking-pass" : "blocking-failure"');
    expect(diagnosticObject).toContain("equal: applicationTreeEqual");
    expect(diagnosticObject).toContain("blockingMismatch: !applicationTreeEqual");
    expect(diagnosticObject).toContain("configDigest:");
    expect(diagnosticObject).toContain("manifestDigest:");
    expect(diagnosticObject).toContain("layerDigests:");
    expect(diagnosticObject).toContain("finalDigest:");
    expect(diagnosticObject).not.toContain("config: canonical.config");
    expect(diagnosticObject).not.toContain("manifest: canonical.manifest");
    const diagnosticWrite = workflow.indexOf(
      'fs.writeFileSync(".tmp/reproducibility-diagnostics.json"'
    );
    const blockingTreeExit = workflow.indexOf(
      "Canonical/advisory application-tree mismatch is blocking"
    );
    expect(diagnosticWrite).toBeGreaterThan(0);
    expect(blockingTreeExit).toBeGreaterThan(diagnosticWrite);
    expect(workflow).not.toContain(
      "diff --strip-trailing-cr .tmp/canonical-tree.txt .tmp/advisory-tree.txt"
    );

    expect(workflow).toContain('docker container ls --all --quiet --filter "name=^/${container_name}$"');
    expect(workflow).not.toContain('docker inspect "$container_name"');

    expect(adapter).toContain('"--network=none"');
    expect(adapter).toContain('"--builder", builderName');
    expect(adapter).toContain('["buildx", "create", "--name", builderName');
    expect(adapter).toContain('["buildx", "rm", "--force", builderName]');
    expect(adapter).toContain('"buildx", "ls", "--format", "{{.Name}}"');
    expect(adapter).not.toContain('command("cc"');
    expect(adapter).toContain("pinnedBaseImage");
    expect(adapter).toContain("type=docker,name=${imageReference},dest=${archivePath}");
    expect(adapter).toContain('["load", "--input", archivePath]');
    expect(adapter).toContain('["run", "--rm", imageReference]');
    expect(adapter).toContain("FROM ${pinnedBaseImage}");
    expect(adapter).toContain('["image", "rm", imageReference]');
    expect(adapter).toContain('["image", "ls", "--all", "--quiet", "--no-trunc", "--filter"');
    expect(adapter).toContain("Docker image cleanup failed");
    expect(adapter).toContain("Docker image cleanup could not be verified");
    expect(adapter).not.toContain('["image", "inspect", imageReference]');
    expect(adapter).not.toContain(
      '    command("docker", ["image", "rm", "--force", imageReference]);'
    );
    expect(adapterDocs).toContain("build steps use `--network=none`");
    expect(adapterDocs).toContain(
      "builder bootstrap and pinned-base resolution may perform read-only registry pulls",
    );
    for (const staleClaim of [
      "read-only Node adapter",
      "read-only provider adapter",
      "reads only local workflow files and executable availability",
      "caller-supplied local image",
      "inspects local workflow text and local executable availability only",
      "no repository, Git, provider, or network mutation",
      "temporary, network-disabled local Docker daemon mutation"
    ]) {
      expect(adapterDocs).not.toContain(staleClaim);
    }
    expect(reviewGate).toContain("SD-008 Docker archive adapter smoke");
    expect(reviewGate).toContain("ACTIONLINT_VERSION: 1.7.12");
    expect(reviewGate).toContain(
      "go install github.com/rhysd/actionlint/cmd/actionlint@v${ACTIONLINT_VERSION}"
    );
    expect(reviewGate).toContain(
      'installed_version="$("$install_dir/actionlint" -version | head -n 1)"'
    );
    expect(reviewGate).toContain('[[ "$installed_version" == "$ACTIONLINT_VERSION" ]]');
    expect(reviewGate).toContain("npm run sd008:artifact-adapter -- --format text --mode hosted");
    expect(reviewGate.indexOf("SD-008 Docker archive adapter smoke")).toBeLessThan(
      reviewGate.indexOf("- name: Foundation")
    );
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
    expect(workflow).toContain("name: sd008-reproducibility-diagnostics-${{ github.run_id }}");
    expect(workflow.match(/include-hidden-files: true/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
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
    const playwright = await text("playwright.config.ts");
    expect(workflow).toContain("scripts/get-entra-smoke-token.mjs");
    expect(workflow).toContain("vars.STAGING_SMOKE_CLIENT_ID");
    expect(workflow).toContain("vars.STAGING_SMOKE_PRINCIPAL_OBJECT_ID");
    const azureCliTokenCommands = workflow.match(/az account get-access-token[^\r\n]*/g) ?? [];
    expect(azureCliTokenCommands).toHaveLength(3);
    expect(
      azureCliTokenCommands.every((command) =>
        command.includes("--resource https://management.azure.com/")
      )
    ).toBe(true);
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
    expect(smoke).toContain(
      "/^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/"
    );
    expect(smoke).not.toContain("GITHUB_ENV");
    expect(smoke).not.toContain("GITHUB_OUTPUT");
    expect(smoke).not.toContain("add-mask");
    expect(workflow).not.toContain("SMOKE_ACCESS_TOKEN");
    expect(workflow).not.toContain("Acquire dedicated secretless");
    expect(workflow.match(/access_token="\$\(node scripts\/get-entra-smoke-token\.mjs\)"/g)).toHaveLength(2);
    expect(workflow).not.toMatch(/add-mask::\$access_token/);
    expect(workflow).not.toMatch(/(?:smoke|access)[_-]?token[^\r\n]*(?:>|tee|file)/i);
    expect(workflow).not.toContain('! grep -F -- "$access_token"');
    expect(workflow.match(/token_scan_status=0/g)).toHaveLength(2);
    expect(workflow.match(/\|\| token_scan_status=\$\?/g)).toHaveLength(2);
    expect(workflow).toContain(
      'node scripts/check-sd008-secret-scan-exit.mjs "$token_scan_status" provision-token'
    );
    expect(workflow).toContain(
      'node scripts/check-sd008-secret-scan-exit.mjs "$token_scan_status" traffic-token'
    );
    expect(playwright).toContain(
      'trace: authorization === undefined ? "retain-on-failure" : "off"'
    );

    const trafficStart = workflow.indexOf("- name: Shift staging traffic and restore prior healthy revision");
    const trafficEnd = workflow.indexOf("\n      - name:", trafficStart + 1);
    const trafficStep = workflow.slice(trafficStart, trafficEnd);
    const trafficLines = trafficStep.split(/\r?\n/);
    const acquisitionLine = trafficLines.findIndex((line) =>
      line.includes('access_token="$(node scripts/get-entra-smoke-token.mjs)"')
    );
    const validationEndLine = trafficLines.findIndex(
      (line, index) => index > acquisitionLine && line.trim() === "fi"
    );
    expect(acquisitionLine).toBeGreaterThan(-1);
    expect(validationEndLine).toBeGreaterThan(acquisitionLine);
    let tokenIsBound = true;
    const useAfterUnset: string[] = [];
    for (const line of trafficLines.slice(validationEndLine + 1)) {
      if (/\$(?:access_token\b|\{access_token(?:\}|[^}]*\}))/u.test(line) && !tokenIsBound) {
        useAfterUnset.push(line.trim());
      }
      if (/^\s*access_token=/u.test(line)) tokenIsBound = true;
      if (/^\s*unset\s+access_token\s*$/u.test(line)) tokenIsBound = false;
    }
    expect(useAfterUnset).toEqual([]);
    expect(tokenIsBound).toBe(false);
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
    expect(workflow).toContain('ingressCredentialState:"OWNER_MUST_VERIFY_REVOKED"');
    expect(workflow).toContain(
      'stagingProvisionEnvironmentSecretState:"OWNER_MUST_VERIFY_REMOVED"'
    );
    expect(workflow).toContain(
      'requiredRemovalOrder:["SignalDesk SD008 Teardown","ingress-credential","staging-provision:ENTRA_CLIENT_SECRET","SignalDesk SD008 Post Delete Verifier"]'
    );
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
