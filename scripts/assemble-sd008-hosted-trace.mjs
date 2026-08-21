import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateLearningTrace } from "./validate-sd008-learning-trace.mjs";

const COMMIT = /^[0-9a-f]{40}$/;
const RUN_ID = /^[1-9][0-9]*$/;
const SHA256 = /^[0-9a-f]{64}$/;
const REPOSITORY = "Neel-Error404/signal-desk";
const ENVIRONMENTS = ["staging-publication", "staging-provision", "staging-traffic", "staging-teardown"];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const exactTime = (value, label) => {
  const parsed = new Date(value);
  assert(
    typeof value === "string" && Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value,
    `${label} must be an exact UTC ISO-8601 timestamp.`
  );
  return value;
};

const parseArguments = (arguments_) => {
  const values = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !name.startsWith("--") || value === undefined) {
      throw new Error("Every trace argument must use --name value.");
    }
    values[name.slice(2).replaceAll("-", "_")] = value;
  }
  return values;
};

const readJson = async (file, label) => {
  const bytes = await readFile(file);
  try {
    return { bytes, digest: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
};

const assertPhasePacket = (packet, phase, commit, runId) => {
  assert(packet.schemaVersion === 1, `${phase} packet schema is invalid.`);
  assert(packet.classification === "public-redacted", `${phase} packet must be public-redacted.`);
  assert(packet.workItem === "SD-008", `${phase} packet work item is invalid.`);
  assert(packet.phase === phase, `${phase} packet phase is invalid.`);
  assert(packet.commit === commit, `${phase} packet commit does not match.`);
  assert(packet.runId === runId, `${phase} packet run ID does not match.`);
  exactTime(packet.createdAt, `${phase} packet creation time`);
  assert(packet.privacy?.secretScan === "passed", `${phase} packet secret scan did not pass.`);
  assert(packet.privacy?.rawProviderArtifactsUploaded === false, `${phase} packet uploaded raw provider artifacts.`);
  assert(packet.privacy?.sensitiveIdentifiers === "typed-sha256-bindings", `${phase} packet identifier binding is invalid.`);
  assert(packet.payloads?.summary !== undefined, `${phase} packet summary is missing.`);
};

const exactApproval = (github, environment) => {
  const entries = github.approvals.filter((entry) => entry.environment === environment);
  assert(entries.length === 1, `${environment} must have exactly one accountable review.`);
  const approval = entries[0];
  assert(approval.state === "approved", `${environment} was not approved.`);
  assert(typeof approval.actor === "string" && approval.actor.length > 0, `${environment} approver is missing.`);
  exactTime(approval.occurredAt, `${environment} approval time`);
  return approval;
};

const event = (sequence, runId, type, occurredAt, evidenceSha256) => ({
  sequence,
  id: `sd008-${runId}-${type}`,
  type,
  occurredAt: exactTime(occurredAt, `${type} event time`),
  evidenceSha256
});

export const assembleHostedTrace = ({ source, build, provision, traffic, teardown, github, closure }) => {
  const commit = source.value.commit;
  const runId = source.value.runId;
  assert(source.value.schemaVersion === 1 && source.value.workItem === "SD-008", "Source proof contract is invalid.");
  assert(source.value.event === "protected-main-verified", "Source proof event is invalid.");
  assert(source.value.repository === REPOSITORY, "Source proof repository is invalid.");
  assert(COMMIT.test(commit), "Source proof commit is invalid.");
  assert(RUN_ID.test(runId), "Source proof run ID is invalid.");
  assert(source.value.strict === true && source.value.bypassActors === 0, "Source protection proof is not fail-closed.");
  exactTime(source.value.occurredAt, "Source proof time");

  assert(build.value.schemaVersion === 1 && build.value.workItem === "SD-008", "Build proof contract is invalid.");
  assert(build.value.event === "artifact-published", "Build proof event is invalid.");
  assert(build.value.commit === commit && build.value.runId === runId, "Build proof identity does not match.");
  assert(build.value.reproducibleBuilds === 2 && build.value.secretScan === "passed", "Build proof is incomplete.");
  exactTime(build.value.occurredAt, "Build proof time");

  assertPhasePacket(provision.value, "provision", commit, runId);
  assertPhasePacket(traffic.value, "traffic", commit, runId);
  assertPhasePacket(teardown.value, "teardown", commit, runId);
  const provisionSummary = provision.value.payloads.summary;
  const trafficSummary = traffic.value.payloads.summary;
  const teardownSummary = teardown.value.payloads.summary;
  const cost = teardown.value.payloads.cost;
  assert(
    provisionSummary.candidateZeroTraffic === true &&
      provisionSummary.bootstrapJob === "Succeeded" &&
      provisionSummary.migrationJob === "Succeeded" &&
      provisionSummary.anonymousDenied === true &&
      provisionSummary.authorizedSmoke === true,
    "Provision summary does not prove the secretless zero-traffic candidate."
  );
  assert(
    trafficSummary.trafficApproved === true &&
      trafficSummary.candidatePromoted === true &&
      trafficSummary.rollbackVerified === true &&
      trafficSummary.finalBaselineWeight === 100 &&
      trafficSummary.finalCandidateWeight === 0 &&
      trafficSummary.authorizedSmoke === true,
    "Traffic summary does not prove promotion and rollback."
  );
  assert(
    teardownSummary.resourceGroupDeleted === true &&
      teardownSummary.activeResources === 0 &&
      teardownSummary.endpointAbsent === true &&
      teardownSummary.unexpectedChargesDetected === false,
    "Teardown summary does not prove bounded absence."
  );
  assert(cost?.calculationKind === "conservative-retail-upper-bound", "Teardown cost calculation is invalid.");
  assert(cost.actualBillingClaim === false, "Teardown cost cannot claim final provider billing.");
  assert(typeof cost.estimatedUsd === "number" && cost.estimatedUsd >= 0, "Teardown estimated cost is invalid.");
  assert(cost.ownerReviewThresholdUsd === 2 && cost.budgetAlertUsd === 5, "Teardown cost boundaries are invalid.");
  assert(cost.estimatedUsd <= cost.budgetAlertUsd, "Teardown estimated cost exceeds the stop boundary.");

  assert(github.value.schemaVersion === 1 && github.value.classification === "public-redacted", "GitHub proof contract is invalid.");
  assert(github.value.workItem === "SD-008" && github.value.repository === REPOSITORY, "GitHub proof identity is invalid.");
  assert(github.value.runId === runId, "GitHub proof run ID does not match.");
  assert(Array.isArray(github.value.approvals) && Array.isArray(github.value.jobs), "GitHub proof is incomplete.");
  const approvals = Object.fromEntries(ENVIRONMENTS.map((name) => [name, exactApproval(github.value, name)]));
  const gateJobs = github.value.jobs.filter((job) =>
    job.name.split(" / ").at(-1) === "signaldesk-ordered-review-gate"
  );
  assert(gateJobs.length === 1, "GitHub proof must contain exactly one ordered review gate job.");
  const gate = gateJobs[0];
  assert(gate.status === "completed" && gate.conclusion === "success", "Ordered review gate did not succeed.");
  exactTime(gate.completedAt, "Ordered review gate completion time");

  assert(closure.value.schemaVersion === 1 && closure.value.classification === "public-redacted", "Authority closure contract is invalid.");
  assert(closure.value.workItem === "SD-008" && closure.value.repository === REPOSITORY, "Authority closure identity is invalid.");
  assert(closure.value.commit === commit && closure.value.runId === runId, "Authority closure source identity does not match.");
  assert(closure.value.event === "post-delete-verifier-removed", "Authority closure event is invalid.");
  assert(closure.value.roleName === "SignalDesk SD008 Post Delete Verifier", "Authority closure role is invalid.");
  assert(closure.value.assignmentState === "absent" && closure.value.assignmentCount === 0, "Post-delete verifier authority remains assigned.");
  assert(closure.value.performedBy === "Neel", "Post-delete verifier removal requires the accountable owner.");
  assert(SHA256.test(closure.value.evidenceSha256), "Authority closure evidence digest is invalid.");
  exactTime(closure.value.occurredAt, "Authority closure time");
  if (cost.estimatedUsd > cost.ownerReviewThresholdUsd) {
    assert(SHA256.test(closure.value.costExceptionApprovalSha256), "Cost above USD 2 requires an owner exception digest.");
  }

  const events = [
    event(1, runId, "protected-main-verified", source.value.occurredAt, source.digest),
    event(2, runId, "ordered-gate-passed", gate.completedAt, github.digest),
    event(3, runId, "artifact-published", build.value.occurredAt, build.digest),
    event(4, runId, "publication-approved", approvals["staging-publication"].occurredAt, github.digest),
    event(5, runId, "provision-approved", approvals["staging-provision"].occurredAt, github.digest),
    event(6, runId, "candidate-zero-traffic-verified", provisionSummary.candidateZeroTrafficVerifiedAt, provision.digest),
    event(7, runId, "traffic-approved", approvals["staging-traffic"].occurredAt, github.digest),
    event(8, runId, "rollback-verified", trafficSummary.rollbackVerifiedAt, traffic.digest),
    event(9, runId, "evidence-exported", traffic.value.createdAt, traffic.digest),
    event(10, runId, "teardown-approved", approvals["staging-teardown"].occurredAt, github.digest),
    event(11, runId, "resource-group-deleted", teardownSummary.resourceGroupDeletedAt, teardown.digest),
    event(12, runId, "absence-verified", teardownSummary.absenceVerifiedAt, teardown.digest),
    event(13, runId, "post-delete-verifier-removed", closure.value.occurredAt, closure.value.evidenceSha256)
  ];

  const trace = {
    schemaVersion: 1,
    traceType: "actual-hosted-sd008",
    projectId: "signaldesk",
    workItem: "SD-008",
    repository: REPOSITORY,
    commit,
    runId,
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
      cost,
      ...(closure.value.costExceptionApprovalSha256 === undefined
        ? {}
        : { costExceptionApprovalSha256: closure.value.costExceptionApprovalSha256 }),
      phasePacketSha256: {
        source: source.digest,
        build: build.digest,
        provision: provision.digest,
        traffic: traffic.digest,
        teardown: teardown.digest
      }
    },
    events,
    learning: {
      source: "actual-redacted-hosted-sd008-trace-only",
      maximumCandidates: 1,
      candidateCreated: false,
      sd007DecisionReuse: false,
      targetMutation: false,
      promotionPacketOnly: true
    }
  };
  validateLearningTrace(trace);
  return trace;
};

const main = async () => {
  const arguments_ = parseArguments(process.argv.slice(2));
  const names = ["source", "build", "provision", "traffic", "teardown", "github", "authority_closure", "output"];
  for (const required of names) {
    if (arguments_[required] === undefined) throw new Error(`--${required.replaceAll("_", "-")} is required.`);
  }
  const [source, build, provision, traffic, teardown, github, closure] = await Promise.all([
    readJson(arguments_.source, "Source proof"),
    readJson(arguments_.build, "Build proof"),
    readJson(arguments_.provision, "Provision packet"),
    readJson(arguments_.traffic, "Traffic packet"),
    readJson(arguments_.teardown, "Teardown packet"),
    readJson(arguments_.github, "GitHub proof"),
    readJson(arguments_.authority_closure, "Authority closure")
  ]);
  const trace = assembleHostedTrace({ source, build, provision, traffic, teardown, github, closure });
  await writeFile(arguments_.output, `${JSON.stringify(trace, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify(validateLearningTrace(trace)));
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`SD-008 hosted trace assembly failed: ${error.message}`);
    process.exitCode = 1;
  });
}
