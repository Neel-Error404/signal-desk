import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
let lockfile;
try {
  lockfile = JSON.parse(await readFile("package-lock.json", "utf8"));
} catch {
  throw new Error("package-lock.json is required and must be valid JSON. Run npm install.");
}

if (lockfile.lockfileVersion !== 3) {
  throw new Error(`package-lock.json must use lockfileVersion 3, found ${lockfile.lockfileVersion}.`);
}

const root = lockfile.packages?.[""];
if (root === undefined) {
  throw new Error("package-lock.json does not contain a root package record.");
}

for (const group of ["dependencies", "devDependencies"]) {
  const expected = packageJson[group] ?? {};
  const actual = root[group] ?? {};
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`package-lock.json ${group} does not exactly match package.json.`);
  }

  for (const [name, version] of Object.entries(expected)) {
    const locked = lockfile.packages?.[`node_modules/${name}`];
    if (locked === undefined || locked.version !== version) {
      throw new Error(`${name} must be locked exactly at ${version}.`);
    }
  }
}

console.log("Lockfile matches every exact direct dependency version.");
