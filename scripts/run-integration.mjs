import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import { stopLocalPostgres, testRuntimeRoot } from "./local-test-runtime.mjs";

async function availableLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a loopback port for PostgreSQL."));
        return;
      }
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function runNodeCli(label, cli, arguments_, environment) {
  const result = spawnSync(process.execPath, [cli, ...arguments_], {
    env: environment,
    stdio: "inherit"
  });
  if (result.error !== undefined) {
    throw new Error(`${label} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function roleUrl(databaseUrl, role, password) {
  const url = new URL(databaseUrl);
  url.username = role;
  url.password = password;
  return url.toString();
}

async function run(databaseUrl, bootstrapRoles = false) {
  let migrationUrl = databaseUrl;
  let runtimeUrl = databaseUrl;
  if (bootstrapRoles) {
    const bootstrapScript = fileURLToPath(
      new URL("./bootstrap-database-roles.mjs", import.meta.url)
    );
    const migrationPassword = "local_Migration_0123456789abcdef";
    const runtimePassword = "local_Runtime_0123456789abcdefghi";
    runNodeCli("Database role bootstrap", bootstrapScript, [], {
      ...process.env,
      DATABASE_ADMIN_URL: databaseUrl,
      SIGNALDESK_MIGRATION_PASSWORD: migrationPassword,
      SIGNALDESK_RUNTIME_PASSWORD: runtimePassword
    });
    migrationUrl = roleUrl(databaseUrl, "signaldesk_migration", migrationPassword);
    runtimeUrl = roleUrl(databaseUrl, "signaldesk_runtime", runtimePassword);
  }
  const environment = {
    ...process.env,
    DATABASE_URL: runtimeUrl,
    TEST_DATABASE_URL: runtimeUrl,
    TEST_ADMIN_DATABASE_URL: databaseUrl
  };
  const prismaCli = fileURLToPath(
    new URL("../node_modules/prisma/build/index.js", import.meta.url)
  );
  const vitestCli = fileURLToPath(
    new URL("../node_modules/vitest/vitest.mjs", import.meta.url)
  );

  runNodeCli("Prisma migration", prismaCli, ["migrate", "deploy"], {
    ...environment,
    DATABASE_URL: migrationUrl
  });
  runNodeCli(
    "Integration tests",
    vitestCli,
    ["run", "--config", "vitest.integration.config.ts"],
    environment
  );
}

const suppliedUrl = process.env.TEST_DATABASE_URL;
if (typeof suppliedUrl === "string" && suppliedUrl.trim().length > 0) {
  if (!/^postgres(?:ql)?:\/\//i.test(suppliedUrl)) {
    throw new Error("Integration refused: TEST_DATABASE_URL must use PostgreSQL.");
  }
  await run(suppliedUrl);
} else {
  const port = await availableLoopbackPort();
  const databaseName = "signaldesk_test";
  const user = "signaldesk_test";
  const password = "local_integration_only";
  const databaseDir = path.join(
    testRuntimeRoot(),
    `postgres-integration-${process.pid}-${Date.now()}`
  );
  await mkdir(databaseDir, { recursive: true });
  const postgres = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent: false,
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: (error) => console.error(error)
  });

  try {
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase(databaseName);
    const databaseUrl =
      `postgresql://${user}:${password}@127.0.0.1:${port}/${databaseName}` +
      "?schema=public";
    await run(databaseUrl, true);
  } finally {
    await stopLocalPostgres(postgres);
  }
}
