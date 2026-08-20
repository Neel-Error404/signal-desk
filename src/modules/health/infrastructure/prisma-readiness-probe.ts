import { getPrismaClient } from "@/platform/database/prisma-client";
import type { DatabaseReadinessProbe } from "@/modules/health/application/health-service";

export class PrismaReadinessProbe implements DatabaseReadinessProbe {
  async check(): Promise<void> {
    await getPrismaClient().$queryRaw`SELECT 1`;
  }
}
