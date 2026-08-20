import { HealthService } from "@/modules/health/application/health-service";
import { releaseMetadataFrom } from "@/modules/health/application/release-metadata";
import { PrismaReadinessProbe } from "@/modules/health/infrastructure/prisma-readiness-probe";

let healthService: HealthService | undefined;

export function getHealthService(): HealthService {
  healthService ??= new HealthService(
    new PrismaReadinessProbe(),
    () => releaseMetadataFrom()
  );
  return healthService;
}
