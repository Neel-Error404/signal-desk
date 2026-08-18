import { getSignalDeskServices } from "@/composition/services";
import { postCompletedFix } from "@/workflows/delivery-to-completion/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: Promise<{ readonly reviewDeliveryId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { reviewDeliveryId } = await context.params;
  return postCompletedFix(
    request,
    reviewDeliveryId,
    getSignalDeskServices().recordCompletedFix
  );
}
