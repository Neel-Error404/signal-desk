import {
  constants,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt
} from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true })));
});

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((entry) => JSON.parse(canonicalJson(entry))));
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return JSON.stringify(
      Object.fromEntries(
        Object.keys(record)
          .sort()
          .map((key) => [key, JSON.parse(canonicalJson(record[key]))])
      )
    );
  }
  return JSON.stringify(value);
}

async function workspace(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "signaldesk-sd008-"));
  workspaces.push(directory);
  return directory;
}

function runNode(arguments_: string[]) {
  return spawnSync(process.execPath, arguments_, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true
  });
}

function completeTrace(): Record<string, unknown> {
  const eventTypes = [
    "protected-main-verified",
    "ordered-gate-passed",
    "artifact-published",
    "publication-approved",
    "provision-approved",
    "candidate-zero-traffic-verified",
    "traffic-approved",
    "rollback-verified",
    "evidence-exported",
    "teardown-approved",
    "resource-group-deleted",
    "absence-verified",
    "post-delete-verifier-removed"
  ];
  return {
    schemaVersion: 1,
    traceType: "actual-hosted-sd008",
    projectId: "signaldesk",
    workItem: "SD-008",
    repository: "Neel-Error404/signal-desk",
    commit: "a".repeat(40),
    runId: "123456789",
    lane1: {
      status: "verified-after-teardown",
      environment: "staging",
      production: false,
      syntheticDataOnly: true,
      resourceGroupDeleted: true,
      endpointAbsent: true,
      activeResources: 0,
      unexpectedChargesDetected: false,
      rawProviderArtifactsUploaded: false,
      exactIdentifiers: "owner-encrypted-only",
      cost: {
        calculationKind: "conservative-retail-upper-bound",
        currency: "USD",
        estimatedUsd: 0.91,
        ownerReviewThresholdUsd: 2,
        budgetAlertUsd: 5,
        actualBillingClaim: false
      },
      phasePacketSha256: {
        source: "1".repeat(64),
        build: "2".repeat(64),
        provision: "3".repeat(64),
        traffic: "4".repeat(64),
        teardown: "5".repeat(64)
      }
    },
    events: eventTypes.map((type, index) => ({
      sequence: index + 1,
      id: `sd008-event-${index + 1}`,
      type,
      occurredAt: new Date(Date.UTC(2026, 7, 20, 12, index)).toISOString(),
      evidenceSha256: (index + 10).toString(16).padStart(64, "0")
    })),
    learning: {
      source: "actual-redacted-hosted-sd008-trace-only",
      maximumCandidates: 1,
      candidateCreated: false,
      sd007DecisionReuse: false,
      targetMutation: false,
      promotionPacketOnly: true
    }
  };
}

