import { getSignalDeskServices } from "@/composition/services";
import { postReviewDelivery } from "@/workflows/brief-to-delivery/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ReviewDeliveryRouteContext {
  readonly params: Promise<{ readonly implementationBriefId: string }>;
}

export async function POST(
  request: Request,
  context: ReviewDeliveryRouteContext
): Promise<Response> {
  const { implementationBriefId } = await context.params;
  return postReviewDelivery(
    request,
    implementationBriefId,
    getSignalDeskServices().recordReviewDelivery
  );
}
