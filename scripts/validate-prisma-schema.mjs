import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const environment = {
  ...process.env,
  DATABASE_URL:
    "postgresql://schema_validation:schema_validation@127.0.0.1:5432/signaldesk_schema_validation?schema=public"
};
const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url)
);
const result = spawnSync(process.execPath, [prismaCli, "validate"], {
  env: environment,
  stdio: "inherit"
});

if (result.error !== undefined) {
  throw new Error(`Could not start the local Prisma CLI: ${result.error.message}`);
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
