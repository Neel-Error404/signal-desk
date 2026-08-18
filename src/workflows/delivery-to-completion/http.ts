import type { CompletedFixRecord } from "@/modules/completed-fixes/application";
import { correlationIdFor, readBoundedJson } from "@/platform/http/request";
import { errorResponse, jsonResponse } from "@/platform/http/response";
import { assertClosedObject, requireString, requireUuid } from "@/shared/validation";
import type { RecordCompletedFix } from "./record-completed-fix";

export function serializeCompletedFix(fix: CompletedFixRecord): Record<string, unknown> {
  return { ...fix, completedAt: fix.completedAt.toISOString() };
}

export async function postCompletedFix(
  request: Request,
  reviewDeliveryId: string,
  useCase: RecordCompletedFix
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    requireUuid(reviewDeliveryId, "reviewDeliveryId");
    const body = await readBoundedJson(request);
    assertClosedObject(body, [
      "mergedCommitSha",
      "completionSummary",
      "completedBy",
      "mergeConfirmedOutsideSignalDesk",
      "contentAcknowledged"
    ]);
    const result = await useCase.execute(reviewDeliveryId, {
      mergedCommitSha: requireString(body, "mergedCommitSha"),
      completionSummary: requireString(body, "completionSummary"),
      completedBy: requireString(body, "completedBy"),
      mergeConfirmedOutsideSignalDesk:
        body.mergeConfirmedOutsideSignalDesk === true,
      contentAcknowledged: body.contentAcknowledged === true
    });
    return jsonResponse(
      {
        completedFix: serializeCompletedFix(result.completedFix),
        lineage: result.lineage
      },
      201,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}
