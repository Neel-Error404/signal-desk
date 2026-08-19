import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { platform } from "node:os";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

export async function availableLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a loopback port."));
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

export function runNodeCli(label, cli, arguments_, environment) {
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

export async function startLocalPostgres(label, persistent = false) {
  const port = await availableLoopbackPort();
  const databaseName = "signaldesk_test";
  const user = "signaldesk_test";
  const password = "local_test_only";
  const databaseDir = fileURLToPath(
    new URL(
      `../.elder/runtime/postgres-${label}-${process.pid}-${Date.now()}`,
      import.meta.url
    )
  );
  await mkdir(databaseDir, { recursive: true });
  const startupDiagnostics = [];
  const postgres = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent,
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: (message) => startupDiagnostics.push(String(message)),
    onError: (error) => startupDiagnostics.push(String(error))
  });

  try {
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase(databaseName);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "process exited before readiness";
    const diagnostic = startupDiagnostics.join("").trim();
    throw new Error(
      `Local PostgreSQL ${label} startup failed: ${reason}.` +
        (diagnostic.length === 0 ? " No PostgreSQL diagnostic was emitted." : ` ${diagnostic}`),
      { cause: error }
    );
  }
  return {
    databaseDir,
    postgres,
    url:
      `postgresql://${user}:${password}@127.0.0.1:${port}/${databaseName}` +
      "?schema=public"
  };
}

export function applyMigrations(databaseUrl) {
  const prismaCli = fileURLToPath(
    new URL("../node_modules/prisma/build/index.js", import.meta.url)
  );
  runNodeCli("Prisma migration", prismaCli, ["migrate", "deploy"], {
    ...process.env,
    DATABASE_URL: databaseUrl
  });
}

export function startNextDev(databaseUrl, port, logs) {
  const nextCli = fileURLToPath(
    new URL("../node_modules/next/dist/bin/next", import.meta.url)
  );
  const child = spawn(
    process.execPath,
    [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NEXT_TELEMETRY_DISABLED: "1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on("data", (chunk) => {
      const text = chunk.toString();
      logs.push(text);
      process.stdout.write(text);
    });
  }
  return child;
}

export async function waitForHttp(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Timed out waiting for ${url}: ${
      lastError instanceof Error ? lastError.message : "unknown error"
    }`
  );
}

export async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 5_000))
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

export async function stopLocalPostgres(postgres, timeoutMs = 10_000) {
  const child = postgres.process;
  if (child === undefined || child.exitCode !== null) {
    await postgres.stop();
    return;
  }
  if (child.pid === undefined) {
    throw new Error("Local PostgreSQL process has no PID for bounded shutdown.");
  }
  if (platform() !== "win32") {
    await postgres.stop();
    return;
  }

  const exited = new Promise((resolve) => child.once("exit", () => resolve(true)));
  const result = spawnSync("taskkill", ["/pid", String(child.pid), "/f", "/t"], {
    encoding: "utf-8"
  });
  if (result.error !== undefined) {
    throw new Error(`Local PostgreSQL taskkill could not start: ${result.error.message}`);
  }
  const stopped = await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs))
  ]);
  if (stopped !== true) {
    throw new Error(
      `Local PostgreSQL process did not exit within ${timeoutMs} milliseconds after stop.`
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `Local PostgreSQL taskkill failed with exit code ${result.status ?? "unknown"}: ` +
        `${result.stderr.trim()}`
    );
  }
  postgres.process = undefined;
  if (postgres.options.persistent === false) {
    await rm(postgres.options.databaseDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100
    });
  }
}
