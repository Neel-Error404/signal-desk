import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argumentsList = process.argv.slice(2);
const options = {};
const allowedOptions = new Set(["--format", "--mode", "--workflow", "--reusable"]);
for (let index = 0; index < argumentsList.length; index += 2) {
  const name = argumentsList[index];
  const value = argumentsList[index + 1];
  if (!allowedOptions.has(name) || value === undefined) {
    throw new Error(`Unsupported or incomplete adapter argument: ${name ?? "<missing>"}.`);
  }
  options[name.slice(2)] = value;
}
const outputFormat = options.format ?? "text";
const mode = options.mode ?? "full";

if (!new Set(["json", "text"]).has(outputFormat)) {
  throw new Error("--format must be either json or text.");
}
if (!new Set(["full", "permissions-only", "hosted"]).has(mode)) {
  throw new Error("--mode must be full, permissions-only, or hosted.");
}

function boundedRepositoryFile(input, fallback, label) {
  const candidate = resolve(repositoryRoot, input ?? fallback);
  const relativePath = relative(repositoryRoot, candidate);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`${label} must resolve to a local file inside the repository.`);
  }
  return candidate;
}

const workflowPath = boundedRepositoryFile(
  options.workflow,
  ".github/workflows/sd008-azure-staging.yml",
  "Workflow path"
);
const reusablePath = boundedRepositoryFile(
  options.reusable,
  ".github/workflows/hosted-review-gate.yml",
  "Reusable workflow path"
);

const [workflow, reusable] = await Promise.all([
  readFile(workflowPath, "utf8"),
  readFile(reusablePath, "utf8")
]);

const checks = [];

function record(id, status, evidenceKind, detail) {
  checks.push({ id, status, evidenceKind, detail });
}

function jobBlocks(source) {
  const lines = source.split(/\r?\n/);
  const jobsLine = lines.findIndex((line) => line === "jobs:");
  if (jobsLine < 0) {
    return new Map();
  }
  const starts = [];
  for (let index = jobsLine + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (match) {
      starts.push({ id: match[1], index });
    }
  }
  return new Map(
    starts.map((start, index) => {
      const end = starts[index + 1]?.index ?? lines.length;
      return [start.id, lines.slice(start.index, end).join("\n")];
    })
  );
}

function dependencies(block) {
  const inline = block.match(/^    needs:\s*\[([^\]]+)\]\s*$/m);
  if (inline) {
    return inline[1].split(",").map((value) => value.trim()).filter(Boolean);
  }
  const scalar = block.match(/^    needs:\s*([A-Za-z0-9_-]+)\s*$/m);
  if (scalar) {
    return [scalar[1]];
  }
  const multiline = block.match(/^    needs:\s*\n((?:      - [A-Za-z0-9_-]+\s*\n?)+)/m);
  return multiline
    ? [...multiline[1].matchAll(/^      - ([A-Za-z0-9_-]+)\s*$/gm)].map((match) => match[1])
    : [];
}

function permissionMap(source, headerIndent, entryIndent) {
  const lines = source.split(/\r?\n/);
  const header = `${" ".repeat(headerIndent)}permissions:`;
  const headerIndexes = lines
    .map((line, index) => (line === header ? index : -1))
    .filter((index) => index >= 0);
  const permissions = new Map();
  const errors = [];
  if (headerIndexes.length !== 1) {
    errors.push(`expected one permissions block at indent ${headerIndent}, found ${headerIndexes.length}`);
    return { permissions, errors };
  }
  for (let index = headerIndexes[0] + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "") continue;
    const indentation = line.length - line.trimStart().length;
    if (indentation <= headerIndent) break;
    const match = line.match(new RegExp(`^ {${entryIndent}}([A-Za-z-]+): (read|write|none)$`));
    if (!match) {
      errors.push(`invalid permission line: ${line.trim()}`);
      continue;
    }
    const [, scope, level] = match;
    if (permissions.has(scope)) errors.push(`duplicate permission scope: ${scope}`);
    permissions.set(scope, level);
  }
  return { permissions, errors };
}

function command(name, args) {
  return spawnSync(name, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true
  });
}

