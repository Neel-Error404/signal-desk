import type { HealthService } from "@/modules/health/application/health-service";
import { correlationIdFor } from "@/platform/http/request";
import { errorResponse, jsonResponse } from "@/platform/http/response";

export function getLiveness(request: Request, health: HealthService): Response {
  const correlationId = correlationIdFor(request);
  try {
    return jsonResponse(
      { ...health.live(), correlationId },
      200,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}

export async function getReadiness(
  request: Request,
  health: HealthService
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    return jsonResponse(
      { ...(await health.ready()), correlationId },
      200,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}
