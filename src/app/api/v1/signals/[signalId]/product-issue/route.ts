import { getSignalDeskServices } from "@/composition/services";
import { postProductIssue } from "@/workflows/signal-to-issue/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProductIssueRouteContext {
  readonly params: Promise<{ readonly signalId: string }>;
}

export async function POST(
  request: Request,
  context: ProductIssueRouteContext
): Promise<Response> {
  const { signalId } = await context.params;
  return postProductIssue(
    request,
    signalId,
    getSignalDeskServices().promoteSignalToIssue
  );
}
