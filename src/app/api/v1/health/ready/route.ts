import { getHealthService } from "@/composition/health";
import { getReadiness } from "@/modules/health/http/health-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return getReadiness(request, getHealthService());
}
