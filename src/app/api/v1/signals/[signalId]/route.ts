import { getSignalDeskServices } from "@/composition/services";
import { getSignalDetailWithIssue } from "@/workflows/signal-to-issue/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SignalRouteContext {
  readonly params: Promise<{ readonly signalId: string }>;
}

export async function GET(request: Request, context: SignalRouteContext): Promise<Response> {
  const { signalId } = await context.params;
  return getSignalDetailWithIssue(
    request,
    signalId,
    getSignalDeskServices().getSignalDetailWithIssue
  );
}
