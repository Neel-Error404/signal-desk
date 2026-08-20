import { getSignalDeskServices } from "@/composition/services";
import { postReleaseCommunication } from "@/workflows/completion-to-communication/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: Promise<{ readonly completedFixId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { completedFixId } = await context.params;
  return postReleaseCommunication(
    request,
    completedFixId,
    getSignalDeskServices().approveReleaseCommunication
  );
}
