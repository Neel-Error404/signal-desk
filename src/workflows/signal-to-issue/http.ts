import type { ProductIssueRecord } from "@/modules/product-issues/application";
import type { SignalRecord, TriageEventRecord } from "@/modules/signal-inbox/application";
import { correlationIdFor, readBoundedJson } from "@/platform/http/request";
import { errorResponse, jsonResponse } from "@/platform/http/response";
import { assertClosedObject, requireNumber, requireString, requireUuid } from "@/shared/validation";
import type { PromoteSignalToIssue } from "./promote-signal-to-issue";
import type { GetSignalDetailWithIssue, SignalDetailWithIssue } from "./signal-detail";
import { serializeImplementationBrief } from "@/workflows/issue-to-brief/http";
import { serializeReviewDelivery } from "@/workflows/brief-to-delivery/http";
import { serializeCompletedFix } from "@/workflows/delivery-to-completion/http";

function serializeSignal(signal: SignalRecord): Record<string, unknown> {
  return { ...signal, createdAt: signal.createdAt.toISOString() };
}

function serializeEvent(event: TriageEventRecord): Record<string, unknown> {
  return { ...event, createdAt: event.createdAt.toISOString() };
}

function serializeProductIssue(issue: ProductIssueRecord): Record<string, unknown> {
  return { ...issue, createdAt: issue.createdAt.toISOString() };
}

function serializeDetail(detail: SignalDetailWithIssue): Record<string, unknown> {
  return {
    signal: serializeSignal(detail.signal),
    feedback: { ...detail.feedback, createdAt: detail.feedback.createdAt.toISOString() },
    triageEvents: detail.triageEvents.map(serializeEvent),
    productIssue:
      detail.productIssue === null ? null : serializeProductIssue(detail.productIssue),
    implementationBrief:
      detail.implementationBrief === null
        ? null
        : serializeImplementationBrief(detail.implementationBrief),
    reviewDelivery:
      detail.reviewDelivery === null
        ? null
        : serializeReviewDelivery(detail.reviewDelivery),
    completedFix:
      detail.completedFix === null ? null : serializeCompletedFix(detail.completedFix)
  };
}

export async function getSignalDetailWithIssue(
  request: Request,
  signalId: string,
  useCase: GetSignalDetailWithIssue
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    requireUuid(signalId, "signalId");
    return jsonResponse(serializeDetail(await useCase.execute(signalId)), 200, correlationId);
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}

export async function postProductIssue(
  request: Request,
  signalId: string,
  useCase: PromoteSignalToIssue
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    requireUuid(signalId, "signalId");
    const body = await readBoundedJson(request);
    assertClosedObject(body, [
      "expectedSignalRevision",
      "title",
      "priority",
      "rationale",
      "operatorLabel",
      "contentAcknowledged"
    ]);
    const result = await useCase.execute(signalId, {
      expectedSignalRevision: requireNumber(body, "expectedSignalRevision"),
      title: requireString(body, "title"),
      priority: requireString(body, "priority"),
      rationale: requireString(body, "rationale"),
      operatorLabel: requireString(body, "operatorLabel"),
      contentAcknowledged: body.contentAcknowledged === true
    });
    return jsonResponse(
      {
        productIssue: serializeProductIssue(result.productIssue),
        lineage: result.lineage
      },
      201,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}
