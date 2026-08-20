import {
  publicReleaseMetadata,
  type PublicReleaseMetadata,
  type ReleaseMetadata
} from "@/modules/health/application/release-metadata";
import { ReadinessUnavailableError } from "@/shared/errors";

export interface DatabaseReadinessProbe {
  check(): Promise<void>;
}

export interface HealthResult {
  readonly status: "live" | "ready";
  readonly release: PublicReleaseMetadata;
}

const DEFAULT_READINESS_TIMEOUT_MS = 2_000;

async function checkWithin(
  probe: DatabaseReadinessProbe,
  timeoutMs: number
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      probe.check(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new ReadinessUnavailableError()), timeoutMs);
      })
    ]);
  } catch {
    throw new ReadinessUnavailableError();
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

export class HealthService {
  constructor(
    private readonly database: DatabaseReadinessProbe,
    private readonly releaseMetadata: () => ReleaseMetadata,
    private readonly readinessTimeoutMs = DEFAULT_READINESS_TIMEOUT_MS
  ) {
    if (!Number.isSafeInteger(readinessTimeoutMs) || readinessTimeoutMs < 1) {
      throw new RangeError("Readiness timeout must be a positive integer in milliseconds.");
    }
  }

  live(): HealthResult {
    return {
      status: "live",
      release: publicReleaseMetadata(this.releaseMetadata())
    };
  }

  async ready(): Promise<HealthResult> {
    const release = publicReleaseMetadata(this.releaseMetadata());
    await checkWithin(this.database, this.readinessTimeoutMs);
    return { status: "ready", release };
  }
}
