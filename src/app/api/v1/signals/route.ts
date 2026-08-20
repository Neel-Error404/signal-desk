import { getSignalDeskServices } from "@/composition/services";
import { listSignals } from "@/modules/signal-inbox/http/signal-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return listSignals(request, getSignalDeskServices().listSignals);
}
