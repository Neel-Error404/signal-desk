import { fileURLToPath } from "node:url";
import {
  applyMigrations,
  availableLoopbackPort,
  runNodeCli,
  startLocalPostgres,
  startNextDev,
  stopChild,
  waitForHttp
} from "./local-test-runtime.mjs";

const database = await startLocalPostgres("workflow");
const port = await availableLoopbackPort();
const baseUrl = `http://127.0.0.1:${port}`;
const logs = [];
let server;

try {
  applyMigrations(database.url);
  server = startNextDev(database.url, port, logs);
  await waitForHttp(`${baseUrl}/api/v1/signals?limit=1`);
  const playwrightCli = fileURLToPath(
    new URL("../node_modules/@playwright/test/cli.js", import.meta.url)
  );
  runNodeCli(
    "Workflow tests",
    playwrightCli,
    ["test", "--config", "playwright.config.ts"],
    {
      ...process.env,
      SIGNALDESK_BASE_URL: baseUrl
    }
  );
} finally {
  if (server !== undefined) {
    await stopChild(server);
  }
  await database.postgres.stop();
}
