import { getSignalDeskServices } from "@/composition/services";
import { postFeedback } from "@/modules/feedback-intake/http/feedback-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return postFeedback(request, getSignalDeskServices().createFeedbackSignal);
}
