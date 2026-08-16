import { getSignalDeskServices } from "@/composition/services";
import { getSignal } from "@/modules/signal-inbox/http/signal-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SignalRouteContext {
  readonly params: Promise<{ readonly signalId: string }>;
}

export async function GET(request: Request, context: SignalRouteContext): Promise<Response> {
  const { signalId } = await context.params;
  return getSignal(request, signalId, getSignalDeskServices().getSignal);
}
