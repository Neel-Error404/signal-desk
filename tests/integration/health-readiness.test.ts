import { describe, expect, it } from "vitest";
import { HealthService } from "@/modules/health/application/health-service";
import { releaseMetadataFrom } from "@/modules/health/application/release-metadata";
import { PrismaReadinessProbe } from "@/modules/health/infrastructure/prisma-readiness-probe";

describe("SD-008 PostgreSQL readiness", () => {
  it("becomes ready through the runtime database credential after migrations", async () => {
    const service = new HealthService(
      new PrismaReadinessProbe(),
      () =>
        releaseMetadataFrom({
          SIGNALDESK_RELEASE_COMMIT: "0123456789abcdef0123456789abcdef01234567",
          SIGNALDESK_IMAGE_DIGEST:
            "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          SIGNALDESK_DEPLOYMENT_RUN_ID: "123456789",
          SIGNALDESK_REVISION: "sd008-integration-123456789"
        })
    );
    await expect(service.ready()).resolves.toMatchObject({ status: "ready" });
  });
});
