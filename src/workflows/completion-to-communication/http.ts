import type { ReleaseCommunicationRecord } from "@/modules/release-communications/application";
import { correlationIdFor, readBoundedJson } from "@/platform/http/request";
import { errorResponse, jsonResponse } from "@/platform/http/response";
import { assertClosedObject, requireString, requireUuid } from "@/shared/validation";
import type { ApproveReleaseCommunication } from "./approve-release-communication";

export function serializeReleaseCommunication(
  communication: ReleaseCommunicationRecord
): Record<string, unknown> {
  return {
    ...communication,
    approvedAt: communication.approvedAt.toISOString(),
    publicationStatus: "not-sent"
  };
}

export async function postReleaseCommunication(
  request: Request,
  completedFixId: string,
  useCase: ApproveReleaseCommunication
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    requireUuid(completedFixId, "completedFixId");
    const body = await readBoundedJson(request);
    assertClosedObject(body, [
      "audience",
      "subject",
      "message",
      "approvedBy",
      "approvalConfirmed",
      "contentAcknowledged"
    ]);
    const result = await useCase.execute(completedFixId, {
      audience: requireString(body, "audience"),
      subject: requireString(body, "subject"),
      message: requireString(body, "message"),
      approvedBy: requireString(body, "approvedBy"),
      approvalConfirmed: body.approvalConfirmed === true,
      contentAcknowledged: body.contentAcknowledged === true
    });
    return jsonResponse(
      {
        releaseCommunication: serializeReleaseCommunication(
          result.releaseCommunication
        ),
        lineage: result.lineage
      },
      201,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}