function commandDetail(result) {
  return (
    result.stderr ||
    result.stdout ||
    result.error?.message ||
    `command exited with status ${String(result.status)}`
  ).trim();
}

function emitReport() {
  const failed = checks.some((check) => check.status === "fail");
  const blocked = checks.some((check) => check.status === "blocked");
  const report = {
    schemaVersion: 1,
    workItem: "SD-008",
    claim: "local-adapter-evidence-only-not-provider-acceptance",
    overall: failed ? "fail" : blocked ? "pass-with-blocked-capabilities" : "pass",
    checks
  };
  if (outputFormat === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const check of checks) {
      process.stdout.write(`${check.status.toUpperCase()} ${check.id}: ${check.detail}\n`);
    }
    process.stdout.write(`OVERALL ${report.overall}\n`);
  }
  return failed ? 1 : 0;
}

const workflowJobs = jobBlocks(workflow);
const caller = workflowJobs.get("ordered-review-gate") ?? "";
const callerPermissionResult = permissionMap(caller, 4, 6);
const reusablePermissionResult = permissionMap(reusable, 0, 2);
const callerPermissions = callerPermissionResult.permissions;
const requiredPermissions = reusablePermissionResult.permissions;
const expectedPermissions = new Map([["contents", "read"]]);
const permissionProblems = [
  ...callerPermissionResult.errors,
  ...reusablePermissionResult.errors
];
for (const [label, permissions] of [
  ["caller", callerPermissions],
  ["reusable", requiredPermissions]
]) {
  for (const [scope, level] of permissions) {
    if (expectedPermissions.get(scope) !== level || level === "write") {
      permissionProblems.push(`${label} ${scope}:${level}`);
    }
  }
  for (const [scope, level] of expectedPermissions) {
    if (permissions.get(scope) !== level) permissionProblems.push(`${label} missing ${scope}:${level}`);
  }
}
if (
  caller.includes("uses: ./.github/workflows/hosted-review-gate.yml") &&
  permissionProblems.length === 0
) {
  record(
    "reusable-workflow-permissions",
    "pass",
    "local-static-contract",
    "Caller grants every permission declared by the reusable workflow; all are read-only."
  );
} else {
  record(
    "reusable-workflow-permissions",
    "fail",
    "local-static-contract",
    `Reusable workflow permission incompatibility: ${permissionProblems.join(", ") || "missing local call"}`
  );
}

