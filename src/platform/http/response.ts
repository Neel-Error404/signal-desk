import { ApplicationError } from "@/shared/errors";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export function jsonResponse(
  body: unknown,
  status: number,
  correlationId: string
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      "x-correlation-id": correlationId
    }
  });
}

export function errorResponse(error: unknown, correlationId: string): Response {
  if (error instanceof ApplicationError) {
    console.error(
      JSON.stringify({ event: "request_failed", code: error.code, correlationId })
    );
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
          correlationId
        }
      },
      error.status,
      correlationId
    );
  }

  console.error(
    JSON.stringify({ event: "request_failed", code: "internal_error", correlationId })
  );
  return jsonResponse(
    {
      error: {
        code: "internal_error",
        message: "An unexpected internal error occurred.",
        correlationId
      }
    },
    500,
    correlationId
  );
}
