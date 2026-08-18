import { readdir } from "node:fs/promises";
import path from "node:path";

const roots = ["src", "tests"];
const sourcePattern = /^(?:src\/app\/|src\/composition\/|src\/modules\/(?:feedback-intake|signal-inbox|product-issues|implementation-briefs|review-deliveries|completed-fixes)\/(?:domain|application|infrastructure|http)\/|src\/workflows\/(?:feedback-to-signal|signal-to-issue|issue-to-brief|brief-to-delivery|delivery-to-completion)\/|src\/platform\/(?:database|http)\/|src\/shared\/|tests\/(?:foundation|component|integration|workflow|stress)\/)/;

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesUnder(entryPath)));
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(entryPath.replaceAll("\\", "/"));
    }
  }
  return files;
}

const files = (await Promise.all(roots.map(filesUnder))).flat();
const unknown = files.filter((file) => !sourcePattern.test(`${file}/`));
if (unknown.length > 0) {
  throw new Error(`Source modules outside the fail-closed layout:\n${unknown.join("\n")}`);
}
console.log(`Source layout accepted ${files.length} TypeScript modules and rejected unknown roots.`);
