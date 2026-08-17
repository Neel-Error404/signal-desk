import { InvalidRequestError } from "./errors";

export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertClosedObject(
  value: unknown,
  allowedKeys: readonly string[]
): asserts value is Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw new InvalidRequestError("The request body must be a JSON object.");
  }

  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new InvalidRequestError("The request contains unknown fields.", unexpected);
  }
}

export function requireString(
  record: Record<string, unknown>,
  field: string
): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new InvalidRequestError(`${field} must be a string.`, [field]);
  }
  return value;
}

export function requireNumber(
  record: Record<string, unknown>,
  field: string
): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidRequestError(`${field} must be a finite number.`, [field]);
  }
  return value;
}

export function requireStringArray(
  record: Record<string, unknown>,
  field: string
): readonly string[] {
  const value = record[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new InvalidRequestError(`${field} must be an array of strings.`, [field]);
  }
  return value;
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new InvalidRequestError(`${field} must be a UUID.`, [field]);
  }
}
