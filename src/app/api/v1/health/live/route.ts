import { getHealthService } from "@/composition/health";
import { getLiveness } from "@/modules/health/http/health-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return getLiveness(request, getHealthService());
}
