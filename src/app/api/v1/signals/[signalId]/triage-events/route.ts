import { getSignalDeskServices } from "@/composition/services";
import { postTriageEvent } from "@/modules/signal-inbox/http/signal-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TriageRouteContext {
  readonly params: Promise<{ readonly signalId: string }>;
}

export async function POST(request: Request, context: TriageRouteContext): Promise<Response> {
  const { signalId } = await context.params;
  return postTriageEvent(request, signalId, getSignalDeskServices().appendTriage);
}
