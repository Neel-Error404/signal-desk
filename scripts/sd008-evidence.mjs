import {
  constants,
  createCipheriv,
  createHash,
  createPublicKey,
  publicEncrypt,
  randomBytes
} from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const COMMIT = /^[0-9a-f]{40}$/;
const RUN_ID = /^[1-9][0-9]*$/;
const PHASES = new Set(["provision", "traffic", "teardown"]);
const SECRET_KEYS = new Set([
  "authorization",
  "clientsecret",
  "connectionstring",
  "cookie",
  "password",
  "refreshtoken",
  "token"
]);
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /\b(?:gh[opsu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:/]+:[^\s@]+@/i,
  /(?:password|client_secret|access_token|refresh_token)=([^&\s]{8,})/i
];
const SENSITIVE_KEY =
  /(?:subscription|tenant|client|object|principal|customer|workspace|resource)[-_]?(?:id|identifier)$|(?:fqdn|host(?:name)?|private[-_]?ip|server[-_]?name|vault[-_]?name|endpoint[-_]?url)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AZURE_RESOURCE_ID = /^\/subscriptions\/[^/]+\//i;
const PRIVATE_IPV4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/;
const PRIVATE_HOST = /(?:\.postgres\.database\.azure\.com|\.azurecontainerapps\.io)$/i;

export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

const canonicalValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])])
    );
  }
  return value;
};

export const canonicalJson = (value) => JSON.stringify(canonicalValue(value));

const assertString = (value, label, pattern) => {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
};

const assertNoSecret = (value, location = "$") => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecret(entry, `${location}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      const normalizedKey = key.replaceAll(/[^A-Za-z0-9]/g, "").toLowerCase();
      if (SECRET_KEYS.has(normalizedKey)) {
        throw new Error(`Secret-shaped field is forbidden at ${location}.${key}.`);
      }
      assertNoSecret(entry, `${location}.${key}`);
    }
    return;
  }
  if (typeof value === "string") {
    const match = SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(value));
    if (match !== undefined) {
      throw new Error(`Secret-shaped value is forbidden at ${location}.`);
    }
  }
};

const redactionKind = (key, value) => {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  if (SENSITIVE_KEY.test(key)) {
    return key.replaceAll(/[^A-Za-z0-9]+/g, "-").toLowerCase();
  }
  if (AZURE_RESOURCE_ID.test(value)) {
    return "azure-resource-id";
  }
  if (PRIVATE_IPV4.test(value)) {
    return "private-ip";
  }
  if (PRIVATE_HOST.test(value)) {
    return "private-host";
  }
  if (UUID.test(value) && !/(?:correlation|event|operation)[-_]?id$/i.test(key)) {
    return "uuid-identifier";
  }
  return undefined;
};

export const redactEvidence = (value, key = "root") => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactEvidence(entry, key));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entry]) => [
        entryKey,
        redactEvidence(entry, entryKey)
      ])
    );
  }
  const kind = redactionKind(key, value);
  if (kind === undefined) {
    return value;
  }
  return {
    redacted: true,
    kind,
    sha256: sha256(Buffer.from(value, "utf8"))
  };
};

const parseInput = async ({ label, file }) => {
  if (!/^[a-z][a-z0-9-]{1,63}$/.test(label)) {
    throw new Error(`Evidence label ${label} is invalid.`);
  }
  const bytes = await readFile(file);
  const sourceSha256 = sha256(bytes);
  const sourcePath = path.basename(file);
  const sourceText = bytes.toString("utf8");
  let payload;
  if (file.endsWith(".jsonl")) {
    const lines = sourceText.split(/\r?\n/).filter((line) => line.length > 0);
    payload = lines.map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${sourcePath} line ${index + 1} is not valid JSON: ${error.message}`);
      }
    });
  } else {
    try {
      payload = JSON.parse(sourceText);
    } catch (error) {
      throw new Error(`${sourcePath} is not valid JSON: ${error.message}`);
    }
  }
  assertNoSecret(payload, `$.sources.${label}`);
  return { label, sourcePath, sourceSha256, payload };
};

const encryptPrivatePacket = ({ packet, publicKeyPem, metadata }) => {
  const publicKey = createPublicKey(publicKeyPem);
  if (publicKey.asymmetricKeyType !== "rsa") {
    throw new Error("SD-008 evidence encryption requires an RSA public key.");
  }
  const modulusLength = publicKey.asymmetricKeyDetails?.modulusLength ?? 0;
  if (modulusLength < 3072) {
    throw new Error("SD-008 evidence encryption requires an RSA key of at least 3072 bits.");
  }
  const plaintext = Buffer.from(canonicalJson(packet), "utf8");
  const plaintextSha256 = sha256(plaintext);
  const dataKey = randomBytes(32);
  const iv = randomBytes(12);
  const aad = Buffer.from(canonicalJson(metadata), "utf8");
  const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();
  const encryptedKey = publicEncrypt(
    {
      key: publicKey,
      oaepHash: "sha256",
      padding: constants.RSA_PKCS1_OAEP_PADDING
    },
    dataKey
  );
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  return {
    schemaVersion: 1,
    encryption: "AES-256-GCM+RSA-OAEP-SHA256",
    metadata,
    ownerPublicKeySha256: sha256(publicKeyDer),
    plaintextSha256,
    encryptedKeyBase64: encryptedKey.toString("base64"),
    ivBase64: iv.toString("base64"),
    authenticationTagBase64: authenticationTag.toString("base64"),
    ciphertextBase64: ciphertext.toString("base64")
  };
};

