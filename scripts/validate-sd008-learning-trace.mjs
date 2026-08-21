import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const COMMIT = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const RUN_ID = /^[1-9][0-9]*$/;
const REQUIRED_EVENTS = [
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
const FORBIDDEN_KEY =
  /(?:authorization|client[-_]?secret|connection[-_]?string|cookie|password|refresh[-_]?token|subscription[-_]?id|tenant[-_]?id|client[-_]?id|object[-_]?id|principal[-_]?id|customer[-_]?id|fqdn|private[-_]?ip|token)$/i;
const FORBIDDEN_VALUE = [
  /\/subscriptions\/[0-9a-f-]{36}\//i,
  /\.azurecontainerapps\.io\b/i,
  /\.postgres\.database\.azure\.com\b/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertPublic = (value, location = "$") => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertPublic(entry, `${location}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assert(!FORBIDDEN_KEY.test(key), `Private field is forbidden at ${location}.${key}.`);
      assertPublic(entry, `${location}.${key}`);
    }
    return;
  }
  if (typeof value === "string") {
    assert(
      !FORBIDDEN_VALUE.some((pattern) => pattern.test(value)),
      `Private value is forbidden at ${location}.`
    );
  }
};

export const validateLearningTrace = (trace) => {
  assert(trace !== null && typeof trace === "object", "Trace must be a JSON object.");
  assert(trace.schemaVersion === 1, "Trace schemaVersion must be 1.");
  assert(trace.traceType === "actual-hosted-sd008", "Trace must come from actual hosted SD-008.");
  assert(trace.projectId === "signaldesk", "Trace projectId must be signaldesk.");
  assert(trace.workItem === "SD-008", "Trace workItem must be SD-008.");
  assert(trace.repository === "Neel-Error404/signal-desk", "Trace repository is invalid.");
  assert(typeof trace.commit === "string" && COMMIT.test(trace.commit), "Trace commit is invalid.");
  assert(typeof trace.runId === "string" && RUN_ID.test(trace.runId), "Trace runId is invalid.");
  assert(trace.lane1?.status === "verified-after-teardown", "Lane 1 teardown verification is required.");
  assert(trace.lane1?.environment === "staging", "Lane 1 environment must be staging.");
  assert(trace.lane1?.production === false, "Lane 1 production must be false.");
  assert(trace.lane1?.syntheticDataOnly === true, "Lane 1 must contain synthetic data only.");
  assert(trace.lane1?.resourceGroupDeleted === true, "Resource-group deletion evidence is required.");
  assert(trace.lane1?.endpointAbsent === true, "Endpoint absence evidence is required.");
  assert(trace.lane1?.activeResources === 0, "Active resource count must be zero.");
  assert(
    trace.lane1?.unexpectedChargesDetected === false,
    "Trace must record that no unexpected charges were detected; it cannot claim final billing."
  );
  assert(trace.lane1?.rawProviderArtifactsUploaded === false, "Raw provider artifacts are forbidden.");
  assert(
    trace.lane1?.exactIdentifiers === "owner-encrypted-only",
    "Exact identifiers must remain owner-encrypted only."
  );
  const cost = trace.lane1?.cost;
  assert(cost !== null && typeof cost === "object", "Conservative cost evidence is required.");
  assert(
    cost.calculationKind === "conservative-retail-upper-bound",
    "Cost evidence must be a conservative retail upper bound."
  );
  assert(cost.currency === "USD", "Cost evidence currency must be USD.");
  assert(cost.actualBillingClaim === false, "Cost evidence cannot claim actual provider billing.");
  assert(
    typeof cost.estimatedUsd === "number" && cost.estimatedUsd >= 0,
    "Estimated cost must be a non-negative number."
  );
  assert(cost.ownerReviewThresholdUsd === 2, "Cost owner-review threshold must be USD 2.");
  assert(cost.budgetAlertUsd === 5, "Cost stop boundary must be USD 5.");
  assert(cost.estimatedUsd <= cost.budgetAlertUsd, "Estimated cost exceeds the USD 5 stop boundary.");
  if (cost.estimatedUsd > cost.ownerReviewThresholdUsd) {
    assert(
      typeof trace.lane1.costExceptionApprovalSha256 === "string" &&
        SHA256.test(trace.lane1.costExceptionApprovalSha256),
      "Cost above USD 2 requires an exact owner exception digest."
    );
  }
  const packets = trace.lane1?.phasePacketSha256;
  assert(packets !== null && typeof packets === "object", "Phase packet digests are required.");
  for (const phase of ["source", "build", "provision", "traffic", "teardown"]) {
    assert(typeof packets[phase] === "string" && SHA256.test(packets[phase]), `${phase} packet digest is invalid.`);
  }
  assert(Array.isArray(trace.events), "Trace events must be an array.");
  assert(trace.events.length === REQUIRED_EVENTS.length, "Trace must contain exactly the required events.");
  let previousTime = -1;
  const eventIds = new Set();
  trace.events.forEach((event, index) => {
    assert(event.sequence === index + 1, `Event ${index + 1} sequence is invalid.`);
    assert(event.type === REQUIRED_EVENTS[index], `Event ${index + 1} must be ${REQUIRED_EVENTS[index]}.`);
    assert(typeof event.id === "string" && event.id.length > 0, `Event ${index + 1} id is required.`);
    assert(!eventIds.has(event.id), `Event id ${event.id} is duplicated.`);
    eventIds.add(event.id);
    const occurredAt = Date.parse(event.occurredAt);
    assert(Number.isFinite(occurredAt), `Event ${event.id} time is invalid.`);
    assert(occurredAt >= previousTime, `Event ${event.id} is out of order.`);
    previousTime = occurredAt;
    assert(
      typeof event.evidenceSha256 === "string" && SHA256.test(event.evidenceSha256),
      `Event ${event.id} evidence digest is invalid.`
    );
  });
  assert(trace.learning?.source === "actual-redacted-hosted-sd008-trace-only", "Learning source is invalid.");
  assert(trace.learning?.maximumCandidates === 1, "Learning must allow at most one candidate.");
  assert(trace.learning?.candidateCreated === false, "Lane 1 trace cannot pre-create a learning candidate.");
  assert(trace.learning?.sd007DecisionReuse === false, "SD-007 learning decisions cannot be reused.");
  assert(trace.learning?.targetMutation === false, "Learning target mutation is forbidden.");
  assert(trace.learning?.promotionPacketOnly === true, "Learning may emit only a promotion packet.");
  assertPublic(trace);
  return {
    status: "eligible-for-quarantined-learning",
    commit: trace.commit,
    runId: trace.runId,
    eventCount: trace.events.length,
    estimatedCostUsd: cost.estimatedUsd,
    actualBillingClaim: cost.actualBillingClaim
  };
};

const main = async () => {
  const tracePath = process.argv[2];
  if (tracePath === undefined) {
    throw new Error("Usage: node scripts/validate-sd008-learning-trace.mjs <trace.json>");
  }
  let trace;
  try {
    trace = JSON.parse(await readFile(tracePath, "utf8"));
  } catch (error) {
    throw new Error(`Trace is not readable valid JSON: ${error.message}`);
  }
  console.log(JSON.stringify(validateLearningTrace(trace)));
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`SD-008 learning trace rejected: ${error.message}`);
    process.exitCode = 1;
  });
}
