import type { ReviewDeliveryRecord } from "@/modules/review-deliveries/application";
import { correlationIdFor, readBoundedJson } from "@/platform/http/request";
import { errorResponse, jsonResponse } from "@/platform/http/response";
import { assertClosedObject, requireString, requireUuid } from "@/shared/validation";
import type { RecordReviewDelivery } from "./record-review-delivery";

export function serializeReviewDelivery(
  delivery: ReviewDeliveryRecord
): Record<string, unknown> {
  return { ...delivery, deliveredAt: delivery.deliveredAt.toISOString() };
}

export async function postReviewDelivery(
  request: Request,
  implementationBriefId: string,
  useCase: RecordReviewDelivery
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    requireUuid(implementationBriefId, "implementationBriefId");
    const body = await readBoundedJson(request);
    assertClosedObject(body, [
      "baseBranch",
      "headBranch",
      "commitSha",
      "pullRequestUrl",
      "verificationSummary",
      "deliveredBy",
      "contentAcknowledged"
    ]);
    const result = await useCase.execute(implementationBriefId, {
      baseBranch: requireString(body, "baseBranch"),
      headBranch: requireString(body, "headBranch"),
      commitSha: requireString(body, "commitSha"),
      pullRequestUrl: requireString(body, "pullRequestUrl"),
      verificationSummary: requireString(body, "verificationSummary"),
      deliveredBy: requireString(body, "deliveredBy"),
      contentAcknowledged: body.contentAcknowledged === true
    });
    return jsonResponse(
      {
        reviewDelivery: serializeReviewDelivery(result.reviewDelivery),
        lineage: result.lineage
      },
      201,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}