export const exportEvidence = async ({ phase, commit, runId, createdAt, publicKeyPem, inputs }) => {
  if (!PHASES.has(phase)) {
    throw new Error(`Unsupported SD-008 evidence phase ${phase}.`);
  }
  assertString(commit, "commit", COMMIT);
  assertString(runId, "run ID", RUN_ID);
  const timestamp = new Date(createdAt);
  if (!Number.isFinite(timestamp.valueOf()) || timestamp.toISOString() !== createdAt) {
    throw new Error("createdAt must be an exact UTC ISO-8601 timestamp.");
  }
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("At least one SD-008 evidence input is required.");
  }
  const parsedInputs = await Promise.all(inputs.map(parseInput));
  const labels = new Set(parsedInputs.map(({ label }) => label));
  if (labels.size !== parsedInputs.length) {
    throw new Error("SD-008 evidence input labels must be unique.");
  }
  const sourceManifest = parsedInputs
    .map(({ label, sourcePath, sourceSha256 }) => ({ label, sourcePath, sourceSha256 }))
    .sort((left, right) => left.label.localeCompare(right.label));
  const rawPayloads = Object.fromEntries(
    parsedInputs.map(({ label, payload }) => [label, payload])
  );
  const privatePacket = {
    schemaVersion: 1,
    classification: "owner-controlled-confidential",
    workItem: "SD-008",
    phase,
    commit,
    runId,
    createdAt,
    sourceManifest,
    payloads: rawPayloads
  };
  const envelopeMetadata = {
    schemaVersion: 1,
    workItem: "SD-008",
    phase,
    commit,
    runId,
    createdAt
  };
  const privateEnvelope = encryptPrivatePacket({
    packet: privatePacket,
    publicKeyPem,
    metadata: envelopeMetadata
  });
  const privateEnvelopeSha256 = sha256(Buffer.from(canonicalJson(privateEnvelope), "utf8"));
  const publicPacket = {
    schemaVersion: 1,
    classification: "public-redacted",
    workItem: "SD-008",
    phase,
    commit,
    runId,
    createdAt,
    sourceManifest,
    payloads: redactEvidence(rawPayloads),
    privacy: {
      secretScan: "passed",
      rawProviderArtifactsUploaded: false,
      sensitiveIdentifiers: "typed-sha256-bindings",
      privatePacketEncryption: privateEnvelope.encryption,
      ownerPublicKeySha256: privateEnvelope.ownerPublicKeySha256,
      privatePacketSha256: privateEnvelope.plaintextSha256,
      privateEnvelopeSha256
    }
  };
  assertNoSecret(publicPacket);
  return { publicPacket, privateEnvelope };
};

const parseArguments = (arguments_) => {
  const values = { inputs: [] };
  for (let index = 0; index < arguments_.length; index += 1) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    index += 1;
    if (name === "--input") {
      const separator = value.indexOf("=");
      if (separator < 1 || separator === value.length - 1) {
        throw new Error("--input must use label=path.");
      }
      values.inputs.push({ label: value.slice(0, separator), file: value.slice(separator + 1) });
    } else {
      values[name.slice(2).replaceAll("-", "_")] = value;
    }
  }
  return values;
};

const main = async () => {
  const arguments_ = parseArguments(process.argv.slice(2));
  for (const required of [
    "phase",
    "commit",
    "run_id",
    "created_at",
    "public_key_base64",
    "public_output",
    "private_envelope_output"
  ]) {
    if (arguments_[required] === undefined) {
      throw new Error(`--${required.replaceAll("_", "-")} is required.`);
    }
  }
  let publicKeyPem;
  try {
    publicKeyPem = Buffer.from(arguments_.public_key_base64, "base64").toString("utf8");
  } catch (error) {
    throw new Error(`SD008_EVIDENCE_PUBLIC_KEY_B64 is invalid: ${error.message}`);
  }
  const result = await exportEvidence({
    phase: arguments_.phase,
    commit: arguments_.commit,
    runId: arguments_.run_id,
    createdAt: arguments_.created_at,
    publicKeyPem,
    inputs: arguments_.inputs
  });
  await writeFile(arguments_.public_output, `${JSON.stringify(result.publicPacket, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(
    arguments_.private_envelope_output,
    `${JSON.stringify(result.privateEnvelope, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" }
  );
  console.log(
    JSON.stringify({
      status: "exported",
      phase: result.publicPacket.phase,
      publicPacketSha256: sha256(Buffer.from(canonicalJson(result.publicPacket), "utf8")),
      privatePacketSha256: result.privateEnvelope.plaintextSha256,
      privateEnvelopeSha256: result.publicPacket.privacy.privateEnvelopeSha256
    })
  );
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`SD-008 evidence export failed: ${error.message}`);
    process.exitCode = 1;
  });
}