describe("SD-008 public/private evidence export", () => {
  it("redacts public identifiers and encrypts the exact non-secret private packet", async () => {
    const directory = await workspace();
    const input = path.join(directory, "deployment.json");
    const publicOutput = path.join(directory, "public.json");
    const privateOutput = path.join(directory, "private-envelope.json");
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
    const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const subscriptionId = "11111111-2222-4333-8444-555555555555";
    const fqdn = "signaldesk.example.azurecontainerapps.io";
    await writeFile(
      input,
      JSON.stringify({
        subscriptionId,
        resourceId: `/subscriptions/${subscriptionId}/resourceGroups/rg-signaldesk-stg-cin`,
        appFqdn: fqdn,
        correlationId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        status: "Succeeded"
      })
    );
    const result = runNode([
      "scripts/sd008-evidence.mjs",
      "--phase",
      "provision",
      "--commit",
      "a".repeat(40),
      "--run-id",
      "123456789",
      "--created-at",
      "2026-08-20T12:00:00.000Z",
      "--public-key-base64",
      Buffer.from(publicPem).toString("base64"),
      "--public-output",
      publicOutput,
      "--private-envelope-output",
      privateOutput,
      "--input",
      `deployment=${input}`
    ]);
    expect(result.status, result.stderr).toBe(0);
    const publicPacket = JSON.parse(await readFile(publicOutput, "utf8")) as {
      payloads: { deployment: Record<string, unknown> };
      privacy: Record<string, unknown>;
    };
    const publicText = JSON.stringify(publicPacket);
    expect(publicText).not.toContain(subscriptionId);
    expect(publicText).not.toContain(fqdn);
    expect(publicPacket.payloads.deployment.subscriptionId).toMatchObject({
      redacted: true,
      kind: "subscriptionid"
    });
    expect(publicPacket.payloads.deployment.correlationId).toBe(
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    );
    expect(publicPacket.privacy).toMatchObject({
      secretScan: "passed",
      rawProviderArtifactsUploaded: false,
      sensitiveIdentifiers: "typed-sha256-bindings"
    });

    const envelope = JSON.parse(await readFile(privateOutput, "utf8")) as {
      metadata: Record<string, unknown>;
      encryptedKeyBase64: string;
      ivBase64: string;
      authenticationTagBase64: string;
      ciphertextBase64: string;
      plaintextSha256: string;
    };
    const dataKey = privateDecrypt(
      {
        key: privateKey,
        oaepHash: "sha256",
        padding: constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(envelope.encryptedKeyBase64, "base64")
    );
    const decipher = createDecipheriv(
      "aes-256-gcm",
      dataKey,
      Buffer.from(envelope.ivBase64, "base64")
    );
    decipher.setAAD(Buffer.from(canonicalJson(envelope.metadata), "utf8"));
    decipher.setAuthTag(Buffer.from(envelope.authenticationTagBase64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertextBase64, "base64")),
      decipher.final()
    ]).toString("utf8");
    expect(plaintext).toContain(subscriptionId);
    expect(plaintext).toContain(fqdn);
    expect(envelope.plaintextSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects secret-shaped provider evidence before writing either packet", async () => {
    const directory = await workspace();
    const input = path.join(directory, "unsafe.json");
    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
    await writeFile(input, JSON.stringify({ clientSecret: "do-not-export-this-secret" }));
    const result = runNode([
      "scripts/sd008-evidence.mjs",
      "--phase",
      "provision",
      "--commit",
      "a".repeat(40),
      "--run-id",
      "123456789",
      "--created-at",
      "2026-08-20T12:00:00.000Z",
      "--public-key-base64",
      Buffer.from(publicKey.export({ type: "spki", format: "pem" })).toString("base64"),
      "--public-output",
      path.join(directory, "public.json"),
      "--private-envelope-output",
      path.join(directory, "private.json"),
      "--input",
      `unsafe=${input}`
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Secret-shaped field is forbidden");
  });
});

describe("SD-008 learning trace eligibility", () => {
  it("accepts only the complete ordered teardown trace", async () => {
    const directory = await workspace();
    const tracePath = path.join(directory, "trace.json");
    await writeFile(tracePath, JSON.stringify(completeTrace()));
    const result = runNode(["scripts/validate-sd008-learning-trace.mjs", tracePath]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: "eligible-for-quarantined-learning",
      eventCount: 13,
      estimatedCostUsd: 0.91,
      actualBillingClaim: false
    });
    const driver = spawnSync(
      process.platform === "win32" ? "powershell.exe" : "pwsh",
      [
        "-NoProfile",
        "-File",
        "scripts/invoke-sd008-learning.ps1",
        "-Action",
        "validate",
        "-Trace",
        tracePath
      ],
      { cwd: process.cwd(), encoding: "utf8", windowsHide: true }
    );
    expect(driver.status, driver.stderr).toBe(0);
    expect(JSON.parse(driver.stdout)).toMatchObject({
      status: "eligible-for-quarantined-learning",
      target_mutation: false
    });
  });

  it("rejects missing teardown, reordered events, and private identifiers", async () => {
    const directory = await workspace();
    const cases = [
      {
        name: "missing-teardown",
        mutate(trace: Record<string, unknown>) {
          (trace.lane1 as Record<string, unknown>).resourceGroupDeleted = false;
        },
        expected: "Resource-group deletion evidence is required"
      },
      {
        name: "reordered",
        mutate(trace: Record<string, unknown>) {
          const events = trace.events as Array<Record<string, unknown>>;
          events[5]!.type = "traffic-approved";
        },
        expected: "must be candidate-zero-traffic-verified"
      },
      {
        name: "private-id",
        mutate(trace: Record<string, unknown>) {
          trace.clientId = "11111111-2222-4333-8444-555555555555";
        },
        expected: "Private field is forbidden"
      }
    ];
    for (const testCase of cases) {
      const trace = completeTrace();
      testCase.mutate(trace);
      const tracePath = path.join(directory, `${testCase.name}.json`);
      await writeFile(tracePath, JSON.stringify(trace));
      const result = runNode(["scripts/validate-sd008-learning-trace.mjs", tracePath]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(testCase.expected);
    }
  });
});

describe("SD-008 hosted trace assembly", () => {
  it("binds actual public packets, four approvals, the ordered gate, cost, and owner authority closure", async () => {
    const directory = await workspace();
    const commit = "a".repeat(40);
    const runId = "123456789";
    const writeJson = async (name: string, value: unknown) => {
      const file = path.join(directory, name);
      await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
      return file;
    };
    const phasePacket = (phase: string, createdAt: string, summary: Record<string, unknown>) => ({
      schemaVersion: 1,
      classification: "public-redacted",
      workItem: "SD-008",
      phase,
      commit,
      runId,
      createdAt,
      sourceManifest: [],
      payloads: { summary },
      privacy: {
        secretScan: "passed",
        rawProviderArtifactsUploaded: false,
        sensitiveIdentifiers: "typed-sha256-bindings",
        privatePacketEncryption: "AES-256-GCM+RSA-OAEP-SHA256",
        ownerPublicKeySha256: "1".repeat(64),
        privatePacketSha256: "2".repeat(64),
        privateEnvelopeSha256: "3".repeat(64)
      }
    });
    const source = await writeJson("source.json", {
      schemaVersion: 1,
      workItem: "SD-008",
      event: "protected-main-verified",
      repository: "Neel-Error404/signal-desk",
      ref: "refs/heads/main",
      commit,
      reviewedHead: commit,
      rulesetId: "21058424",
      requiredCheck: "signaldesk-ordered-review-gate",
      strict: true,
      bypassActors: 0,
      actor: "neel",
      runId,
      occurredAt: "2026-08-20T12:00:00.000Z"
    });
    const build = await writeJson("build.json", {
      schemaVersion: 1,
      workItem: "SD-008",
      event: "artifact-published",
      commit,
      runId,
      occurredAt: "2026-08-20T12:02:00.000Z",
      reproducibleBuilds: 2,
      secretScan: "passed"
    });
    const provision = await writeJson(
      "provision.json",
      phasePacket("provision", "2026-08-20T12:05:30.000Z", {
        candidateZeroTraffic: true,
        candidateZeroTrafficVerifiedAt: "2026-08-20T12:05:00.000Z",
        bootstrapJob: "Succeeded",
        migrationJob: "Succeeded",
        anonymousDenied: true,
        authorizedSmoke: true
      })
    );
    const traffic = await writeJson(
      "traffic.json",
      phasePacket("traffic", "2026-08-20T12:08:00.000Z", {
        trafficApproved: true,
        candidatePromoted: true,
        rollbackVerified: true,
        rollbackVerifiedAt: "2026-08-20T12:07:00.000Z",
        finalBaselineWeight: 100,
        finalCandidateWeight: 0,
        authorizedSmoke: true
      })
    );
    const teardownPacket = phasePacket("teardown", "2026-08-20T12:11:30.000Z", {
      resourceGroupDeleted: true,
      resourceGroupDeletedAt: "2026-08-20T12:10:00.000Z",
      activeResources: 0,
      endpointAbsent: true,
      absenceVerifiedAt: "2026-08-20T12:11:00.000Z",
      unexpectedChargesDetected: false
    }) as ReturnType<typeof phasePacket> & { payloads: Record<string, unknown> };
    teardownPacket.payloads.cost = {
      calculationKind: "conservative-retail-upper-bound",
      currency: "USD",
      estimatedUsd: 0.91,
      ownerReviewThresholdUsd: 2,
      budgetAlertUsd: 5,
      actualBillingClaim: false
    };
    const teardown = await writeJson("teardown.json", teardownPacket);
    const approvalsRaw = await writeJson(
      "approvals-raw.json",
      [
        ["staging-publication", "2026-08-20T12:03:00.000Z"],
        ["staging-provision", "2026-08-20T12:04:00.000Z"],
        ["staging-traffic", "2026-08-20T12:06:00.000Z"],
        ["staging-teardown", "2026-08-20T12:09:00.000Z"]
      ].map(([name, created_at]) => ({
        environments: [{ name }],
        state: "approved",
        user: { login: "neel" },
        created_at
      }))
    );
    const jobsRaw = await writeJson("jobs-raw.json", {
      jobs: [
        {
          name: "ordered-review-gate / signaldesk-ordered-review-gate",
          status: "completed",
          conclusion: "success",
          started_at: "2026-08-20T12:00:10.000Z",
          completed_at: "2026-08-20T12:01:00.000Z"
        }
      ]
    });
    const github = path.join(directory, "github.json");
    const normalized = runNode([
      "scripts/normalize-sd008-github-trace-inputs.mjs",
      "--repository",
      "Neel-Error404/signal-desk",
      "--run-id",
      runId,
      "--approvals",
      approvalsRaw,
      "--jobs",
      jobsRaw,
      "--output",
      github
    ]);
    expect(normalized.status, normalized.stderr).toBe(0);
    const closure = await writeJson("closure.json", {
      schemaVersion: 1,
      classification: "public-redacted",
      workItem: "SD-008",
      repository: "Neel-Error404/signal-desk",
      commit,
      runId,
      event: "post-delete-verifier-removed",
      roleName: "SignalDesk SD008 Post Delete Verifier",
      assignmentState: "absent",
      assignmentCount: 0,
      performedBy: "Neel",
      occurredAt: "2026-08-20T12:12:00.000Z",
      evidenceSha256: "4".repeat(64)
    });
    const output = path.join(directory, "trace.json");
    const assembled = runNode([
      "scripts/assemble-sd008-hosted-trace.mjs",
      "--source",
      source,
      "--build",
      build,
      "--provision",
      provision,
      "--traffic",
      traffic,
      "--teardown",
      teardown,
      "--github",
      github,
      "--authority-closure",
      closure,
      "--output",
      output
    ]);
    expect(assembled.status, assembled.stderr).toBe(0);
    const trace = JSON.parse(await readFile(output, "utf8")) as Record<string, unknown>;
    expect((trace.events as Array<Record<string, unknown>>).at(-1)).toMatchObject({
      sequence: 13,
      type: "post-delete-verifier-removed"
    });
    expect(trace.learning).toMatchObject({ candidateCreated: false, targetMutation: false });
  });
});

describe("SD-008 cost and authority packets", () => {
  it("calculates a bounded upper estimate without claiming provider billing", async () => {
    const directory = await workspace();
    const output = path.join(directory, "cost.json");
    const result = runNode([
      "scripts/calculate-sd008-session-cost.mjs",
      "--start",
      "2026-08-20T12:00:00.000Z",
      "--end",
      "2026-08-20T14:00:00.000Z",
      "--output",
      output
    ]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({
      calculationKind: "conservative-retail-upper-bound",
      durationHours: 2,
      actualBillingClaim: false,
      budgetAlertUsd: 5
    });
  });

  it("renders five non-mutating exact-scope role assignments", async () => {
    const directory = await workspace();
    const output = path.join(directory, "authority.json");
    const result = runNode([
      "scripts/render-sd008-azure-authority.mjs",
      "--subscription-id",
      "11111111-2222-4333-8444-555555555555",
      "--provision-principal-object-id",
      "21111111-2222-4333-8444-555555555555",
      "--traffic-principal-object-id",
      "31111111-2222-4333-8444-555555555555",
      "--teardown-principal-object-id",
      "41111111-2222-4333-8444-555555555555",
      "--resource-group",
      "rg-signaldesk-stg-cin",
      "--container-app",
      "signaldesk-stg-app",
      "--output",
      output
    ]);
    expect(result.status, result.stderr).toBe(0);
    const packet = JSON.parse(await readFile(output, "utf8")) as {
      appliesMutation: boolean;
      assignments: Array<Record<string, unknown>>;
    };
    expect(packet.appliesMutation).toBe(false);
    expect(packet.assignments).toHaveLength(5);
    expect(packet.assignments.find((item) => item.roleName === "SignalDesk SD008 Traffic")?.scope).toContain(
      "/providers/Microsoft.App/containerApps/signaldesk-stg-app"
    );
    const provision = packet.assignments.find(
      (item) => item.roleName === "SignalDesk SD008 Provision"
    ) as { conditionVersion?: string; condition?: string };
    expect(provision).toMatchObject({ conditionVersion: "2.0" });
    expect(provision.condition).toContain("4633458b-17de-408a-b874-0445c86b69e6");
    expect(provision.condition).toContain("ForAnyOfAllValues:GuidNotEquals");
    expect(provision.condition).toContain("21111111-2222-4333-8444-555555555555");
    expect(provision.condition).toContain(
      "Microsoft.Authorization/roleAssignments:PrincipalType"
    );
    expect(provision.condition).toContain("ServicePrincipal");
    expect(provision.condition).not.toContain("RoleAssignmentScope");
  });
});

describe("SD-008 dedicated smoke identity", () => {
  it("exchanges an environment-bound GitHub assertion for the exact ingress audience", async () => {
    const directory = await workspace();
    const githubEnvironment = path.join(directory, "github-env.txt");
    await writeFile(githubEnvironment, "");
    const tenantId = "11111111-2222-4333-8444-555555555555";
    const ingressClientId = "21111111-2222-4333-8444-555555555555";
    const smokeClientId = "31111111-2222-4333-8444-555555555555";
    const smokePrincipalId = "41111111-2222-4333-8444-555555555555";
    const jwt = (payload: Record<string, unknown>) =>
      `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(
        JSON.stringify(payload)
      ).toString("base64url")}.test-signature`;
    const now = Math.floor(Date.now() / 1000);
    const githubToken = jwt({
      iss: "https://token.actions.githubusercontent.com",
      aud: "api://AzureADTokenExchange",
      sub: "repo:Neel-Error404/signal-desk:environment:staging-provision"
    });
    const accessToken = jwt({
      aud: `api://${ingressClientId}`,
      tid: tenantId,
      azp: smokeClientId,
      oid: smokePrincipalId,
      nbf: now - 10,
      exp: now + 3600
    });
    let exchangeBody = "";
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url?.startsWith("/oidc?")) {
        expect(request.headers.authorization).toBe("Bearer synthetic-request-token");
        expect(new URL(request.url, "http://127.0.0.1").searchParams.get("audience")).toBe(
          "api://AzureADTokenExchange"
        );
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ value: githubToken }));
        return;
      }
      if (request.method === "POST" && request.url === "/entra") {
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
          exchangeBody += chunk;
        });
        request.on("end", () => {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ token_type: "Bearer", access_token: accessToken }));
        });
        return;
      }
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const port = (server.address() as AddressInfo).port;
    const child = spawn(process.execPath, ["scripts/get-entra-smoke-token.mjs"], {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "test",
        ACTIONS_ID_TOKEN_REQUEST_URL: `http://127.0.0.1:${port}/oidc`,
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: "synthetic-request-token",
        SD008_TEST_ENTRA_TOKEN_ENDPOINT: `http://127.0.0.1:${port}/entra`,
        AZURE_TENANT_ID: tenantId,
        ENTRA_CLIENT_ID: ingressClientId,
        STAGING_SMOKE_CLIENT_ID: smokeClientId,
        STAGING_SMOKE_PRINCIPAL_OBJECT_ID: smokePrincipalId,
        SD008_ENVIRONMENT: "staging-provision",
        GITHUB_ENV: githubEnvironment
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const exitCode = await new Promise<number | null>((resolve) => child.once("exit", resolve));
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    expect(exitCode, stderr).toBe(0);
    const request = new URLSearchParams(exchangeBody);
    expect(request.get("client_id")).toBe(smokeClientId);
    expect(request.get("scope")).toBe(`api://${ingressClientId}/.default`);
    expect(request.get("client_assertion")).toBe(githubToken);
    expect(stdout).toContain(`::add-mask::${accessToken}`);
    expect(JSON.parse(stdout.trim().split(/\r?\n/).at(-1) ?? "{}")).toMatchObject({
      status: "dedicated-smoke-token-ready",
      environment: "staging-provision"
    });
    expect(await readFile(githubEnvironment, "utf8")).toContain(accessToken);
  });
});
