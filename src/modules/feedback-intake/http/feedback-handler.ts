import type { CreateFeedbackSignal } from "@/workflows/feedback-to-signal/create-feedback-signal";
import { correlationIdFor, readBoundedJson } from "@/platform/http/request";
import { errorResponse, jsonResponse } from "@/platform/http/response";
import { assertClosedObject, requireString } from "@/shared/validation";

export async function postFeedback(
  request: Request,
  createFeedbackSignal: CreateFeedbackSignal
): Promise<Response> {
  const correlationId = correlationIdFor(request);
  try {
    const body = await readBoundedJson(request);
    assertClosedObject(body, ["content", "contentAcknowledged"]);
    const created = await createFeedbackSignal.execute({
      content: requireString(body, "content"),
      contentAcknowledged: body.contentAcknowledged === true
    });
    return jsonResponse(
      {
        feedback: {
          ...created.feedback,
          createdAt: created.feedback.createdAt.toISOString()
        },
        signal: {
          ...created.signal,
          createdAt: created.signal.createdAt.toISOString()
        }
      },
      201,
      correlationId
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}
