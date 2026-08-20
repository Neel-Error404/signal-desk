import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const migrationsRoot = path.resolve("prisma", "migrations");
const destructiveSql = [
  /\bDROP\s+(?:TABLE|COLUMN|TYPE|SCHEMA|DATABASE)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+(?:TABLE|TYPE)\b[\s\S]*?\bRENAME\b/i,
  /\bALTER\s+TABLE\b[\s\S]*?\bALTER\s+COLUMN\b/i
];

const directories = (await readdir(migrationsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (directories.length === 0) {
  throw new Error("No Prisma migrations exist; migration safety cannot be established.");
}

for (const directory of directories) {
  const migrationPath = path.join(migrationsRoot, directory, "migration.sql");
  const sql = await readFile(migrationPath, "utf8");
  const violation = destructiveSql.find((pattern) => pattern.test(sql));
  if (violation !== undefined) {
    throw new Error(
      `Destructive or contract-phase SQL is forbidden in ${migrationPath}: ${violation.source}`
    );
  }
}

console.log(
  `Migration safety accepted ${directories.length} expand-compatible migrations and found no destructive SQL.`
);
