export interface ReleaseMetadata {
  readonly commit: string;
  readonly imageDigest: string;
  readonly deploymentRunId: string;
  readonly revision: string;
}

export interface PublicReleaseMetadata {
  readonly commit: string;
  readonly imageDigest: string;
  readonly deploymentRunId: string;
  readonly revision: string;
}

type ReleaseEnvironment = Readonly<Record<string, string | undefined>>;

const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const IMAGE_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const RUN_ID_PATTERN = /^[1-9][0-9]{0,19}$/;
const REVISION_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export class ReleaseMetadataError extends Error {
  constructor(readonly field: string) {
    super(`Invalid or missing release metadata: ${field}.`);
    this.name = "ReleaseMetadataError";
  }
}

function requiredMatching(
  environment: ReleaseEnvironment,
  name: string,
  pattern: RegExp
): string {
  const value = environment[name];
  if (value === undefined || !pattern.test(value)) {
    throw new ReleaseMetadataError(name);
  }
  return value;
}

export function releaseMetadataFrom(
  environment: ReleaseEnvironment = process.env
): ReleaseMetadata {
  return {
    commit: requiredMatching(environment, "SIGNALDESK_RELEASE_COMMIT", COMMIT_PATTERN),
    imageDigest: requiredMatching(
      environment,
      "SIGNALDESK_IMAGE_DIGEST",
      IMAGE_DIGEST_PATTERN
    ),
    deploymentRunId: requiredMatching(
      environment,
      "SIGNALDESK_DEPLOYMENT_RUN_ID",
      RUN_ID_PATTERN
    ),
    revision: requiredMatching(environment, "SIGNALDESK_REVISION", REVISION_PATTERN)
  };
}

export function publicReleaseMetadata(
  metadata: ReleaseMetadata
): PublicReleaseMetadata {
  return {
    commit: metadata.commit.slice(0, 12),
    imageDigest: `sha256:${metadata.imageDigest.slice(7, 19)}`,
    deploymentRunId: metadata.deploymentRunId,
    revision: metadata.revision
  };
}
