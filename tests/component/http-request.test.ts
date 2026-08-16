import { describe, expect, it } from "vitest";
import {
  correlationIdFor,
  MAX_REQUEST_BYTES,
  readBoundedJson
} from "@/platform/http/request";
import {
  InputTooLargeError,
  InvalidJsonError,
  UnsupportedMediaTypeError
} from "@/shared/errors";

function jsonRequest(body: string, contentType = "application/json; charset=utf-8"): Request {
  return new Request("http://127.0.0.1/api/v1/feedback", {
    method: "POST",
    headers: { "content-type": contentType },
    body
  });
}

describe("bounded HTTP request control", () => {
  it("parses a bounded UTF-8 JSON object", async () => {
    await expect(readBoundedJson(jsonRequest('{"content":"hello"}'))).resolves.toEqual({
      content: "hello"
    });
  });

  it("rejects media types outside the exact contract", async () => {
    await expect(readBoundedJson(jsonRequest("{}", "application/json"))).rejects.toBeInstanceOf(
      UnsupportedMediaTypeError
    );
  });

  it("rejects invalid JSON without echoing it", async () => {
    await expect(readBoundedJson(jsonRequest("not-json"))).rejects.toBeInstanceOf(
      InvalidJsonError
    );
  });

  it("enforces the byte limit even without Content-Length reliance", async () => {
    const body = `"${"x".repeat(MAX_REQUEST_BYTES)}"`;
    await expect(readBoundedJson(jsonRequest(body))).rejects.toBeInstanceOf(InputTooLargeError);
  });

  it("replaces malformed correlation identifiers", () => {
    const request = new Request("http://127.0.0.1", {
      headers: { "x-correlation-id": "contains spaces" }
    });
    expect(correlationIdFor(request)).toMatch(/^[0-9a-f-]{36}$/);
  });
});
