import { PrismaClient } from "@prisma/client";

const requiredSecret = (name) => {
  const value = process.env[name];
  if (
    value === undefined ||
    value.length < 32 ||
    value.length > 128 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new Error(`${name} is missing or outside the accepted secret format.`);
  }
  return value;
};

const databaseUrl = process.env.DATABASE_ADMIN_URL;
if (
  databaseUrl === undefined ||
  databaseUrl.length < 32 ||
  databaseUrl.length > 2_048 ||
  !databaseUrl.startsWith("postgresql://")
) {
  throw new Error("DATABASE_ADMIN_URL is missing or outside the accepted PostgreSQL URL format.");
}
const migrationPassword = requiredSecret("SIGNALDESK_MIGRATION_PASSWORD");
const runtimePassword = requiredSecret("SIGNALDESK_RUNTIME_PASSWORD");
const parsedDatabaseUrl = new URL(databaseUrl);
const administratorRole = decodeURIComponent(parsedDatabaseUrl.username);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\//, ""));
const identifierPattern = /^[a-z][a-z0-9_]{0,62}$/;
if (!identifierPattern.test(administratorRole) || !identifierPattern.test(databaseName)) {
  throw new Error("DATABASE_ADMIN_URL contains an unsafe role or database identifier.");
}

const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const client = new PrismaClient({ datasourceUrl: databaseUrl, log: [] });

try {
  await client.$transaction([
    client.$executeRawUnsafe(`
      DO $roles$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'signaldesk_migration') THEN
          CREATE ROLE signaldesk_migration LOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'signaldesk_runtime') THEN
          CREATE ROLE signaldesk_runtime LOGIN;
        END IF;
      END
      $roles$;
    `),
    client.$executeRawUnsafe(
      `ALTER ROLE signaldesk_migration PASSWORD ${literal(migrationPassword)}`
    ),
    client.$executeRawUnsafe(
      `ALTER ROLE signaldesk_runtime PASSWORD ${literal(runtimePassword)}`
    ),
    client.$executeRawUnsafe(
      `GRANT CONNECT ON DATABASE "${databaseName}" TO signaldesk_migration, signaldesk_runtime`
    ),
    client.$executeRawUnsafe(
      `GRANT signaldesk_migration TO "${administratorRole}"`
    ),
    client.$executeRawUnsafe(
      "GRANT USAGE, CREATE ON SCHEMA public TO signaldesk_migration"
    ),
    client.$executeRawUnsafe(
      "GRANT USAGE ON SCHEMA public TO signaldesk_runtime"
    ),
    client.$executeRawUnsafe(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO signaldesk_runtime"
    ),
    client.$executeRawUnsafe(
      "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO signaldesk_runtime"
    ),
    client.$executeRawUnsafe(
      "ALTER DEFAULT PRIVILEGES FOR ROLE signaldesk_migration IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO signaldesk_runtime"
    ),
    client.$executeRawUnsafe(
      "ALTER DEFAULT PRIVILEGES FOR ROLE signaldesk_migration IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO signaldesk_runtime"
    )
  ]);
  console.log("SignalDesk database roles and least-privilege grants are ready.");
} finally {
  await client.$disconnect();
}
