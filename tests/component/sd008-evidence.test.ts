import {
  constants,
  createHash,
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

async function authoritySnapshots(
  directory: string,
  prefix: string,
  packet: {
    assignments: Array<Record<string, unknown>>;
    roleDefinitions: Array<Record<string, unknown>>;
  }
): Promise<{ assignments: string; definitions: string }> {
  const assignments = path.join(directory, `${prefix}-assignments.json`);
  const definitions = path.join(directory, `${prefix}-definitions.json`);
  await Promise.all([
    writeFile(
      assignments,
      JSON.stringify(packet.assignments.map((assignment) => ({
        id: assignment.assignmentId,
        principalId: assignment.principalObjectId,
        principalType: assignment.principalType,
        roleDefinitionId: assignment.roleDefinitionId,
        scope: assignment.scope,
        condition: assignment.condition ?? null,
        conditionVersion: assignment.conditionVersion ?? null
      })))
    ),
    writeFile(
      definitions,
      JSON.stringify(packet.roleDefinitions.map((definition) => ({
        name: definition.Name,
        roleName: definition.roleName,
        roleType: "CustomRole",
        permissions: [{
          actions: definition.Actions,
          notActions: definition.NotActions,
          dataActions: definition.DataActions,
          notDataActions: definition.NotDataActions
        }],
        assignableScopes: definition.AssignableScopes
      })))
    )
  ]);
  return { assignments, definitions };
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
    const buildProof = {
      schemaVersion: 1,
      workItem: "SD-008",
      event: "artifact-published",
      commit,
      runId,
      occurredAt: "2026-08-20T12:02:00.000Z",
      imageDigest: `sha256:${"5".repeat(64)}`,
      applicationTreeSha256: "6".repeat(64),
      sbomSha256: "a".repeat(64),
      vulnerabilityReportSha256: "b".repeat(64),
      canonicalDeployableBuilds: 1,
      independentAdvisoryBuilds: 1,
      publicationVisibility: "private",
      reproducibility: {
        schemaVersion: 1,
        status: "advisory-match",
        applicationTree: {
          canonicalSha256: "6".repeat(64),
          advisorySha256: "6".repeat(64),
          equal: true,
          status: "blocking-pass"
        },
        blockingMismatch: false,
        reproducibilityClaim: "advisory-only",
        canonical: {
          configDigest: `sha256:${"7".repeat(64)}`,
          manifestDigest: `sha256:${"8".repeat(64)}`,
          layerDigests: [`sha256:${"9".repeat(64)}`],
          finalDigest: `sha256:${"8".repeat(64)}`
        },
        advisory: {
          configDigest: `sha256:${"7".repeat(64)}`,
          manifestDigest: `sha256:${"8".repeat(64)}`,
          layerDigests: [`sha256:${"9".repeat(64)}`],
          finalDigest: `sha256:${"8".repeat(64)}`
        },
        comparisons: {
          configBitIdentical: true,
          manifestBitIdentical: true,
          layersIdentical: true,
          finalDigestIdentical: true
        }
      },
      secretScan: "passed"
    };
    const build = await writeJson("build.json", buildProof);
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
    const closureProof = {
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
      teardownRoleAssignmentState: "absent",
      teardownRoleAssignmentCount: 0,
      teardownRoleRemovedAt: "2026-08-20T12:11:20.000Z",
      ingressCredentialState: "revoked",
      ingressCredentialRevokedAt: "2026-08-20T12:11:30.000Z",
      stagingProvisionEnvironmentSecretState: "removed",
      stagingProvisionEnvironmentSecretRemovedAt: "2026-08-20T12:11:40.000Z",
      requiredRemovalOrder: [
        "SignalDesk SD008 Teardown",
        "ingress-credential",
        "staging-provision:ENTRA_CLIENT_SECRET",
        "SignalDesk SD008 Post Delete Verifier"
      ],
      performedBy: "Neel",
      occurredAt: "2026-08-20T12:12:00.000Z",
      evidenceSha256: "4".repeat(64)
    };
    const closure = await writeJson("closure.json", closureProof);
    const assemble = (output: string) =>
      runNode([
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
    const output = path.join(directory, "trace.json");
    const assembled = assemble(output);
    expect(assembled.status, assembled.stderr).toBe(0);
    const trace = JSON.parse(await readFile(output, "utf8")) as Record<string, unknown>;
    expect((trace.events as Array<Record<string, unknown>>).at(-1)).toMatchObject({
      sequence: 13,
      type: "post-delete-verifier-removed"
    });
    expect(trace.learning).toMatchObject({ candidateCreated: false, targetMutation: false });

    const invalidClosures = [
      {
        name: "missing-teardown-removal",
        value: { ...structuredClone(closureProof), teardownRoleAssignmentState: "present" },
        expected: "Teardown authority remains assigned"
      },
      {
        name: "credential-not-revoked",
        value: { ...structuredClone(closureProof), ingressCredentialState: "active" },
        expected: "Ingress credential remains active"
      },
      {
        name: "environment-secret-not-removed",
        value: {
          ...structuredClone(closureProof),
          stagingProvisionEnvironmentSecretState: "present"
        },
        expected: "staging-provision Environment secret remains present"
      },
      {
        name: "verifier-not-last",
        value: {
          ...structuredClone(closureProof),
          teardownRoleRemovedAt: "2026-08-20T12:12:30.000Z"
        },
        expected: "Post-delete verifier was not removed last"
      }
    ];
    for (const testCase of invalidClosures) {
      await writeFile(closure, JSON.stringify(testCase.value));
      const rejected = assemble(path.join(directory, `${testCase.name}-trace.json`));
      expect(rejected.status).not.toBe(0);
      expect(rejected.stderr).toContain(testCase.expected);
    }
    await writeFile(closure, JSON.stringify(closureProof));

    const advisoryFailure = structuredClone(buildProof);
    advisoryFailure.reproducibility.advisory.configDigest = `sha256:${"0".repeat(64)}`;
    advisoryFailure.reproducibility.comparisons.configBitIdentical = false;
    advisoryFailure.reproducibility.status = "advisory-failure";
    advisoryFailure.reproducibility.reproducibilityClaim = "suppressed";
    await writeFile(build, JSON.stringify(advisoryFailure));
    const acceptedMismatch = assemble(path.join(directory, "advisory-failure-trace.json"));
    expect(acceptedMismatch.status, acceptedMismatch.stderr).toBe(0);

    const invalidBuildProofs = [
      {
        name: "legacy-build-proof",
        proof: {
          schemaVersion: 1,
          workItem: "SD-008",
          event: "artifact-published",
          commit,
          runId,
          occurredAt: "2026-08-20T12:02:00.000Z",
          reproducibleBuilds: 2,
          secretScan: "passed"
        },
        expected: "Build proof contains deprecated reproducibleBuilds."
      },
      {
        name: "mixed-legacy-current-build-proof",
        proof: {
          ...structuredClone(buildProof),
          reproducibleBuilds: 2
        },
        expected: "Build proof contains deprecated reproducibleBuilds."
      },
      {
        name: "invalid-build-counts",
        proof: {
          ...structuredClone(buildProof),
          canonicalDeployableBuilds: 2
        },
        expected: "Build proof is incomplete."
      },
      {
        name: "missing-sbom-digest",
        proof: {
          ...structuredClone(buildProof),
          sbomSha256: undefined
        },
        expected: "Build proof SBOM digest is invalid."
      },
      {
        name: "malformed-sbom-digest",
        proof: {
          ...structuredClone(buildProof),
          sbomSha256: "not-a-sha256"
        },
        expected: "Build proof SBOM digest is invalid."
      },
      {
        name: "missing-vulnerability-report-digest",
        proof: {
          ...structuredClone(buildProof),
          vulnerabilityReportSha256: undefined
        },
        expected: "Build proof vulnerability report digest is invalid."
      },
      {
        name: "malformed-vulnerability-report-digest",
        proof: {
          ...structuredClone(buildProof),
          vulnerabilityReportSha256: "not-a-sha256"
        },
        expected: "Build proof vulnerability report digest is invalid."
      },
      {
        name: "blocking-tree-mismatch",
        proof: {
          ...structuredClone(buildProof),
          reproducibility: {
            ...structuredClone(buildProof.reproducibility),
            applicationTree: {
              ...structuredClone(buildProof.reproducibility.applicationTree),
              advisorySha256: "0".repeat(64),
              equal: false,
              status: "blocking-failure"
            },
            blockingMismatch: true,
            reproducibilityClaim: "suppressed"
          }
        },
        expected: "Build proof does not establish blocking application-tree equality."
      },
      {
        name: "digest-mismatch-false-comparison",
        proof: {
          ...structuredClone(buildProof),
          reproducibility: {
            ...structuredClone(buildProof.reproducibility),
            advisory: {
              ...structuredClone(buildProof.reproducibility.advisory),
              configDigest: `sha256:${"0".repeat(64)}`
            }
          }
        },
        expected: "Build OCI comparison booleans do not match the digest evidence."
      },
      {
        name: "oci-mismatch-false-success",
        proof: {
          ...structuredClone(buildProof),
          reproducibility: {
            ...structuredClone(buildProof.reproducibility),
            advisory: {
              ...structuredClone(buildProof.reproducibility.advisory),
              configDigest: `sha256:${"0".repeat(64)}`
            },
            comparisons: {
              ...structuredClone(buildProof.reproducibility.comparisons),
              configBitIdentical: false
            }
          }
        },
        expected: "OCI mismatch must be advisory-failure with a suppressed reproducibility claim."
      },
      {
        name: "oci-match-false-failure",
        proof: {
          ...structuredClone(buildProof),
          reproducibility: {
            ...structuredClone(buildProof.reproducibility),
            status: "advisory-failure",
            reproducibilityClaim: "suppressed"
          }
        },
        expected: "OCI match cannot claim anything stronger than advisory-only."
      }
    ];
    for (const testCase of invalidBuildProofs) {
      await writeFile(build, JSON.stringify(testCase.proof));
      const rejected = assemble(path.join(directory, `${testCase.name}-trace.json`));
      expect(rejected.status).not.toBe(0);
      expect(rejected.stderr).toContain(testCase.expected);
    }
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

  it("renders and validates one exact phase-scoped JIT authority packet", async () => {
    const directory = await workspace();
    const output = path.join(directory, "authority.json");
    const result = runNode([
      "scripts/render-sd008-azure-authority.mjs",
      "--phase",
      "traffic",
      "--subscription-id",
      "11111111-2222-4333-8444-555555555555",
      "--traffic-principal-object-id",
      "31111111-2222-4333-8444-555555555555",
      "--azure-client-id",
      "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id",
      "81111111-2222-4333-8444-555555555555",
      "--resource-group",
      "rg-signaldesk-stg-cin",
      "--container-app",
      "signaldesk-stg-app",
      "--source-commit",
      "a".repeat(40),
      "--image-digest",
      `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest",
      "c".repeat(64),
      "--owner-approval-reference",
      "github-environment:staging-traffic:deployment-123",
      "--owner-approval-digest",
      "d".repeat(64),
      "--owner-approved-at",
      "2026-08-23T10:00:00.000Z",
      "--session-run-id",
      "123456789",
      "--issued-at",
      "2026-08-23T10:01:00.000Z",
      "--expires-at",
      "2026-08-23T12:01:00.000Z",
      "--output",
      output
    ]);
    expect(result.status, result.stderr).toBe(0);
    const packet = JSON.parse(await readFile(output, "utf8")) as {
      appliesMutation: boolean;
      requestedPhase: string;
      sourceCommit: string;
      imageDigest: string;
      publicationEvidenceDigest: string;
      sessionRunId: string;
      ownerApproval: Record<string, unknown>;
      authorityWindow: Record<string, unknown>;
      assignments: Array<Record<string, unknown>>;
      roleDefinitions: Array<Record<string, unknown>>;
      authenticatedIdentity: Record<string, unknown>;
    };
    expect(packet.appliesMutation).toBe(false);
    expect(packet.requestedPhase).toBe("traffic");
    expect(packet.sourceCommit).toBe("a".repeat(40));
    expect(packet.imageDigest).toBe(`sha256:${"b".repeat(64)}`);
    expect(packet.publicationEvidenceDigest).toBe("c".repeat(64));
    expect(packet.sessionRunId).toBe("123456789");
    expect(packet.authenticatedIdentity).toEqual({
      clientId: "51111111-2222-4333-8444-555555555555",
      principalObjectId: "31111111-2222-4333-8444-555555555555",
      tenantId: "81111111-2222-4333-8444-555555555555",
      principalType: "ServicePrincipal"
    });
    expect(packet.ownerApproval).toEqual({
      reference: "github-environment:staging-traffic:deployment-123",
      digest: "d".repeat(64),
      approvedAt: "2026-08-23T10:00:00.000Z",
      environment: "staging-traffic"
    });
    expect(packet.authorityWindow).toMatchObject({
      issuedAt: "2026-08-23T10:01:00.000Z",
      expiresAt: "2026-08-23T12:01:00.000Z",
      maximumLeaseMinutes: 480,
      providerEnforcedExpiry: false,
      expiryEvidence: "procedural"
    });
    expect(packet.assignments).toHaveLength(2);
    expect(packet.assignments.find((item) => item.roleName === "SignalDesk SD008 Traffic")?.scope).toContain(
      "/providers/Microsoft.App/containerApps/signaldesk-stg-app"
    );

    const snapshots = await authoritySnapshots(directory, "traffic", packet);
    const validate = runNode([
      "scripts/render-sd008-azure-authority.mjs",
      "--validate-packet",
      output,
      "--packet-sha256",
      createHash("sha256").update(await readFile(output)).digest("hex"),
      "--phase",
      "traffic",
      "--mutation",
      "traffic-promotion",
      "--now",
      "2026-08-23T10:30:00.000Z",
      "--subscription-id",
      "11111111-2222-4333-8444-555555555555",
      "--traffic-principal-object-id",
      "31111111-2222-4333-8444-555555555555",
      "--azure-client-id",
      "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id",
      "81111111-2222-4333-8444-555555555555",
      "--authenticated-azure-client-id",
      "51111111-2222-4333-8444-555555555555",
      "--authenticated-principal-object-id",
      "31111111-2222-4333-8444-555555555555",
      "--authenticated-principal-type",
      "servicePrincipal",
      "--authenticated-tenant-id",
      "81111111-2222-4333-8444-555555555555",
      "--live-role-assignments", snapshots.assignments,
      "--live-role-definitions", snapshots.definitions,
      "--resource-group",
      "rg-signaldesk-stg-cin",
      "--container-app",
      "signaldesk-stg-app",
      "--source-commit",
      "a".repeat(40),
      "--image-digest",
      `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest",
      "c".repeat(64),
      "--session-run-id",
      "123456789",
      "--expected-owner-approval-reference",
      "github-environment:staging-traffic:deployment-123",
      "--expected-owner-approval-digest",
      "d".repeat(64),
      "--expected-owner-approved-at",
      "2026-08-23T10:00:00.000Z"
    ]);
    expect(validate.status, validate.stderr).toBe(0);
    expect(JSON.parse(validate.stdout)).toMatchObject({
      status: "valid-authority-window",
      phase: "traffic",
      mutation: "traffic-promotion",
      minimumRemainingMinutes: 45
    });

    const approvalValidationArguments = [
      "scripts/render-sd008-azure-authority.mjs",
      "--validate-packet", output,
      "--packet-sha256", createHash("sha256").update(await readFile(output)).digest("hex"),
      "--phase", "traffic",
      "--mutation", "traffic-promotion",
      "--now", "2026-08-23T10:30:00.000Z",
      "--subscription-id", "11111111-2222-4333-8444-555555555555",
      "--traffic-principal-object-id", "31111111-2222-4333-8444-555555555555",
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--authenticated-azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--authenticated-principal-object-id", "31111111-2222-4333-8444-555555555555",
      "--authenticated-principal-type", "servicePrincipal",
      "--authenticated-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--live-role-assignments", snapshots.assignments,
      "--live-role-definitions", snapshots.definitions,
      "--resource-group", "rg-signaldesk-stg-cin",
      "--container-app", "signaldesk-stg-app",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--session-run-id", "123456789",
      "--expected-owner-approval-reference", "github-environment:staging-traffic:deployment-123",
      "--expected-owner-approval-digest", "d".repeat(64),
      "--expected-owner-approved-at", "2026-08-23T10:00:00.000Z"
    ];
    const approvalMismatches: Array<[string, string, string]> = [
      ["github-environment:staging-traffic:deployment-123", "github-environment:staging-traffic:other", "reference"],
      ["d".repeat(64), "e".repeat(64), "digest"],
      ["2026-08-23T10:00:00.000Z", "2026-08-23T09:59:59.000Z", "time"]
    ];
    for (const [original, replacement, error] of approvalMismatches) {
      const mismatchedApproval = runNode(
        approvalValidationArguments.map((value) => value === original ? replacement : value)
      );
      expect(mismatchedApproval.status).not.toBe(0);
      expect(mismatchedApproval.stderr).toContain(`owner approval ${error} binding mismatch`);
    }

    for (const [flag, replacement, error] of [
      ["--authenticated-azure-client-id", "61111111-2222-4333-8444-555555555555", "Azure client ID"],
      ["--authenticated-principal-object-id", "71111111-2222-4333-8444-555555555555", "principal object ID"]
    ] as Array<[string, string, string]>) {
      const index = approvalValidationArguments.indexOf(flag);
      const mismatchedIdentity = runNode([
        ...approvalValidationArguments.slice(0, index + 1),
        replacement,
        ...approvalValidationArguments.slice(index + 2)
      ]);
      expect(mismatchedIdentity.status).not.toBe(0);
      expect(mismatchedIdentity.stderr).toContain(`authenticated ${error} binding mismatch`);
    }
    const protectedClientIndex = approvalValidationArguments.indexOf("--azure-client-id");
    const protectedClientMismatch = runNode([
      ...approvalValidationArguments.slice(0, protectedClientIndex + 1),
      "61111111-2222-4333-8444-555555555555",
      ...approvalValidationArguments.slice(protectedClientIndex + 2)
    ]);
    expect(protectedClientMismatch.status).not.toBe(0);
    expect(protectedClientMismatch.stderr).toContain("azureClientId binding mismatch");

    const firstLiveCheck = runNode(approvalValidationArguments);
    expect(firstLiveCheck.status, firstLiveCheck.stderr).toBe(0);
    const expectedAssignments = JSON.parse(await readFile(snapshots.assignments, "utf8")) as Array<Record<string, unknown>>;
    await writeFile(snapshots.assignments, JSON.stringify([
       ...expectedAssignments,
       {
         id: "/subscriptions/11111111-2222-4333-8444-555555555555/providers/Microsoft.Authorization/roleAssignments/91111111-2222-4333-8444-555555555555",
         principalId: "31111111-2222-4333-8444-555555555555",
        principalType: "ServicePrincipal",
        roleDefinitionId: "/subscriptions/11111111-2222-4333-8444-555555555555/providers/Microsoft.Authorization/roleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
        scope: "/subscriptions/11111111-2222-4333-8444-555555555555",
        condition: null,
        conditionVersion: null
      }
    ]));
    const authorityIntroducedBetweenMutations = runNode(approvalValidationArguments);
    expect(authorityIntroducedBetweenMutations.status).not.toBe(0);
    expect(authorityIntroducedBetweenMutations.stderr).toContain(
      "live authority assignments do not exactly match the phase packet"
    );
    await writeFile(snapshots.assignments, JSON.stringify(expectedAssignments));

    const expectedDefinitionsText = await readFile(snapshots.definitions, "utf8");
    const expectedDefinitions = JSON.parse(expectedDefinitionsText) as Array<{
      permissions: Array<{ actions: string[] }>;
    }>;
    expectedDefinitions[0]?.permissions[0]?.actions.push("Microsoft.Authorization/*");
    await writeFile(snapshots.definitions, JSON.stringify(expectedDefinitions));
    const driftedDefinition = runNode(approvalValidationArguments);
    expect(driftedDefinition.status).not.toBe(0);
    expect(driftedDefinition.stderr).toContain("live custom role definition drift");

    await writeFile(snapshots.definitions, expectedDefinitionsText);
  });

  it("fails rollback closed when the Azure mutation or provider reread fails under set +e", async () => {
    const workflow = await readFile(".github/workflows/sd008-azure-staging.yml", "utf8");
    const restoreFunction = workflow.match(
      /          restore_traffic\(\) \{[\s\S]*?\n          \}/
    )?.[0];
    expect(restoreFunction).toBeDefined();
    const bashExecutable = process.platform === "win32"
      ? "C:\\Program Files\\Git\\bin\\bash.exe"
      : "bash";
    const exercise = (setStatus: number, rereadStatus: number) => spawnSync(
      bashExecutable,
      [
        "-c",
        `set +e
validate_authority() { return 0; }
az() {
  if [[ "$1 $2 $3 $4" == "containerapp ingress traffic set" ]]; then
    return "$SET_STATUS"
  fi
  if [[ "$1 $2 $3 $4" == "containerapp ingress traffic show" ]]; then
    if [[ "$REREAD_STATUS" -ne 0 ]]; then return "$REREAD_STATUS"; fi
    printf '100\\n'
    return 0
  fi
  return 99
}
RESOURCE_GROUP=rg-signaldesk-stg-cin
APP_NAME=signaldesk-stg-app
BASELINE_REVISION=baseline
CANDIDATE_REVISION=candidate
traffic_restored=false
${restoreFunction}
restore_traffic traffic-rollback
status=$?
printf 'status=%s restored=%s\\n' "$status" "$traffic_restored"`
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        windowsHide: true,
        env: {
          ...process.env,
          SET_STATUS: String(setStatus),
          REREAD_STATUS: String(rereadStatus)
        }
      }
    );

    const mutationFailure = exercise(23, 0);
    expect(mutationFailure.status, mutationFailure.stderr).toBe(0);
    expect(mutationFailure.stdout).toContain("status=1 restored=false");
    const rereadFailure = exercise(0, 29);
    expect(rereadFailure.status, rereadFailure.stderr).toBe(0);
    expect(rereadFailure.stdout).toContain("status=1 restored=false");
  });

  it("selects the exact provision resource scope and rejects unknown mutations", async () => {
    const directory = await workspace();
    const workflow = await readFile(".github/workflows/sd008-azure-staging.yml", "utf8");
    const refreshFunction = workflow.match(
      /          refresh_scoped_authority\(\) \{[\s\S]*?\n          \}/
    )?.[0]?.replaceAll(
      "${{ vars.AZURE_SUBSCRIPTION_ID }}",
      "11111111-2222-4333-8444-555555555555"
    );
    expect(refreshFunction).toBeDefined();
    const bashExecutable = process.platform === "win32"
      ? "C:\\Program Files\\Git\\bin\\bash.exe"
      : "bash";
    const exercise = (mutation: string) => spawnSync(
      bashExecutable,
      [
        "-c",
        `set +e
az() {
  printf '%s\n' "$*" >> commands.log
  if [[ "$1 $2" == "account show" ]]; then printf 'servicePrincipal\n'; return 0; fi
  if [[ "$1 $2" == "account get-access-token" ]]; then printf 'token\n'; return 0; fi
  if [[ "$1 $2 $3" == "containerapp job show" ]]; then
    if [[ "$*" == *"--name signaldesk-stg-dbinit"* ]]; then
      printf '/subscriptions/11111111-2222-4333-8444-555555555555/resourceGroups/rg-signaldesk-stg-cin/providers/Microsoft.App/jobs/signaldesk-stg-dbinit\n'
      return 0
    fi
    if [[ "$*" == *"--name signaldesk-stg-migrate"* ]]; then
      printf '/subscriptions/11111111-2222-4333-8444-555555555555/resourceGroups/rg-signaldesk-stg-cin/providers/Microsoft.App/jobs/signaldesk-stg-migrate\n'
      return 0
    fi
  fi
  if [[ "$1 $2 $3" == "containerapp show --resource-group" ]]; then
    printf '/subscriptions/11111111-2222-4333-8444-555555555555/resourceGroups/rg-signaldesk-stg-cin/providers/Microsoft.App/containerApps/signaldesk-stg-app\n'
    return 0
  fi
  if [[ "$1 $2 $3" == "role assignment list" || "$1 $2 $3" == "role definition list" ]]; then
    printf '[]\n'
    return 0
  fi
  return 91
}
node() {
  printf '{"clientId":"51111111-2222-4333-8444-555555555555","principalObjectId":"21111111-2222-4333-8444-555555555555","tenantId":"81111111-2222-4333-8444-555555555555","principalType":"ServicePrincipal"}\n'
}
jq() {
  printf '51111111-2222-4333-8444-555555555555\t21111111-2222-4333-8444-555555555555\t81111111-2222-4333-8444-555555555555\tServicePrincipal\n'
}
RESOURCE_GROUP=rg-signaldesk-stg-cin
PROVISION_PRINCIPAL_OBJECT_ID=21111111-2222-4333-8444-555555555555
bootstrap_job=signaldesk-stg-dbinit
migration_job=signaldesk-stg-migrate
app_name=signaldesk-stg-app
: > commands.log
${refreshFunction}
refresh_scoped_authority "$MUTATION"
status=$?
printf 'status=%s scope=%s\n' "$status" "\${AUTHORITY_QUERY_SCOPE:-unset}"
cat commands.log
exit "$status"`
      ],
      {
        cwd: directory,
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, MUTATION: mutation }
      }
    );

    const subscription = "/subscriptions/11111111-2222-4333-8444-555555555555";
    for (const [mutation, scope] of [
      ["provision-deployment", `${subscription}/resourceGroups/rg-signaldesk-stg-cin`],
      ["provision-bootstrap-job-start", `${subscription}/resourceGroups/rg-signaldesk-stg-cin/providers/Microsoft.App/jobs/signaldesk-stg-dbinit`],
      ["provision-migration-job-start", `${subscription}/resourceGroups/rg-signaldesk-stg-cin/providers/Microsoft.App/jobs/signaldesk-stg-migrate`],
      ["provision-app-update", `${subscription}/resourceGroups/rg-signaldesk-stg-cin/providers/Microsoft.App/containerApps/signaldesk-stg-app`]
    ] as Array<[string, string]>) {
      const result = exercise(mutation);
      expect(result.status, `${mutation}: ${result.stderr}`).toBe(0);
      expect(result.stdout).toContain(`status=0 scope=${scope}`);
      expect(result.stdout).toContain(`role assignment list --scope ${scope}`);
      expect(result.stdout).toContain(`role definition list --custom-role-only --scope ${scope}`);
    }
    const unknown = exercise("provision-unknown");
    expect(unknown.status).not.toBe(0);
    expect(unknown.stderr).toContain("Unknown provision authority mutation");
    expect(unknown.stdout).not.toContain("account get-access-token");
  });

  it("rejects an extra provision assignment at the exact child mutation scope", async () => {
    const directory = await workspace();
    const output = path.join(directory, "provision-authority.json");
    const rendered = runNode([
      "scripts/render-sd008-azure-authority.mjs",
      "--phase", "provision",
      "--subscription-id", "11111111-2222-4333-8444-555555555555",
      "--provision-principal-object-id", "21111111-2222-4333-8444-555555555555",
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--resource-group", "rg-signaldesk-stg-cin",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--owner-approval-reference", "github-environment:staging-provision:deployment-123",
      "--owner-approval-digest", "d".repeat(64),
      "--owner-approved-at", "2026-08-23T10:00:00.000Z",
      "--session-run-id", "123456789",
      "--issued-at", "2026-08-23T10:01:00.000Z",
      "--expires-at", "2026-08-23T12:01:00.000Z",
      "--output", output
    ]);
    expect(rendered.status, rendered.stderr).toBe(0);
    const bytes = await readFile(output);
    const packet = JSON.parse(bytes.toString("utf8")) as {
      assignments: Array<Record<string, unknown>>;
      roleDefinitions: Array<Record<string, unknown>>;
    };
    const snapshots = await authoritySnapshots(directory, "provision-child", packet);
    const assignments = JSON.parse(await readFile(snapshots.assignments, "utf8")) as Array<Record<string, unknown>>;
    assignments.push({
      id: "/subscriptions/11111111-2222-4333-8444-555555555555/resourceGroups/rg-signaldesk-stg-cin/providers/Microsoft.App/jobs/signaldesk-stg-migrate/providers/Microsoft.Authorization/roleAssignments/91111111-2222-4333-8444-555555555555",
      principalId: "21111111-2222-4333-8444-555555555555",
      principalType: "ServicePrincipal",
      roleDefinitionId: "/subscriptions/11111111-2222-4333-8444-555555555555/providers/Microsoft.Authorization/roleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
      scope: "/subscriptions/11111111-2222-4333-8444-555555555555/resourceGroups/rg-signaldesk-stg-cin/providers/Microsoft.App/jobs/signaldesk-stg-migrate",
      condition: null,
      conditionVersion: null
    });
    await writeFile(snapshots.assignments, JSON.stringify(assignments));
    const rejected = runNode([
      "scripts/render-sd008-azure-authority.mjs",
      "--validate-packet", output,
      "--packet-sha256", createHash("sha256").update(bytes).digest("hex"),
      "--phase", "provision",
      "--mutation", "provision-migration-job-start",
      "--now", "2026-08-23T10:30:00.000Z",
      "--subscription-id", "11111111-2222-4333-8444-555555555555",
      "--provision-principal-object-id", "21111111-2222-4333-8444-555555555555",
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--authenticated-azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--authenticated-principal-object-id", "21111111-2222-4333-8444-555555555555",
      "--authenticated-principal-type", "servicePrincipal",
      "--authenticated-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--live-role-assignments", snapshots.assignments,
      "--live-role-definitions", snapshots.definitions,
      "--resource-group", "rg-signaldesk-stg-cin",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--session-run-id", "123456789",
      "--expected-owner-approval-reference", "github-environment:staging-provision:deployment-123",
      "--expected-owner-approval-digest", "d".repeat(64),
      "--expected-owner-approved-at", "2026-08-23T10:00:00.000Z"
    ]);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("live authority assignments do not exactly match the phase packet");
  });

  it("fails closed on invalid, excessive, insufficient, or mismatched authority windows", async () => {
    const directory = await workspace();
    const output = path.join(directory, "authority.json");
    const baseArguments = [
      "scripts/render-sd008-azure-authority.mjs",
      "--phase", "provision",
      "--subscription-id", "11111111-2222-4333-8444-555555555555",
      "--provision-principal-object-id", "21111111-2222-4333-8444-555555555555",
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--resource-group", "rg-signaldesk-stg-cin",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--owner-approval-reference", "github-environment:staging-provision:deployment-123",
      "--owner-approval-digest", "d".repeat(64),
      "--owner-approved-at", "2026-08-23T10:00:00.000Z",
      "--session-run-id", "123456789",
      "--issued-at", "2026-08-23T10:01:00.000Z"
    ];

    const invalidUtc = runNode([
      ...baseArguments,
      "--expires-at", "2026-08-23T12:01:00+00:00",
      "--output", path.join(directory, "invalid-utc.json")
    ]);
    expect(invalidUtc.status).not.toBe(0);
    expect(invalidUtc.stderr).toContain("strict RFC3339 UTC");

    const excessive = runNode([
      ...baseArguments,
      "--expires-at", "2026-08-23T18:01:00.001Z",
      "--output", path.join(directory, "excessive.json")
    ]);
    expect(excessive.status).not.toBe(0);
    expect(excessive.stderr).toContain("maximum eight-hour lease");

    const rendered = runNode([
      ...baseArguments,
      "--expires-at", "2026-08-23T12:01:00.000Z",
      "--output", output
    ]);
    expect(rendered.status, rendered.stderr).toBe(0);
    const digest = createHash("sha256").update(await readFile(output)).digest("hex");
    const provisionPacket = JSON.parse(await readFile(output, "utf8")) as {
      assignments: Array<Record<string, unknown>>;
      roleDefinitions: Array<Record<string, unknown>>;
    };
    const snapshots = await authoritySnapshots(directory, "provision", provisionPacket);
    const validationArguments = [
      "scripts/render-sd008-azure-authority.mjs",
      "--validate-packet", output,
      "--packet-sha256", digest,
      "--phase", "provision",
      "--mutation", "provision-deployment",
      "--now", "2026-08-23T10:32:00.000Z",
      "--subscription-id", "11111111-2222-4333-8444-555555555555",
      "--provision-principal-object-id", "21111111-2222-4333-8444-555555555555",
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--authenticated-azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--authenticated-principal-object-id", "21111111-2222-4333-8444-555555555555",
      "--authenticated-principal-type", "servicePrincipal",
      "--authenticated-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--live-role-assignments", snapshots.assignments,
      "--live-role-definitions", snapshots.definitions,
      "--resource-group", "rg-signaldesk-stg-cin",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--session-run-id", "123456789",
      "--expected-owner-approval-reference", "github-environment:staging-provision:deployment-123",
      "--expected-owner-approval-digest", "d".repeat(64),
      "--expected-owner-approved-at", "2026-08-23T10:00:00.000Z"
    ];
    const insufficient = runNode(validationArguments);
    expect(insufficient.status).not.toBe(0);
    expect(insufficient.stderr).toContain("requires at least 90 minutes remaining");

    const mismatched = runNode(
      validationArguments.map((value) =>
        value === "a".repeat(40) ? "e".repeat(40) : value
      )
    );
    expect(mismatched.status).not.toBe(0);
    expect(mismatched.stderr).toContain("sourceCommit binding mismatch");

    const liveAssignments = JSON.parse(await readFile(snapshots.assignments, "utf8")) as Array<Record<string, unknown>>;
    liveAssignments[0] = { ...liveAssignments[0], condition: "drifted-condition" };
    await writeFile(snapshots.assignments, JSON.stringify(liveAssignments));
    const validWindowArguments = [...validationArguments];
    validWindowArguments[validWindowArguments.indexOf("--now") + 1] = "2026-08-23T10:02:00.000Z";
    const driftedCondition = runNode(validWindowArguments);
    expect(driftedCondition.status).not.toBe(0);
    expect(driftedCondition.stderr).toContain(
      "live authority assignments do not exactly match the phase packet"
    );

    const staleTeardown = runNode([
      "scripts/render-sd008-azure-authority.mjs",
      "--phase", "teardown",
      "--subscription-id", "11111111-2222-4333-8444-555555555555",
      "--teardown-principal-object-id", "41111111-2222-4333-8444-555555555555",
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--resource-group", "rg-signaldesk-stg-cin",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--owner-approval-reference", "github-environment:staging-teardown:deployment-123",
      "--owner-approval-digest", "d".repeat(64),
      "--owner-approved-at", "2026-08-23T10:00:00.000Z",
      "--prior-traffic-authority-closure-digest", "e".repeat(64),
      "--prior-traffic-authority-removed-at", "2026-08-23T10:02:00.000Z",
      "--session-run-id", "123456789",
      "--issued-at", "2026-08-23T10:01:00.000Z",
      "--expires-at", "2026-08-23T12:01:00.000Z",
      "--output", path.join(directory, "stale-teardown.json")
    ]);
    expect(staleTeardown.status).not.toBe(0);
    expect(staleTeardown.stderr).toContain(
      "teardown authority must be issued after traffic authority removal"
    );
  });

  it("enforces the minimum remaining authority window for every Azure mutation", async () => {
    const directory = await workspace();
    const subscriptionId = "11111111-2222-4333-8444-555555555555";
    const commonRender = [
      "--subscription-id", subscriptionId,
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--resource-group", "rg-signaldesk-stg-cin",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--owner-approval-digest", "d".repeat(64),
      "--owner-approved-at", "2026-08-23T09:58:00.000Z",
      "--session-run-id", "123456789",
      "--issued-at", "2026-08-23T10:00:00.000Z",
      "--expires-at", "2026-08-23T18:00:00.000Z"
    ];
    const cases = [
      { phase: "provision", mutation: "provision-deployment", minimum: 90 },
      { phase: "provision", mutation: "provision-bootstrap-job-start", minimum: 90 },
      { phase: "provision", mutation: "provision-migration-job-start", minimum: 90 },
      { phase: "provision", mutation: "provision-app-update", minimum: 90 },
      { phase: "traffic", mutation: "traffic-promotion", minimum: 45 },
      { phase: "traffic", mutation: "traffic-rollback", minimum: 15 },
      { phase: "traffic", mutation: "traffic-restore", minimum: 15 },
      { phase: "teardown", mutation: "teardown-delete", minimum: 60 },
      { phase: "teardown", mutation: "teardown-closure", minimum: 60 }
    ];

    for (const testCase of cases) {
      const output = path.join(directory, `${testCase.mutation}.json`);
      const reference = `github-environment:staging-${testCase.phase}:deployment-123`;
      const phaseArguments = testCase.phase === "provision"
        ? ["--provision-principal-object-id", "21111111-2222-4333-8444-555555555555"]
        : testCase.phase === "traffic"
          ? [
              "--traffic-principal-object-id", "31111111-2222-4333-8444-555555555555",
              "--container-app", "signaldesk-stg-app"
            ]
          : [
              "--teardown-principal-object-id", "41111111-2222-4333-8444-555555555555",
              "--prior-traffic-authority-closure-digest", "e".repeat(64),
              "--prior-traffic-authority-removed-at", "2026-08-23T09:59:00.000Z"
            ];
      const rendered = runNode([
        "scripts/render-sd008-azure-authority.mjs",
        "--phase", testCase.phase,
        ...phaseArguments,
        ...commonRender,
        "--owner-approval-reference", reference,
        "--output", output
      ]);
      expect(rendered.status, `${testCase.mutation}: ${rendered.stderr}`).toBe(0);
      const packetBytes = await readFile(output);
      const packet = JSON.parse(packetBytes.toString("utf8")) as {
        assignments: Array<Record<string, unknown>>;
        roleDefinitions: Array<Record<string, unknown>>;
      };
      const snapshots = await authoritySnapshots(directory, testCase.mutation, packet);
      let postDeleteAbsence: string | undefined;
      if (testCase.mutation === "teardown-closure") {
        const teardownAssignment = packet.assignments.find(
          (assignment) => assignment.roleName === "SignalDesk SD008 Teardown"
        );
        const verifierAssignment = packet.assignments.find(
          (assignment) => assignment.roleName === "SignalDesk SD008 Post Delete Verifier"
        );
        await writeFile(snapshots.assignments, JSON.stringify([{
          id: verifierAssignment?.assignmentId,
          principalId: verifierAssignment?.principalObjectId,
          principalType: verifierAssignment?.principalType,
          roleDefinitionId: verifierAssignment?.roleDefinitionId,
          scope: verifierAssignment?.scope,
          condition: null,
          conditionVersion: null
        }]));
        postDeleteAbsence = path.join(directory, "threshold-post-delete-absence.json");
        await writeFile(postDeleteAbsence, JSON.stringify({
          assignmentId: teardownAssignment?.assignmentId,
          state: "absent",
          httpStatus: 404
        }));
      }
      const principalObjectId = testCase.phase === "provision"
        ? "21111111-2222-4333-8444-555555555555"
        : testCase.phase === "traffic"
          ? "31111111-2222-4333-8444-555555555555"
          : "41111111-2222-4333-8444-555555555555";
      const digest = createHash("sha256").update(packetBytes).digest("hex");
      const validationBase = [
        "scripts/render-sd008-azure-authority.mjs",
        "--validate-packet", output,
        "--packet-sha256", digest,
        "--phase", testCase.phase,
        "--mutation", testCase.mutation,
        "--subscription-id", subscriptionId,
        ...phaseArguments.filter((_, index) => {
          if (testCase.phase !== "teardown") return true;
          return index < 2;
        }),
        "--resource-group", "rg-signaldesk-stg-cin",
        "--source-commit", "a".repeat(40),
        "--image-digest", `sha256:${"b".repeat(64)}`,
        "--publication-evidence-digest", "c".repeat(64),
        "--session-run-id", "123456789",
        "--azure-client-id", "51111111-2222-4333-8444-555555555555",
        "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
        "--authenticated-azure-client-id", "51111111-2222-4333-8444-555555555555",
        "--authenticated-principal-object-id", principalObjectId,
        "--authenticated-principal-type", "servicePrincipal",
        "--authenticated-tenant-id", "81111111-2222-4333-8444-555555555555",
        "--live-role-assignments", snapshots.assignments,
        "--live-role-definitions", snapshots.definitions,
        "--expected-owner-approval-reference", reference,
        "--expected-owner-approval-digest", "d".repeat(64),
        "--expected-owner-approved-at", "2026-08-23T09:58:00.000Z",
        ...(testCase.phase === "teardown"
          ? [
              "--expected-prior-traffic-authority-closure-digest", "e".repeat(64),
              "--expected-prior-traffic-authority-removed-at", "2026-08-23T09:59:00.000Z"
            ]
          : []),
        ...(postDeleteAbsence === undefined
          ? []
          : ["--post-delete-teardown-assignment", postDeleteAbsence])
      ];
      const boundary = new Date(Date.parse("2026-08-23T18:00:00.000Z") - testCase.minimum * 60_000);
      const accepted = runNode([...validationBase, "--now", boundary.toISOString()]);
      expect(accepted.status, `${testCase.mutation}: ${accepted.stderr}`).toBe(0);
      const rejected = runNode([...validationBase, "--now", new Date(boundary.valueOf() + 1).toISOString()]);
      expect(rejected.status).not.toBe(0);
      expect(rejected.stderr).toContain(`requires at least ${testCase.minimum} minutes remaining`);
    }
  });

  it("canonicalizes UUID inputs and enforces Azure resource naming rules", async () => {
    const directory = await workspace();
    const render = (output: string, subscriptionId: string, principalId: string, clientId: string, resourceGroup: string, containerApp: string) => runNode([
      "scripts/render-sd008-azure-authority.mjs",
      "--phase", "traffic",
      "--subscription-id", subscriptionId,
      "--traffic-principal-object-id", principalId,
      "--azure-client-id", clientId,
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--resource-group", resourceGroup,
      "--container-app", containerApp,
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--owner-approval-reference", "github-environment:staging-traffic:deployment-123",
      "--owner-approval-digest", "d".repeat(64),
      "--owner-approved-at", "2026-08-23T10:00:00.000Z",
      "--session-run-id", "123456789",
      "--issued-at", "2026-08-23T10:01:00.000Z",
      "--expires-at", "2026-08-23T12:01:00.000Z",
      "--output", output
    ]);
    const lower = path.join(directory, "lower.json");
    const upper = path.join(directory, "upper.json");
    const lowercaseResult = render(
      lower,
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff",
      "aaaaaaaa-bbbb-4ccc-8ddd-cccccccccccc",
      "rg-signaldesk-stg-cin",
      "signaldesk-stg-app"
    );
    const uppercaseResult = render(
      upper,
      "AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE",
      "AAAAAAAA-BBBB-4CCC-8DDD-FFFFFFFFFFFF",
      "AAAAAAAA-BBBB-4CCC-8DDD-CCCCCCCCCCCC",
      "rg-signaldesk-stg-cin",
      "signaldesk-stg-app"
    );
    expect(lowercaseResult.status, lowercaseResult.stderr).toBe(0);
    expect(uppercaseResult.status, uppercaseResult.stderr).toBe(0);
    expect(await readFile(upper, "utf8")).toBe(await readFile(lower, "utf8"));

    for (const invalidName of ["SignalDesk", "signaldesk--app", "a", "signaldesk_app"] ) {
      const result = render(
        path.join(directory, `invalid-app-${invalidName}.json`),
        "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff",
        "aaaaaaaa-bbbb-4ccc-8ddd-cccccccccccc",
        "rg-signaldesk-stg-cin",
        invalidName
      );
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Container App name is invalid");
    }
    const invalidResourceGroup = render(
      path.join(directory, "invalid-resource-group.json"),
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff",
      "aaaaaaaa-bbbb-4ccc-8ddd-cccccccccccc",
      "invalid-ending-dot.",
      "signaldesk-stg-app"
    );
    expect(invalidResourceGroup.status).not.toBe(0);
    expect(invalidResourceGroup.stderr).toContain("Resource group name is invalid");
  });

  it("decodes ARM identity claims locally and rejects malformed, group, and overage tokens", () => {
    const jwt = (payload: Record<string, unknown>) => [
      Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify(payload)).toString("base64url"),
      "signature"
    ].join(".");
    const decode = (token: string) => spawnSync(
      process.execPath,
      ["scripts/render-sd008-azure-authority.mjs", "--decode-arm-token", "stdin"],
      { cwd: process.cwd(), encoding: "utf8", input: token, windowsHide: true }
    );
    const baseClaims = {
      appid: "51111111-2222-4333-8444-555555555555",
      oid: "31111111-2222-4333-8444-555555555555",
      tid: "81111111-2222-4333-8444-555555555555",
      idtyp: "app"
    };
    const valid = decode(jwt(baseClaims));
    expect(valid.status, valid.stderr).toBe(0);
    expect(JSON.parse(valid.stdout)).toEqual({
      clientId: baseClaims.appid,
      principalObjectId: baseClaims.oid,
      tenantId: baseClaims.tid,
      principalType: "ServicePrincipal",
      tokenGroupSignal: "none-exposed"
    });

    for (const [name, token, expected] of [
      ["malformed", "not-a-jwt", "ARM access token must be a well-formed JWT"],
      [
        "newline-config-injection",
        `${jwt(baseClaims)}\nurl=https://attacker.invalid`,
        "ARM access token must be a well-formed JWT"
      ],
      ["missing-oid", jwt({ ...baseClaims, oid: undefined }), "ARM access token oid claim is missing"],
      ["group", jwt({ ...baseClaims, groups: ["group-id"] }), "ARM access token exposes group membership"],
      ["hasgroups", jwt({ ...baseClaims, hasgroups: true }), "ARM access token exposes group overage"],
      ["claim-names", jwt({ ...baseClaims, _claim_names: { groups: "src1" } }), "ARM access token exposes group overage"]
    ] as Array<[string, string, string]>) {
      const result = decode(token);
      expect(result.status, name).not.toBe(0);
      expect(result.stderr).toContain(expected);
    }
  });

  it("requires verifier-only live authority and exact teardown-assignment absence after deletion", async () => {
    const directory = await workspace();
    const output = path.join(directory, "teardown-authority.json");
    const rendered = runNode([
      "scripts/render-sd008-azure-authority.mjs",
      "--phase", "teardown",
      "--subscription-id", "11111111-2222-4333-8444-555555555555",
      "--teardown-principal-object-id", "41111111-2222-4333-8444-555555555555",
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--resource-group", "rg-signaldesk-stg-cin",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--owner-approval-reference", "github-environment:staging-teardown:deployment-123",
      "--owner-approval-digest", "d".repeat(64),
      "--owner-approved-at", "2026-08-23T09:58:00.000Z",
      "--prior-traffic-authority-closure-digest", "e".repeat(64),
      "--prior-traffic-authority-removed-at", "2026-08-23T09:59:00.000Z",
      "--session-run-id", "123456789",
      "--issued-at", "2026-08-23T10:00:00.000Z",
      "--expires-at", "2026-08-23T12:00:00.000Z",
      "--output", output
    ]);
    expect(rendered.status, rendered.stderr).toBe(0);
    const bytes = await readFile(output);
    const packet = JSON.parse(bytes.toString("utf8")) as {
      assignments: Array<Record<string, unknown>>;
      roleDefinitions: Array<Record<string, unknown>>;
    };
    const teardownAssignment = packet.assignments.find(
      (assignment) => assignment.roleName === "SignalDesk SD008 Teardown"
    );
    const verifierAssignment = packet.assignments.find(
      (assignment) => assignment.roleName === "SignalDesk SD008 Post Delete Verifier"
    );
    expect(teardownAssignment?.assignmentId).toBeTypeOf("string");
    expect(verifierAssignment?.assignmentId).toBeTypeOf("string");
    const snapshots = await authoritySnapshots(directory, "teardown-closure", packet);
    await writeFile(snapshots.assignments, JSON.stringify([{
      id: verifierAssignment?.assignmentId,
      principalId: verifierAssignment?.principalObjectId,
      principalType: verifierAssignment?.principalType,
      roleDefinitionId: verifierAssignment?.roleDefinitionId,
      scope: verifierAssignment?.scope,
      condition: null,
      conditionVersion: null
    }]));
    const absence = path.join(directory, "post-delete-teardown-assignment.json");
    await writeFile(absence, JSON.stringify({
      assignmentId: teardownAssignment?.assignmentId,
      state: "absent",
      httpStatus: 404
    }));
    const validationArguments = [
      "scripts/render-sd008-azure-authority.mjs",
      "--validate-packet", output,
      "--packet-sha256", createHash("sha256").update(bytes).digest("hex"),
      "--phase", "teardown",
      "--mutation", "teardown-closure",
      "--now", "2026-08-23T10:30:00.000Z",
      "--subscription-id", "11111111-2222-4333-8444-555555555555",
      "--teardown-principal-object-id", "41111111-2222-4333-8444-555555555555",
      "--azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--azure-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--authenticated-azure-client-id", "51111111-2222-4333-8444-555555555555",
      "--authenticated-principal-object-id", "41111111-2222-4333-8444-555555555555",
      "--authenticated-principal-type", "servicePrincipal",
      "--authenticated-tenant-id", "81111111-2222-4333-8444-555555555555",
      "--live-role-assignments", snapshots.assignments,
      "--live-role-definitions", snapshots.definitions,
      "--post-delete-teardown-assignment", absence,
      "--resource-group", "rg-signaldesk-stg-cin",
      "--source-commit", "a".repeat(40),
      "--image-digest", `sha256:${"b".repeat(64)}`,
      "--publication-evidence-digest", "c".repeat(64),
      "--session-run-id", "123456789",
      "--expected-owner-approval-reference", "github-environment:staging-teardown:deployment-123",
      "--expected-owner-approval-digest", "d".repeat(64),
      "--expected-owner-approved-at", "2026-08-23T09:58:00.000Z",
      "--expected-prior-traffic-authority-closure-digest", "e".repeat(64),
      "--expected-prior-traffic-authority-removed-at", "2026-08-23T09:59:00.000Z"
    ];
    const accepted = runNode(validationArguments);
    expect(accepted.status, accepted.stderr).toBe(0);

    await writeFile(snapshots.assignments, JSON.stringify(packet.assignments.map((assignment) => ({
      id: assignment.assignmentId,
      principalId: assignment.principalObjectId,
      principalType: assignment.principalType,
      roleDefinitionId: assignment.roleDefinitionId,
      scope: assignment.scope,
      condition: assignment.condition ?? null,
      conditionVersion: assignment.conditionVersion ?? null
    }))));
    const retainedTeardown = runNode(validationArguments);
    expect(retainedTeardown.status).not.toBe(0);
    expect(retainedTeardown.stderr).toContain("verifier-only post-delete authority");

    await writeFile(snapshots.assignments, JSON.stringify([{
      id: verifierAssignment?.assignmentId,
      principalId: verifierAssignment?.principalObjectId,
      principalType: verifierAssignment?.principalType,
      roleDefinitionId: verifierAssignment?.roleDefinitionId,
      scope: verifierAssignment?.scope,
      condition: null,
      conditionVersion: null
    }]));
    await writeFile(absence, JSON.stringify({
      assignmentId: teardownAssignment?.assignmentId,
      state: "present",
      httpStatus: 200
    }));
    const presentAssignment = runNode(validationArguments);
    expect(presentAssignment.status).not.toBe(0);
    expect(presentAssignment.stderr).toContain("teardown assignment is not proven absent");
  });
});

