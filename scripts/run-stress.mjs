import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMigrations,
  availableLoopbackPort,
  startLocalPostgres,
  startNextDev,
  stopChild,
  stopLocalPostgres,
  waitForHttp
} from "./local-test-runtime.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function jsonPost(baseUrl, route, body) {
  return fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000)
  });
}

const database = await startLocalPostgres("stress", true);
const port = await availableLoopbackPort();
const baseUrl = `http://127.0.0.1:${port}`;
const logs = [];
let databaseRunning = true;
let server;
let checks = 0;

try {
  applyMigrations(database.url);
  server = startNextDev(database.url, port, logs);
  await waitForHttp(`${baseUrl}/api/v1/signals?limit=1`);

  const oversized = await jsonPost(baseUrl, "/api/v1/feedback", {
    content: "x".repeat(17_000),
    contentAcknowledged: true
  });
  assert(oversized.status === 413, `Expected oversized body 413, received ${oversized.status}.`);
  checks += 1;

  const secretMarker = `ghp_${"a".repeat(36)}`;
  const restricted = await jsonPost(baseUrl, "/api/v1/feedback", {
    content: secretMarker,
    contentAcknowledged: true
  });
  assert(
    restricted.status === 422,
    `Expected restricted-content 422, received ${restricted.status}.`
  );
  checks += 1;

  const confidentialMarker = `stress-private-${crypto.randomUUID()}`;
  const createdResponse = await jsonPost(baseUrl, "/api/v1/feedback", {
    content: confidentialMarker,
    contentAcknowledged: true
  });
  assert(createdResponse.status === 201, `Expected create 201, received ${createdResponse.status}.`);
  const created = await createdResponse.json();
  const signalId = created.signal.id;
  checks += 1;

  const triageResponses = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      jsonPost(baseUrl, `/api/v1/signals/${signalId}/triage-events`, {
        expectedRevision: 0,
        toState: "reviewing",
        rationale: `Concurrent review ${index}.`,
        operatorLabel: "Stress operator",
        contentAcknowledged: true
      })
    )
  );
  const triageStatuses = triageResponses.map((response) => response.status);
  assert(
    triageStatuses.filter((status) => status === 201).length === 1 &&
      triageStatuses.filter((status) => status === 409).length === 11,
    `Expected one 201 and eleven 409 triage responses, received ${triageStatuses.join(", ")}.`
  );
  checks += 1;

  const nonAcceptedIssue = await jsonPost(
    baseUrl,
    `/api/v1/signals/${signalId}/product-issue`,
    {
      expectedSignalRevision: 1,
      title: "Issue must wait for acceptance",
      priority: "high",
      rationale: "A reviewing signal is not eligible.",
      operatorLabel: "Stress operator",
      contentAcknowledged: true
    }
  );
  assert(
    nonAcceptedIssue.status === 409,
    `Expected non-accepted issue promotion 409, received ${nonAcceptedIssue.status}.`
  );
  checks += 1;

  const accepted = await jsonPost(baseUrl, `/api/v1/signals/${signalId}/triage-events`, {
    expectedRevision: 1,
    toState: "accepted",
    rationale: "Stress impact confirmed.",
    operatorLabel: "Stress operator",
    contentAcknowledged: true
  });
  assert(accepted.status === 201, `Expected acceptance 201, received ${accepted.status}.`);

  const staleIssue = await jsonPost(baseUrl, `/api/v1/signals/${signalId}/product-issue`, {
    expectedSignalRevision: 1,
    title: "Stale issue decision",
    priority: "high",
    rationale: "The expected revision is stale.",
    operatorLabel: "Stress operator",
    contentAcknowledged: true
  });
  assert(
    staleIssue.status === 409,
    `Expected stale issue promotion 409, received ${staleIssue.status}.`
  );
  checks += 1;

  const issueTitle = `Stress prioritized issue ${crypto.randomUUID()}`;
  const issueResponses = await Promise.all(
    Array.from({ length: 12 }, () =>
      jsonPost(baseUrl, `/api/v1/signals/${signalId}/product-issue`, {
        expectedSignalRevision: 2,
        title: issueTitle,
        priority: "critical",
        rationale: "Concurrent promotion must accept one winner.",
        operatorLabel: "Stress operator",
        contentAcknowledged: true
      })
    )
  );
  const issueStatuses = issueResponses.map((response) => response.status);
  assert(
    issueStatuses.filter((status) => status === 201).length === 1 &&
      issueStatuses.filter((status) => status === 409).length === 11,
    `Expected one 201 and eleven 409 issue responses, received ${issueStatuses.join(", ")}.`
  );
  checks += 1;

  const issueWinner = issueResponses.find((response) => response.status === 201);
  assert(issueWinner !== undefined, "Concurrent issue promotion did not return a winner.");
  const issueResult = await issueWinner.json();
  const productIssueId = issueResult.productIssue.id;

  const missingBrief = await jsonPost(
    baseUrl,
    "/api/v1/product-issues/11111111-1111-4111-8111-111111111111/implementation-brief",
    {
      objective: "Missing source must fail.",
      acceptanceCriteria: ["A missing Product Issue cannot receive a brief."],
      constraints: [],
      approvedBy: "Stress operator",
      contentAcknowledged: true
    }
  );
  assert(
    missingBrief.status === 404,
    `Expected missing Product Issue 404, received ${missingBrief.status}.`
  );
  checks += 1;

  const briefObjective = `Stress approved brief ${crypto.randomUUID()}`;
  const briefResponses = await Promise.all(
    Array.from({ length: 12 }, () =>
      jsonPost(
        baseUrl,
        `/api/v1/product-issues/${productIssueId}/implementation-brief`,
        {
          objective: briefObjective,
          acceptanceCriteria: [
            "The export preserves the selected date range.",
            "The approved behavior survives reload."
          ],
          constraints: ["Do not change retention."],
          approvedBy: "Stress operator",
          contentAcknowledged: true
        }
      )
    )
  );
  const briefStatuses = briefResponses.map((response) => response.status);
  assert(
    briefStatuses.filter((status) => status === 201).length === 1 &&
      briefStatuses.filter((status) => status === 409).length === 11,
    `Expected one 201 and eleven 409 brief responses, received ${briefStatuses.join(", ")}.`
  );
  checks += 1;

  const briefWinner = briefResponses.find((response) => response.status === 201);
  assert(briefWinner !== undefined, "Concurrent brief approval did not return a winner.");
  const briefResult = await briefWinner.json();
  const implementationBriefId = briefResult.implementationBrief.id;

  const missingDelivery = await jsonPost(
    baseUrl,
    "/api/v1/implementation-briefs/11111111-1111-4111-8111-111111111111/review-delivery",
    {
      baseBranch: "work/sd-003-approved-implementation-brief",
      headBranch: "work/sd-004-review-delivery",
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      pullRequestUrl: "https://github.com/Neel-Error404/signal-desk/pull/3",
      verificationSummary: "Missing source must fail.",
      deliveredBy: "Stress operator",
      contentAcknowledged: true
    }
  );
  assert(
    missingDelivery.status === 404,
    `Expected missing Implementation Brief 404, received ${missingDelivery.status}.`
  );
  checks += 1;

  const deliverySummary = `Stress review delivery ${crypto.randomUUID()}`;
  const deliveryResponses = await Promise.all(
    Array.from({ length: 12 }, () =>
      jsonPost(
        baseUrl,
        `/api/v1/implementation-briefs/${implementationBriefId}/review-delivery`,
        {
          baseBranch: "work/sd-003-approved-implementation-brief",
          headBranch: "work/sd-004-review-delivery",
          commitSha: "0123456789abcdef0123456789abcdef01234567",
          pullRequestUrl: "https://github.com/Neel-Error404/signal-desk/pull/3",
          verificationSummary: deliverySummary,
          deliveredBy: "Stress operator",
          contentAcknowledged: true
        }
      )
    )
  );
  const deliveryStatuses = deliveryResponses.map((response) => response.status);
  assert(
    deliveryStatuses.filter((status) => status === 201).length === 1 &&
      deliveryStatuses.filter((status) => status === 409).length === 11,
    `Expected one 201 and eleven 409 delivery responses, received ${deliveryStatuses.join(", ")}.`
  );
  checks += 1;

  const deliveryWinner = deliveryResponses.find((response) => response.status === 201);
  assert(deliveryWinner !== undefined, "Concurrent review delivery did not return a winner.");
  const deliveryResult = await deliveryWinner.json();
  const reviewDeliveryId = deliveryResult.reviewDelivery.id;

  const completionBody = {
    mergedCommitSha: "89abcdef0123456789abcdef0123456789abcdef",
    completionSummary: `Stress completed fix ${crypto.randomUUID()}`,
    completedBy: "Stress operator",
    mergeConfirmedOutsideSignalDesk: true,
    contentAcknowledged: true
  };
  const missingCompletion = await jsonPost(
    baseUrl,
    "/api/v1/review-deliveries/11111111-1111-4111-8111-111111111111/completed-fix",
    completionBody
  );
  assert(
    missingCompletion.status === 404,
    `Expected missing Review Delivery 404, received ${missingCompletion.status}.`
  );
  checks += 1;

  const completionResponses = await Promise.all(
    Array.from({ length: 12 }, () =>
      jsonPost(
        baseUrl,
        `/api/v1/review-deliveries/${reviewDeliveryId}/completed-fix`,
        completionBody
      )
    )
  );
  const completionStatuses = completionResponses.map((response) => response.status);
  assert(
    completionStatuses.filter((status) => status === 201).length === 1 &&
      completionStatuses.filter((status) => status === 409).length === 11,
    `Expected one 201 and eleven 409 completion responses, received ${completionStatuses.join(", ")}.`
  );
  checks += 1;

  const completionWinner = completionResponses.find((response) => response.status === 201);
  assert(completionWinner !== undefined, "Concurrent completion did not return a winner.");
  const completionResult = await completionWinner.json();
  const completedFixId = completionResult.completedFix.id;
  const communicationBody = {
    audience: `Stress audience ${crypto.randomUUID()}`,
    subject: "Stress release communication",
    message: `Stress approved message ${crypto.randomUUID()}`,
    approvedBy: "Stress operator",
    approvalConfirmed: true,
    contentAcknowledged: true
  };
  const missingCommunication = await jsonPost(
    baseUrl,
    "/api/v1/completed-fixes/11111111-1111-4111-8111-111111111111/release-communication",
    communicationBody
  );
  assert(
    missingCommunication.status === 404,
    `Expected missing Completed Fix 404, received ${missingCommunication.status}.`
  );
  checks += 1;

  const communicationResponses = await Promise.all(
    Array.from({ length: 12 }, () =>
      jsonPost(
        baseUrl,
        `/api/v1/completed-fixes/${completedFixId}/release-communication`,
        communicationBody
      )
    )
  );
  const communicationStatuses = communicationResponses.map((response) => response.status);
  assert(
    communicationStatuses.filter((status) => status === 201).length === 1 &&
      communicationStatuses.filter((status) => status === 409).length === 11,
    `Expected one 201 and eleven 409 communication responses, received ${communicationStatuses.join(", ")}.`
  );
  checks += 1;

  const bulkResponses = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      jsonPost(baseUrl, "/api/v1/feedback", {
        content: `Bulk feedback ${index} ${crypto.randomUUID()}`,
        contentAcknowledged: true
      })
    )
  );
  const bulkFailures = bulkResponses.filter((response) => response.status !== 201);
  assert(
    bulkFailures.length === 0,
    `Expected twenty successful concurrent creates; ${bulkFailures.length} failed.`
  );
  checks += 1;

  await stopLocalPostgres(database.postgres);
  databaseRunning = false;
  const unavailable = await fetch(`${baseUrl}/api/v1/signals?limit=1`, {
    signal: AbortSignal.timeout(20_000)
  });
  assert(
    unavailable.status === 503,
    `Expected database outage 503, received ${unavailable.status}.`
  );
  checks += 1;

  await database.postgres.start();
  databaseRunning = true;
  await waitForHttp(`${baseUrl}/api/v1/signals?limit=1`, 30_000);
  const recovered = await fetch(`${baseUrl}/api/v1/signals/${signalId}`, {
    signal: AbortSignal.timeout(20_000)
  });
  assert(recovered.status === 200, `Expected recovered detail 200, received ${recovered.status}.`);
  const recoveredDetail = await recovered.json();
  assert(
    recoveredDetail.signal.revision === 2 &&
      recoveredDetail.triageEvents.length === 2 &&
      recoveredDetail.productIssue?.title === issueTitle &&
      recoveredDetail.implementationBrief?.objective === briefObjective &&
      recoveredDetail.reviewDelivery?.verificationSummary === deliverySummary &&
      recoveredDetail.completedFix?.completionSummary === completionBody.completionSummary &&
      recoveredDetail.releaseCommunication?.message === communicationBody.message &&
      recoveredDetail.releaseCommunication?.publicationStatus === "not-sent",
    "Recovered signal did not preserve triage, Product Issue, brief, delivery, completion, and approved communication state."
  );
  checks += 1;

  const serverLogs = logs.join("");
  assert(
    !serverLogs.includes(secretMarker) &&
      !serverLogs.includes(confidentialMarker) &&
      !serverLogs.includes(issueTitle) &&
      !serverLogs.includes(briefObjective) &&
      !serverLogs.includes(deliverySummary) &&
      !serverLogs.includes(completionBody.completionSummary) &&
      !serverLogs.includes(communicationBody.audience) &&
      !serverLogs.includes(communicationBody.message),
    "Server logs exposed submitted confidential or restricted content."
  );
  checks += 1;

  console.log(`Stress checks passed (${checks}).`);
} finally {
  if (server !== undefined) {
    await stopChild(server);
  }
  if (databaseRunning) {
    await stopLocalPostgres(database.postgres);
  }
  const runtimeRoot = path.resolve(
    fileURLToPath(new URL("../.elder/runtime", import.meta.url))
  );
  const databaseDir = path.resolve(database.databaseDir);
  if (!databaseDir.startsWith(`${runtimeRoot}${path.sep}`)) {
    throw new Error(`Refused to remove unexpected PostgreSQL path: ${databaseDir}`);
  }
  await rm(databaseDir, { recursive: true, force: true });
}
