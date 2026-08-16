import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMigrations,
  availableLoopbackPort,
  startLocalPostgres,
  startNextDev,
  stopChild,
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

  await database.postgres.stop();
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
    recoveredDetail.signal.revision === 1 && recoveredDetail.triageEvents.length === 1,
    "Recovered signal did not preserve its accepted concurrent triage event."
  );
  checks += 1;

  const serverLogs = logs.join("");
  assert(
    !serverLogs.includes(secretMarker) && !serverLogs.includes(confidentialMarker),
    "Server logs exposed submitted confidential or restricted content."
  );
  checks += 1;

  console.log(`Stress checks passed (${checks}).`);
} finally {
  if (server !== undefined) {
    await stopChild(server);
  }
  if (databaseRunning) {
    await database.postgres.stop();
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