describe("SD-008 secret scan exit contract", () => {
  it("classifies container and both bearer-token scan statuses", () => {
    for (const scanLabel of ["container-secret", "provision-token", "traffic-token"]) {
      for (const testCase of [
        { grepStatus: 0, expectedStatus: 1, expectedMessage: "matching material was found" },
        { grepStatus: 1, expectedStatus: 0, expectedMessage: "" },
        { grepStatus: 2, expectedStatus: 1, expectedMessage: "scan execution failed with status 2" }
      ]) {
        const result = spawnSync(
          process.execPath,
          ["scripts/check-sd008-secret-scan-exit.mjs", String(testCase.grepStatus), scanLabel],
          { cwd: process.cwd(), encoding: "utf8", windowsHide: true }
        );
        expect(result.status, result.stderr).toBe(testCase.expectedStatus);
        if (testCase.expectedMessage === "") {
          expect(result.stderr).toBe("");
        } else {
          expect(result.stderr).toContain(scanLabel);
          expect(result.stderr).toContain(testCase.expectedMessage);
        }
      }
    }
  });
});

describe("SD-008 dedicated smoke identity", () => {
  it("exchanges an environment-bound GitHub assertion for the exact ingress audience", async () => {
    const directory = await workspace();
    const githubEnvironment = path.join(directory, "github-env.txt");
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
    const returnedAccessToken = accessToken;
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
          response.end(JSON.stringify({ token_type: "Bearer", access_token: returnedAccessToken }));
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
    const exchange = async () => {
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
      return { exitCode, stdout, stderr };
    };
    const validExchange = await exchange();
    expect(validExchange.exitCode, validExchange.stderr).toBe(0);
    expect(validExchange.stdout).toBe(`${accessToken}\n`);
    expect(validExchange.stderr).toBe("");
    await expect(readFile(githubEnvironment, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    const request = new URLSearchParams(exchangeBody);
    expect(request.get("client_id")).toBe(smokeClientId);
    expect(request.get("scope")).toBe(`api://${ingressClientId}/.default`);
    expect(request.get("client_assertion")).toBe(githubToken);
  });

  it("rejects newline and curl-config injection in an exchanged access token", async () => {
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
    const maliciousToken = `${jwt({
      aud: `api://${ingressClientId}`,
      tid: tenantId,
      azp: smokeClientId,
      oid: smokePrincipalId,
      nbf: now - 10,
      exp: now + 3600
    })}\nurl=https://attacker.invalid`;
    const server = createServer((request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(
        request.method === "GET"
          ? { value: githubToken }
          : { token_type: "Bearer", access_token: maliciousToken }
      ));
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
        SD008_ENVIRONMENT: "staging-provision"
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
    expect(exitCode).not.toBe(0);
    expect(stdout).toBe("");
    expect(stderr).toContain("Entra access token must contain exactly three nonempty base64url segments");
  });
});
