import { getSignalDeskServices } from "@/composition/services";
import { postImplementationBrief } from "@/workflows/issue-to-brief/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ImplementationBriefRouteContext {
  readonly params: Promise<{ readonly productIssueId: string }>;
}

export async function POST(
  request: Request,
  context: ImplementationBriefRouteContext
): Promise<Response> {
  const { productIssueId } = await context.params;
  return postImplementationBrief(
    request,
    productIssueId,
    getSignalDeskServices().approveImplementationBrief
  );
}
