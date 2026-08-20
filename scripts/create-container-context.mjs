import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve(process.argv[2] ?? ".tmp/container-context");
const expectedCommit = process.env.SIGNALDESK_RELEASE_COMMIT;
if (expectedCommit === undefined || !/^[0-9a-f]{40}$/.test(expectedCommit)) {
  throw new Error("SIGNALDESK_RELEASE_COMMIT must be an exact lowercase 40-character Git commit.");
}

const git = (...arguments_) =>
  execFileSync("git", arguments_, { encoding: "utf8", windowsHide: true }).trim();
const head = git("rev-parse", "HEAD");
if (head !== expectedCommit) {
  throw new Error(`Checked-out HEAD ${head} does not match authorized commit ${expectedCommit}.`);
}

const status = git("status", "--porcelain=v1", "--untracked-files=all");
if (status.length > 0) {
  throw new Error("The normalized container context requires an exact clean Git checkout.");
}

const sourceDateEpoch = git("show", "-s", "--format=%ct", head);
if (!/^[1-9][0-9]*$/.test(sourceDateEpoch)) {
  throw new Error("The exact commit does not expose a valid source timestamp.");
}

await mkdir(outputDirectory, { recursive: true });
const archivePath = path.join(outputDirectory, "source.tar");
execFileSync("git", ["archive", "--format=tar", `--output=${archivePath}`, head], {
  windowsHide: true
});
const archiveDigest = createHash("sha256")
  .update(await readFile(archivePath))
  .digest("hex");
const manifest = {
  schemaVersion: 1,
  commit: head,
  sourceDateEpoch,
  archive: path.basename(archivePath),
  archiveSha256: archiveDigest
};
await writeFile(
  path.join(outputDirectory, "context-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { encoding: "utf8", flag: "wx" }
);
console.log(JSON.stringify(manifest));
