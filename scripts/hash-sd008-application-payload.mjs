import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { resolve, sep } from "node:path";

const DIRECTORY_ROOTS = [
  ".next/server/app",
  ".next/server/chunks",
  ".next/static",
  "node_modules/.prisma/client",
  "prisma"
];
const REQUIRED_FILES = ["scripts/bootstrap-database-roles.mjs", "server.js"];

function parseRoot(argv) {
  if (argv.length !== 2 || argv[0] !== "--root" || argv[1].trim() === "") {
    throw new Error("Usage: node scripts/hash-sd008-application-payload.mjs --root <image-root>");
  }
  return resolve(argv[1]);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function lengthBuffer(value, byteLength) {
  const buffer = Buffer.alloc(byteLength);
  if (byteLength === 4) {
    buffer.writeUInt32BE(value);
  } else {
    buffer.writeBigUInt64BE(BigInt(value));
  }
  return buffer;
}

function pathIdentityMatchesDescriptor(pathMetadata, descriptorMetadata) {
  // Windows reports lstat.dev as zero while FileHandle.stat.dev is nonzero for the same file.
  // inode, size, and modification/change timestamps remain stable across those two APIs.
  const reliableFields = process.platform === "win32"
    ? ["ino", "size", "mtimeNs", "ctimeNs"]
    : ["dev", "ino", "size", "mtimeNs", "ctimeNs"];
  return reliableFields.every((field) => pathMetadata[field] === descriptorMetadata[field]);
}

async function requireDirectory(path, relativePath) {
  let metadata;
  try {
    metadata = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Required payload path is missing: ${relativePath}`);
    }
    throw error;
  }
  if (metadata.isSymbolicLink()) {
    throw new Error(`Symbolic link is not allowed in the selected payload: ${relativePath}`);
  }
  if (!metadata.isDirectory()) {
    throw new Error(`Required payload path is not a directory: ${relativePath}`);
  }
}

async function requireFile(path, relativePath) {
  let metadata;
  try {
    metadata = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Required payload path is missing: ${relativePath}`);
    }
    throw error;
  }
  if (metadata.isSymbolicLink()) {
    throw new Error(`Symbolic link is not allowed in the selected payload: ${relativePath}`);
  }
  if (!metadata.isFile()) {
    throw new Error(`Required payload path is not a regular file: ${relativePath}`);
  }
}

async function validateRoot(root) {
  let metadata;
  try {
    metadata = await lstat(root);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Image root does not exist.");
    }
    throw error;
  }
  if (metadata.isSymbolicLink()) {
    throw new Error("Symbolic link is not allowed for the image root.");
  }
  if (!metadata.isDirectory()) {
    throw new Error("Image root is not a directory.");
  }
}

async function validateDirectoryChain(root, relativeRoot) {
  let current = root;
  for (const segment of relativeRoot.split("/")) {
    current = `${current}${sep}${segment}`;
    await requireDirectory(current, relativeRoot);
  }
  return current;
}

async function collectDirectory(root, absoluteDirectory, relativeDirectory, files) {
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  entries.sort((left, right) => compareText(left.name, right.name));
  for (const entry of entries) {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    const absolutePath = `${root}${sep}${relativePath.replaceAll("/", sep)}`;
    const metadata = await lstat(absolutePath);
    if (metadata.isSymbolicLink()) {
      throw new Error(`Symbolic link is not allowed in the selected payload: ${relativePath}`);
    }
    if (metadata.isDirectory()) {
      await collectDirectory(root, absolutePath, relativePath, files);
      continue;
    }
    if (!metadata.isFile()) {
      throw new Error(`Selected payload entry is not a regular file: ${relativePath}`);
    }
    if (relativeDirectory.startsWith(".next/server/app") && entry.name.endsWith(".nft.json")) {
      continue;
    }
    files.push({ absolutePath, relativePath });
  }
}

async function hashPayload(root) {
  await validateRoot(root);
  const files = [];
  for (const relativeRoot of DIRECTORY_ROOTS) {
    const absoluteRoot = await validateDirectoryChain(root, relativeRoot);
    await collectDirectory(root, absoluteRoot, relativeRoot, files);
  }
  for (const relativePath of REQUIRED_FILES) {
    const separatorIndex = relativePath.lastIndexOf("/");
    if (separatorIndex >= 0) {
      await validateDirectoryChain(root, relativePath.slice(0, separatorIndex));
    }
    const absolutePath = `${root}${sep}${relativePath.replaceAll("/", sep)}`;
    await requireFile(absolutePath, relativePath);
    files.push({ absolutePath, relativePath });
  }
  files.sort((left, right) => compareText(left.relativePath, right.relativePath));
  if (files.length === 0) {
    throw new Error("Selected application payload contains zero files.");
  }

  const hash = createHash("sha256");
  hash.update("signaldesk-sd008-application-payload-v1\0");
  for (const file of files) {
    const pathBytes = Buffer.from(file.relativePath, "utf8");
    const pathMetadata = await lstat(file.absolutePath, { bigint: true });
    if (pathMetadata.isSymbolicLink()) {
      throw new Error(`Symbolic link is not allowed in the selected payload: ${file.relativePath}`);
    }
    if (!pathMetadata.isFile()) {
      throw new Error(`Selected payload entry is not a regular file: ${file.relativePath}`);
    }
    const noFollowFlag = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
    let handle;
    try {
      handle = await open(file.absolutePath, constants.O_RDONLY | noFollowFlag);
    } catch (error) {
      if (error?.code === "ELOOP") {
        throw new Error(`Symbolic link is not allowed in the selected payload: ${file.relativePath}`);
      }
      throw error;
    }
    let before;
    let after;
    let bytesRead = 0n;
    try {
      before = await handle.stat({ bigint: true });
      if (!before.isFile()) {
        throw new Error(`Selected payload entry is not a regular file: ${file.relativePath}`);
      }
      if (!pathIdentityMatchesDescriptor(pathMetadata, before)) {
        throw new Error(`Selected payload path identity changed before hashing: ${file.relativePath}`);
      }
      hash.update(lengthBuffer(pathBytes.length, 4));
      hash.update(pathBytes);
      hash.update(lengthBuffer(before.size, 8));
      for await (const chunk of handle.createReadStream({ autoClose: false })) {
        bytesRead += BigInt(chunk.length);
        hash.update(chunk);
      }
      after = await handle.stat({ bigint: true });
    } finally {
      await handle.close();
    }
    const stableFields = ["dev", "ino", "size", "mtimeNs", "ctimeNs"];
    const metadataChanged = stableFields.some((field) => before[field] !== after[field]);
    if (bytesRead !== before.size || metadataChanged) {
      throw new Error(`Selected payload file changed while hashing: ${file.relativePath}`);
    }
  }

  return { schemaVersion: 1, sha256: hash.digest("hex"), fileCount: files.length };
}

try {
  const result = await hashPayload(parseRoot(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown application payload hashing error.";
  process.stderr.write(`SD-008 application payload hashing failed: ${message}\n`);
  process.exitCode = 1;
}
