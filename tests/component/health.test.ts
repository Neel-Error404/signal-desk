import { describe, expect, it } from "vitest";
import {
  HealthService,
  type DatabaseReadinessProbe
} from "@/modules/health/application/health-service";
import {
  ReleaseMetadataError,
  releaseMetadataFrom
} from "@/modules/health/application/release-metadata";
import { getLiveness, getReadiness } from "@/modules/health/http/health-handler";

const validEnvironment: Readonly<Record<string, string>> = {
  SIGNALDESK_RELEASE_COMMIT: "0123456789abcdef0123456789abcdef01234567",
  SIGNALDESK_IMAGE_DIGEST:
    "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  SIGNALDESK_DEPLOYMENT_RUN_ID: "123456789",
  SIGNALDESK_REVISION: "sd008-0123456789ab-123456789"
};

const healthyProbe: DatabaseReadinessProbe = { check: async () => undefined };

describe("SD-008 health contracts", () => {
  it("parses exact release identity and exposes only bounded prefixes", () => {
    const service = new HealthService(healthyProbe, () => releaseMetadataFrom(validEnvironment));
    expect(service.live()).toEqual({
      status: "live",
      release: {
        commit: "0123456789ab",
        imageDigest: "sha256:0123456789ab",
        deploymentRunId: "123456789",
        revision: "sd008-0123456789ab-123456789"
      }
    });
  });

  it.each([
    "SIGNALDESK_RELEASE_COMMIT",
    "SIGNALDESK_IMAGE_DIGEST",
    "SIGNALDESK_DEPLOYMENT_RUN_ID",
    "SIGNALDESK_REVISION"
  ])("fails closed when %s is missing", (field) => {
    const environment = { ...validEnvironment };
    delete environment[field];
    expect(() => releaseMetadataFrom(environment)).toThrow(ReleaseMetadataError);
  });

  it("returns ready after the database probe succeeds", async () => {
    const service = new HealthService(healthyProbe, () => releaseMetadataFrom(validEnvironment));
    await expect(service.ready()).resolves.toMatchObject({ status: "ready" });
  });

  it("returns an explicit 503 without database error details", async () => {
    const secret = "postgresql://runtime:do-not-leak@private-db/signaldesk";
    const service = new HealthService(
      { check: async () => Promise.reject(new Error(secret)) },
      () => releaseMetadataFrom(validEnvironment)
    );
    const response = await getReadiness(
      new Request("http://127.0.0.1/api/v1/health/ready", {
        headers: { "x-correlation-id": "sd008-readiness-failure" }
      }),
      service
    );
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).toContain("readiness_unavailable");
    expect(body).not.toContain(secret);
  });

  it("bounds a stalled readiness probe", async () => {
    const service = new HealthService(
      { check: () => new Promise<void>(() => undefined) },
      () => releaseMetadataFrom(validEnvironment),
      5
    );
    const response = await getReadiness(
      new Request("http://127.0.0.1/api/v1/health/ready"),
      service
    );
    expect(response.status).toBe(503);
  });

  it("keeps liveness independent of database availability", async () => {
    const service = new HealthService(
      { check: async () => Promise.reject(new Error("database unavailable")) },
      () => releaseMetadataFrom(validEnvironment)
    );
    const response = getLiveness(
      new Request("http://127.0.0.1/api/v1/health/live", {
        headers: { "x-correlation-id": "sd008-liveness" }
      }),
      service
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "live",
      correlationId: "sd008-liveness"
    });
  });
});
