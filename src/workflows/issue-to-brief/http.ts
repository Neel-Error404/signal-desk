import type { ImplementationBriefRecord } from "@/modules/implementation-briefs/application";
import { correlationIdFor, readBoundedJson } from "@/platform/http/request";
import { errorResponse, jsonResponse } from "@/platform/http/response";
import {
  assertClosedObject,
  requireString,
  requireStringArray,
  requireUuid
} from "@/shared/validation";
import type { ApproveImplementationBrief } from "./approve-implementation-brief";

export function serializeImplementationBrief(
  brief: ImplementationBriefRecord
): Record<string, unknown> {
  return { ...brief, approvedAt: brief.approvedAt.toISOString() };
}

export async function postImplementationBrief(
  request: Request,
  productIssueId: string,
  useCase: ApproveImplementationBrief
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    requireUuid(productIssueId, "productIssueId");
    const body = await readBoundedJson(request);
    assertClosedObject(body, [
      "objective",
      "acceptanceCriteria",
      "constraints",
      "approvedBy",
      "contentAcknowledged"
    ]);
    const result = await useCase.execute(productIssueId, {
      objective: requireString(body, "objective"),
      acceptanceCriteria: requireStringArray(body, "acceptanceCriteria"),
      constraints: requireStringArray(body, "constraints"),
      approvedBy: requireString(body, "approvedBy"),
      contentAcknowledged: body.contentAcknowledged === true
    });
    return jsonResponse(
      {
        implementationBrief: serializeImplementationBrief(result.implementationBrief),
        lineage: result.lineage
      },
      201,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}
