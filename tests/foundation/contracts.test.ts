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
