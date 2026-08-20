import {
  InputTooLargeError,
  InvalidJsonError,
  UnsupportedMediaTypeError
} from "@/shared/errors";

export const MAX_REQUEST_BYTES = 16_384;
const JSON_UTF8_MEDIA_TYPE = /^application\/json\s*;\s*charset=utf-8$/i;
const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function correlationIdFor(request: Request): string {
  const supplied = request.headers.get("x-correlation-id");
  if (supplied !== null && CORRELATION_PATTERN.test(supplied)) {
    return supplied;
  }
  return crypto.randomUUID();
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!JSON_UTF8_MEDIA_TYPE.test(contentType)) {
    throw new UnsupportedMediaTypeError();
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_REQUEST_BYTES) {
      throw new InputTooLargeError();
    }
  }

  if (request.body === null) {
    throw new InvalidJsonError();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel("request body exceeded SD-001 byte limit");
        throw new InputTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new InvalidJsonError();
  }

  try {
    return JSON.parse(decoded) as unknown;
  } catch {
    throw new InvalidJsonError();
  }
}