if (mode === "permissions-only") {
  process.exitCode = emitReport();
} else {

const unknownDependencies = [];
const graph = new Map();
for (const [job, block] of workflowJobs) {
  const needs = dependencies(block);
  graph.set(job, needs);
  for (const dependency of needs) {
    if (!workflowJobs.has(dependency)) {
      unknownDependencies.push(`${job}->${dependency}`);
    }
  }
}
let cycle = false;
const visiting = new Set();
const visited = new Set();
function visit(job) {
  if (visiting.has(job)) {
    cycle = true;
    return;
  }
  if (visited.has(job)) return;
  visiting.add(job);
  for (const dependency of graph.get(job) ?? []) visit(dependency);
  visiting.delete(job);
  visited.add(job);
}
for (const job of graph.keys()) visit(job);
const provisionNeeds = graph.get("staging-provision") ?? [];
if (
  workflow.includes("workflow_dispatch:") &&
  workflow.includes("permissions: {}") &&
  unknownDependencies.length === 0 &&
  !cycle &&
  provisionNeeds.includes("build-and-attest") &&
  provisionNeeds.includes("staging-publication")
) {
  record(
    "workflow-graph-admission",
    "pass",
    "local-static-contract",
    `Parsed ${workflowJobs.size} jobs with known acyclic dependencies and a publication-before-provision edge.`
  );
} else {
  record(
    "workflow-graph-admission",
    "fail",
    "local-static-contract",
    `Invalid local graph: unknown=${unknownDependencies.join(",") || "none"}; cycle=${cycle}; provisionNeeds=${provisionNeeds.join(",")}`
  );
}

if (
  workflow.includes('type=oci,dest=.tmp/canonical.tar') &&
  workflow.includes('type=docker,name=$CANONICAL_IMAGE') &&
  workflow.includes('type=oci,dest=.tmp/advisory.tar') &&
  workflow.includes('type=docker,name=$ADVISORY_IMAGE') &&
  !workflow.includes("docker load --input")
) {
  record(
    "oci-docker-exporter-compatibility",
    "pass",
    "local-static-contract",
    "OCI archives are diagnostic outputs; Docker execution uses Docker exporter images."
  );
} else {
  record(
    "oci-docker-exporter-compatibility",
    "fail",
    "local-static-contract",
    "Workflow must separate OCI diagnostics from Docker-loadable execution outputs."
  );
}

const diagnosticUploadStart = workflow.indexOf(
  "Retain independent-build diagnostics even when later gates fail"
);
const diagnosticUploadEnd = workflow.indexOf(
  "Reject forbidden files and secret-shaped application content"
);
const diagnosticUpload = workflow.slice(diagnosticUploadStart, diagnosticUploadEnd);
const forbiddenDiagnosticUploads = [
  ".tmp/canonical-application.log",
  ".tmp/canonical-container-id.txt",
  ".tmp/canonical-live.json",
  ".tmp/canonical-application-payload.json",
  ".tmp/advisory-application-payload.json",
  ".tmp/canonical-runtime-tree.txt",
  ".tmp/canonical-runtime-tree-count.txt",
  ".tmp/advisory-runtime-tree.txt",
  ".tmp/advisory-runtime-tree-count.txt",
  ".tmp/canonical-oci-config.json",
  ".tmp/canonical-oci-manifest.json",
  ".tmp/advisory-oci-config.json",
  ".tmp/advisory-oci-manifest.json"
];
if (
  workflow.includes(".tmp/reproducibility-diagnostics.json") &&
  workflow.includes(
    'reproducibilityClaim: advisoryFailure || !applicationPayloadEqual ? "suppressed" : "advisory-only"'
  ) &&
  workflow.includes('selection: "signaldesk-owned-executable-payload-v1"') &&
  workflow.includes('selection: "all-regular-files-below-app-v1"') &&
  workflow.includes("configBitIdentical") &&
  workflow.includes("manifestBitIdentical") &&
  workflow.includes("layersIdentical") &&
  workflow.includes("finalDigestIdentical") &&
  workflow.includes("canonicalSha256: canonicalPayload.sha256") &&
  workflow.includes("advisorySha256: advisoryPayload.sha256") &&
  workflow.includes("canonicalFileCount: canonicalPayload.fileCount") &&
  workflow.includes("advisoryFileCount: advisoryPayload.fileCount") &&
  workflow.includes("runtimeTree:") &&
  workflow.includes("equal: runtimeTreeEqual") &&
  workflow.includes("const advisoryFailure = !runtimeTreeEqual") &&
  workflow.includes("blockingMismatch: !applicationPayloadEqual") &&
  diagnosticUploadStart >= 0 &&
  diagnosticUploadEnd > diagnosticUploadStart &&
  diagnosticUpload.includes("if: ${{ always() }}") &&
  diagnosticUpload.includes("if-no-files-found: error") &&
  forbiddenDiagnosticUploads.every((path) => !diagnosticUpload.includes(path))
) {
  record(
    "diagnostic-output-presence",
    "pass",
    "local-static-contract",
    "The always-retained artifact contains sanitized application-payload and advisory runtime-tree hashes and counts, blocking mismatch state, OCI digest comparisons, and claim suppression."
  );
} else {
  record(
    "diagnostic-output-presence",
    "fail",
    "local-static-contract",
    "Required independent-build diagnostics are incomplete."
  );
}

const dockerVersion = command("docker", ["version", "--format", "{{.Server.Version}}"]);
if (dockerVersion.error || dockerVersion.status !== 0) {
  record(
    "docker-load-run",
    "blocked",
    "local-executable-capability",
    `Docker is unavailable; Docker-export load/run remains unexecuted locally: ${commandDetail(dockerVersion)}`
  );
} else {
  const smokeRoot = await mkdtemp(join(tmpdir(), "signaldesk-sd008-docker-"));
  const dockerfilePath = join(smokeRoot, "Dockerfile");
  const archivePath = join(smokeRoot, "adapter-image.tar");
  const uniqueSuffix = `${process.pid}-${randomUUID().slice(0, 8)}`;
  const imageReference = `signaldesk:sd008-adapter-${uniqueSuffix}`;
  const builderName = `sd008-adapter-${uniqueSuffix}`;
  let smokeFailure;
  let cleanupFailure;
  const appendCleanupFailure = (detail) => {
    cleanupFailure = cleanupFailure ? `${cleanupFailure}; ${detail}` : detail;
  };
  try {
    const projectDockerfile = await readFile(resolve(repositoryRoot, "Dockerfile"), "utf8");
    const pinnedBaseImages = [
      ...new Set(
        [...projectDockerfile.matchAll(/^FROM\s+(\S+@sha256:[0-9a-f]{64})(?:\s+AS\s+\S+)?\s*$/gim)].map(
          (match) => match[1]
        )
      )
    ];
    if (pinnedBaseImages.length !== 1) {
      throw new Error(
        `Expected exactly one project-pinned Docker base image digest, found ${pinnedBaseImages.length}.`
      );
    }
    const pinnedBaseImage = pinnedBaseImages[0];
    await writeFile(
      dockerfilePath,
      `FROM ${pinnedBaseImage}\nENTRYPOINT ["node","-e","process.stdout.write('sd008-adapter-ok\\\\n')"]\n`,
      "utf8"
    );
    const buildx = command("docker", ["buildx", "version"]);
    if (buildx.error || buildx.status !== 0) {
      throw new Error(`Docker Buildx is unavailable: ${commandDetail(buildx)}`);
    }
    const builderCreate = command("docker", ["buildx", "create", "--name", builderName, "--driver", "docker-container"]);
    if (builderCreate.error || builderCreate.status !== 0) {
      throw new Error(`Isolated Docker builder creation failed: ${commandDetail(builderCreate)}`);
    }
    const build = command("docker", [
      "buildx",
      "build",
      "--builder", builderName,
      "--network=none",
      "--provenance=false",
      "--sbom=false",
      "--output",
      `type=docker,name=${imageReference},dest=${archivePath}`,
      smokeRoot
    ]);
    if (build.error || build.status !== 0) {
      throw new Error(`Docker archive export failed: ${commandDetail(build)}`);
    }
    const load = command("docker", ["load", "--input", archivePath]);
    if (load.error || load.status !== 0) {
      throw new Error(`Docker archive load failed: ${commandDetail(load)}`);
    }
    const run = command("docker", ["run", "--rm", imageReference]);
    if (run.error || run.status !== 0 || run.stdout.trim() !== "sd008-adapter-ok") {
      throw new Error(`Docker-loaded probe failed to run: ${commandDetail(run)}`);
    }
  } catch (error) {
    smokeFailure = error instanceof Error ? error.message : String(error);
  } finally {
    const builderInventoryArguments = ["buildx", "ls", "--format", "{{.Name}}"];
    const builderBeforeCleanup = command("docker", builderInventoryArguments);
    if (builderBeforeCleanup.error || builderBeforeCleanup.status !== 0) {
      appendCleanupFailure(`Docker builder cleanup inventory failed: ${commandDetail(builderBeforeCleanup)}`);
    } else {
      const builderNames = builderBeforeCleanup.stdout
        .split(/\r?\n/)
        .map((name) => name.trim().replace(/\*$/, ""))
        .filter(Boolean);
      if (builderNames.includes(builderName)) {
        const builderRemoval = command("docker", ["buildx", "rm", "--force", builderName]);
        if (builderRemoval.error || builderRemoval.status !== 0) {
          appendCleanupFailure(
            `Isolated Docker builder cleanup failed for ${builderName}: ${commandDetail(builderRemoval)}`
          );
        } else {
          const builderAfterCleanup = command("docker", builderInventoryArguments);
          if (builderAfterCleanup.error || builderAfterCleanup.status !== 0) {
            appendCleanupFailure(
              `Docker builder cleanup inventory failed after removal for ${builderName}: ${commandDetail(builderAfterCleanup)}`
            );
          } else {
            const remainingBuilderNames = builderAfterCleanup.stdout
              .split(/\r?\n/)
              .map((name) => name.trim().replace(/\*$/, ""))
              .filter(Boolean);
            if (remainingBuilderNames.includes(builderName)) {
              appendCleanupFailure(
                `Isolated Docker builder cleanup could not be verified for ${builderName}; it remains present.`
              );
            }
          }
        }
      }
    }
    const imageInventoryArguments = ["image", "ls", "--all", "--quiet", "--no-trunc", "--filter", `reference=${imageReference}`];
    const imageBeforeCleanup = command("docker", imageInventoryArguments);
    if (imageBeforeCleanup.error || imageBeforeCleanup.status !== 0) {
      appendCleanupFailure(`Docker image cleanup inventory failed: ${commandDetail(imageBeforeCleanup)}`);
    } else if (imageBeforeCleanup.stdout.trim()) {
      const imageRemoval = command("docker", ["image", "rm", imageReference]);
      if (imageRemoval.error || imageRemoval.status !== 0) {
        appendCleanupFailure(
          `Docker image cleanup failed for ${imageReference}: ${commandDetail(imageRemoval)}`
        );
      } else {
        const imageAfterCleanup = command("docker", imageInventoryArguments);
        if (imageAfterCleanup.error || imageAfterCleanup.status !== 0) {
          appendCleanupFailure(
            `Docker image cleanup inventory failed after removal for ${imageReference}: ${commandDetail(imageAfterCleanup)}`
          );
        } else if (imageAfterCleanup.stdout.trim()) {
          appendCleanupFailure(
            `Docker image cleanup could not be verified for ${imageReference}; the exact reference remains present.`
          );
        }
      }
    }
    try {
      await rm(smokeRoot, { recursive: true });
    } catch (error) {
      const tempCleanupFailure = `Temporary adapter context cleanup failed for ${smokeRoot}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      appendCleanupFailure(tempCleanupFailure);
    }
  }
  if (cleanupFailure) {
    smokeFailure = smokeFailure
      ? `${smokeFailure}; cleanup failure: ${cleanupFailure}`
      : cleanupFailure;
  }
  if (!smokeFailure) {
    record(
      "docker-load-run",
      "pass",
      "local-executable-runtime",
      "An isolated builder used --network=none build steps with the project-pinned base image, exported and ran a Docker archive, and verified builder/image cleanup; builder bootstrap and pinned-base resolution may use read-only registry pulls."
    );
  } else {
    record(
      "docker-load-run",
      "fail",
      "local-executable-runtime",
      smokeFailure
    );
  }
}

const actionlintVersion = command("actionlint", ["-version"]);
if (actionlintVersion.error || actionlintVersion.status !== 0) {
  record(
    "actionlint-admission",
    mode === "hosted" ? "fail" : "blocked",
    "local-executable-capability",
    mode === "hosted"
      ? `actionlint is required in hosted mode but unavailable: ${commandDetail(actionlintVersion)}`
      : `actionlint is unavailable; GitHub workflow schema/admission remains unverified locally: ${commandDetail(actionlintVersion)}`
  );
} else {
  const lint = command("actionlint", [workflowPath, reusablePath]);
  record(
    "actionlint-admission",
    lint.status === 0 ? "pass" : "fail",
    "local-executable-runtime",
    lint.status === 0
      ? "actionlint accepted both workflow files locally."
      : `actionlint rejected a workflow: ${commandDetail(lint)}`
  );
}

const jqVersion = command("jq", ["--version"]);
record(
  "jq-availability",
  jqVersion.error || jqVersion.status !== 0 ? "blocked" : "pass",
  "local-executable-capability",
  jqVersion.error || jqVersion.status !== 0
    ? `jq is unavailable; embedded hosted jq expressions remain unexecuted locally: ${commandDetail(jqVersion)}`
    : `jq is available: ${jqVersion.stdout.trim()}`
);

process.exitCode = emitReport();
}
