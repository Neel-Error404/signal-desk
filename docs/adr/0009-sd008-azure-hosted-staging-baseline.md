# ADR 0009: SD-008 Azure-Hosted Staging Baseline

## Status

Accepted for bounded local implementation by Neel's exact approval on August 20, 2026. The
approval ratifies this architecture and authorizes local SD-008 plan amendments and implementation
only. It does not authorize staging, commit, push, pull-request creation, GitHub Environment or
identity mutation, Azure mutation, deployment, release, production, learning application, or
maturity promotion.

**Date:** August 20, 2026

**Change class:** Infrastructure with security and architecture impact

## Context

SignalDesk now has protected `main` delivery and a required product-owned hosted review gate. It
does not have a hosted application environment, immutable deployable artifact, external runtime
identity, secret broker, hosted PostgreSQL boundary, runtime health evidence, or rollback proof.

The generated project profile named `Vercel` and `hosted PostgreSQL` as possible targets. During
SD-008 planning, the owner selected Azure hosting and Azure Container Apps. Keeping compute and
PostgreSQL in Azure removes the need to expose Azure PostgreSQL to Vercel's dynamic egress and
allows private networking, managed identity, Key Vault, Entra ingress protection, Azure-native
logs, and revision traffic rollback inside one runtime provider boundary. The public source and
container artifact remain in GitHub because the image contains no secret or private data and a
public GHCR package removes Azure Container Registry's fixed daily charge.

The application still has no product authentication. SD-001 explicitly forbids exposing it to a
shared or public network without a new governed decision. SD-008 therefore uses Azure Container
Apps authentication with Microsoft Entra ID and synthetic staging data only. This control protects
the staging ingress; it does not claim that product authentication or tenant authorization exists.

## Decision

Use these exact staging services in Azure `centralindia`:

- Azure Container Apps, multiple-revision mode, consumption workload profile;
- GitHub Container Registry public package, deployed by immutable manifest digest;
- Azure Database for PostgreSQL Flexible Server 16 with private access only;
- Azure Key Vault Standard for generated runtime and migration credentials;
- separate user-assigned managed identities for database bootstrap, migration, and runtime secret
  references;
- Microsoft Entra ID Container Apps authentication restricted to the owner and the dedicated
  automated smoke-test application identity;
- ephemeral Azure Log Analytics retained only through evidence export;
- a GitHub-only `staging-publication` Environment for the separately approved GHCR public-visibility
  mutation, followed by GitHub Actions OIDC through separately owner-approved `staging-provision`,
  `staging-traffic`, and `staging-teardown` Environments so each consequence receives a fresh human
  decision;
- Bicep as the infrastructure source of truth.

The staging region and resource names are:

| Resource | Planned name |
|---|---|
| Resource group | `rg-signaldesk-stg-cin` |
| Virtual network | `signaldesk-stg-cin-vnet` |
| Container Apps subnet | `snet-container-apps` |
| PostgreSQL delegated subnet | `snet-postgresql` |
| Private endpoint subnet | `snet-private-endpoints` |
| Log Analytics workspace | `signaldesk-stg-cin-logs` |
| Container Apps environment | `signaldesk-stg-cin-environment` |
| Container App | `signaldesk-stg-cin-app` |
| Bootstrap job | `signaldesk-stg-cin-dbinit` |
| Migration job | `signaldesk-stg-cin-migrate` |
| Managed identities | `signaldesk-stg-cin-{bootstrap,migration,runtime}-id` |
| Key Vault | run-unique `sdstg<subscription-and-run-hash>` |
| PostgreSQL server | run-unique `signaldesk-stg-cin-<subscription-and-run-hash>-postgres` |
| PostgreSQL database | `signaldesk` |

The Key Vault and PostgreSQL server use deterministic run-bound suffixes because both names are
globally constrained and a purge-protected deleted vault keeps its name during the seven-day
tombstone period. This is an explicit naming rule, not an availability fallback. The public
container package is `ghcr.io/neel-error404/signaldesk` and must be referenced only by digest.

## Elder capsule regeneration boundary

The generated profile and `ARCHITECTURE.md` still name Vercel as a possible target. Those files are
Elder-owned and must not be hand-edited. Implementation creates a project-owned Azure intake answer
source, generates a candidate profile and capsule under `.tmp/`, and reviews the complete compiler
diff. Applying any generated replacement to the repository requires a separately reviewed generated
diff and the Git mutation approval gate. Until that happens, this accepted ADR is the
project-specific authority for SD-008 and the stale generated target is an explicit tracked gap,
not evidence of Azure capability.

## Runtime and network boundary

- VNet address space: `10.42.0.0/16`.
- Container Apps infrastructure subnet: `10.42.0.0/23`.
- PostgreSQL delegated subnet: `10.42.2.0/24`.
- Private endpoint subnet: `10.42.3.0/27`.
- PostgreSQL public network access is disabled.
- Private DNS uses the PostgreSQL Flexible Server delegated-network zone
  `signaldesk-stg-cin.private.postgres.database.azure.com` and is linked only to the staging VNet.
- PostgreSQL connections require TLS and the runtime URL uses `sslmode=require`.
- Container ingress is externally addressable only because Entra authentication protects every
  application route. An anonymous request must fail before reaching product code.
- No production network, database, key vault, workspace, or identity is referenced.

## Compute and cost boundary

- Container App: `0.25` vCPU, `0.5 GiB` memory, minimum replicas `1`, maximum replicas `1` only
  during the approved ephemeral proof window. A
  bounded memory fixture must prove this size; failure blocks deployment rather than increasing the
  size automatically.
- PostgreSQL target: `Standard_B1ms`, 32 GiB storage, seven-day backup retention, no HA, no geo
  redundancy, and no read replica.
- Key Vault: Standard with soft delete and purge protection.
- Log retention: only for the approved proof window; redacted evidence is exported before teardown.
- Cost model: create all cost-bearing Azure resources for an approved staging session and delete
  the complete resource group after evidence and rollback acceptance. Persistent GitHub/Entra
  control-plane identities and the public GHCR digest have no planned Azure runtime charge.
- Retail planning bound: approximately USD 0-2 per month for occasional sessions. Set an Azure
  budget alert at USD 5 and treat any forecast above it as a stop condition requiring owner review.
- A live Azure price estimate and quota check are mandatory before resource creation. If the
  named PostgreSQL SKU is unavailable in Central India, implementation stops for an owner choice;
  it does not silently select a larger or more expensive SKU.

## Identity and secret boundary

1. A one-time owner bootstrap creates three separate GitHub-federated service principals with
   narrowly scoped provision, traffic, and teardown roles; the Entra ingress application and
   smoke-test application permissions; the four GitHub staging Environments; and the required
   owner reviewer. Separate service principals prevent Azure permissions from aggregating across
   GitHub Environment subjects.
2. Before each rehearsal, the owner creates `rg-signaldesk-stg-cin`, applies the exact staging and
   work-item tags, and assigns each service principal only its consequence-specific role at that
   resource-group scope. The workflow verifies this boundary and never creates a resource group.
3. The deployment workflow uses GitHub OIDC. No Azure client secret is stored in GitHub.
4. Subscription, tenant, and client identifiers are GitHub Environment variables, not secrets;
   their values are not committed to this public repository.
5. The Entra ingress client secret is the only staged GitHub Environment secret. It is not a
   deployment credential, is available only after `staging-provision` approval, is written to Key
   Vault by the ARM deployment, and must be rotated at the bootstrap boundary. No repository secret
   is used.
6. Database administrator, migration-role, and runtime-role passwords are generated inside the
   approved workflow, masked before use, and passed as secure Bicep parameters directly to Key
   Vault. They are never printed, committed, stored in artifacts, or copied into GitHub secrets.
7. A bootstrap identity can read only the administrator URL and two role passwords while creating
   the database roles. The migration identity can read only the migration URL. The runtime identity
   can read only the runtime URL and Entra ingress secret. The bootstrap and migration jobs run
   sequentially and terminal success is required.
8. The public GHCR image requires no registry credential. The provision identity can deploy
   reviewed staging infrastructure and invoke the migration job. Its only role-assignment write is
   condition-bound to the Key Vault Secrets User role, secret child scopes inside the exact staging
   group, and a principal other than itself. It cannot modify production, grant management roles,
   purge Key Vault, or merge.
9. Application logs, metrics, evidence files, and HTTP responses must not contain connection
   strings, passwords, bearer tokens, cookies, or secret-shaped fields.

## Artifact and deployment boundary

- Add a multi-stage, non-root Dockerfile using exact Node.js `22.18.0` and a base image pinned by
  digest resolved during implementation review.
- Enable Next.js standalone output and run the generated server on port `3000`.
- Set the Next.js build identifier from the exact Git commit and build from a normalized Git source
  archive. Two independent clean builds must produce the same application tree digest and OCI
  manifest digest before publication; a mismatch blocks deployment.
- Build only from the exact current protected `main` commit after the ordered review ladder passes
  again in the deployment workflow.
- Push `ghcr.io/neel-error404/signaldesk:<full-git-sha>` as a public package, record the manifest
  digest, create an SBOM and vulnerability report, issue keyless GitHub build provenance, and
  deploy only `ghcr.io/neel-error404/signaldesk@sha256:<digest>`.
- Prove the image contains no `.env`, connection string, token, private identifier, source map with
  secrets, test database, evidence packet, or runtime state before making the package public.
- The mutable tag is navigation metadata only. Container Apps, the migration job, evidence, and
  rollback records bind the digest.
- A high or critical exploitable image finding, missing attestation, provenance mismatch, or digest
  drift blocks migration and deployment.

## Database migration boundary

- Run `prisma migrate deploy` in `signaldesk-stg-cin-migrate` using the same image digest as the
  candidate application revision.
- The migration job uses a separate migration credential and runs once per approved deployment.
- A failed, timed-out, duplicated, or digest-mismatched migration blocks candidate creation and
  traffic changes.
- SD-008 introduces no schema change. Future staging migrations must be forward-only and
  backward-compatible expand/contract changes. The prior and candidate application revisions must
  both operate against the migrated schema before traffic can change. Destructive migrations are
  forbidden in this slice.
- Azure PostgreSQL point-in-time restore is disaster recovery evidence, not a substitute for
  backward-compatible migrations or application traffic rollback.

## Health, access, and observability boundary

- `/api/v1/health/live` proves only that the process can serve requests.
- `/api/v1/health/ready` performs one bounded PostgreSQL readiness check and returns explicit
  `503` when storage is unavailable.
- Health responses contain status, release commit prefix, image digest prefix, deployment run ID,
  revision, and correlation ID only; they contain no hostnames, database names, identities, or
  secrets.
- Container Apps platform probes call the container directly and do not weaken external Entra
  protection.
- An anonymous ingress request must be denied. The owner's Entra identity and the separately
  authorized smoke-test application identity must be accepted.
- Runtime and control-plane evidence comes from Container Apps revision state, Activity Log,
  Log Analytics, PostgreSQL state, migration-job executions, and bounded HTTP observations.
- Logs retain existing correlation IDs as values, never as metric dimensions.

## Promotion and rollback boundary

1. Create the candidate Container Apps revision with zero production-like traffic and an exact
   revision label.
2. Verify image digest, revision state, liveness, readiness, anonymous denial, authorized smoke,
   product owner flow, logs, and migration execution.
3. The human release owner explicitly approves the staging traffic change.
4. Move 100% of staging traffic to the candidate. No production traffic exists.
5. For the first baseline, create a second revision from the same digest with a distinct release
   identifier, shift staging traffic to it, then perform a controlled rollback to the first healthy
   revision. Verify the active revision, traffic weights, health, and logs after rollback.
6. Leave exactly one verified baseline revision receiving staging traffic long enough to capture
   the accepted evidence.
7. Export the redacted evidence, obtain owner approval to tear down, delete
   `rg-signaldesk-stg-cin`, and prove the Container App URL, PostgreSQL server, active Key Vault,
   network, Log Analytics workspace, identities scoped to the group, and active synthetic staging
   data are absent. The purge-protected Key Vault deletion tombstone and any provider retention
   record must be listed with its recovery/expiry boundary and must expose no active endpoint or
   billable runtime. The GHCR digest and non-billable GitHub/Entra control-plane records remain for
   replay.

An unhealthy candidate, missing observation, failed authorization, stale log window, migration
failure, or traffic mismatch requires no promotion or immediate traffic restoration to the last
healthy staging revision. SD-008 does not authorize production promotion or automatic rollback.

## Learning boundary

After the real hosted trace, a separate Elder learning lane may copy only redacted evidence into
quarantine, propose at most one bounded candidate, run counterfactual and shadow observations, and
obtain evaluation independent from the candidate author. An exact human approval or rejection is
required. Approval may emit only a non-mutating promotion packet; applying a candidate requires a
later target-specific governed change.

## Human decisions

The following decisions remain separate from this ADR ratification:

1. applying the reviewed generated Elder capsule replacement;
2. staging, committing, pushing, and opening the implementation pull request;
3. the live Azure cost/quota estimate and resource creation;
4. the four GitHub Environments, three OIDC applications, federated subjects, custom roles, and
   reviewers;
5. Entra application registrations and the exact allowed owner/smoke identities;
6. the first staging provisioning operation;
7. the staging traffic transition and controlled rollback rehearsal;
8. final staging acceptance and resource-group destruction;
9. any learning candidate approval or later application.

## Consequences

Positive consequences:

- compute, database, identity, secrets, networking, logs, and rollback share one Azure runtime
  boundary;
- the database need not accept public network traffic;
- deployment is bound to an immutable, attested container digest;
- staging access is protected without pretending product authentication exists;
- revision traffic controls give a directly observable rollback mechanism.

Costs and limitations:

- Azure infrastructure and identity bootstrap are materially larger than a Vercel preview;
- no continuously available staging URL or retained staging database exists after teardown;
- every staging session includes Azure provisioning and database migration latency;
- database password credentials still exist, although they remain Key Vault-backed and
  least-privileged;
- a healthy staging deployment is not production readiness, multi-region resilience, L2, L3, or
  autonomous deployment evidence.

## Rejected alternatives

- **Vercel plus Azure PostgreSQL:** rejected because ordinary Vercel egress is dynamic and would
  require expensive static egress or an unacceptably broad PostgreSQL firewall.
- **Raw Azure VM:** rejected because OS hardening, patching, TLS termination, process supervision,
  SSH governance, and server drift would dominate the learning objective.
- **Azure App Service:** viable, but Container Apps exposes immutable revisions and traffic
  rollback more directly for this evidence-bound slice.
- **Azure Container Registry Basic:** rejected for this stage because its roughly USD 5 monthly
  fixed charge exceeds the expected application compute cost. Public GHCR is acceptable because
  the source is public and the reviewed image must contain no secrets.
- **Retained stopped PostgreSQL:** rejected for the maximum-savings mode because its 32 GiB storage
  and private DNS still cost roughly USD 5 monthly. It can be reconsidered when persistent staging
  data becomes a product requirement.
- **Public PostgreSQL with password/TLS only:** rejected for the confidential-data profile and
  fail-closed staging claim.
- **Application login implementation:** deferred; Entra protects staging while keeping SD-008 an
  infrastructure slice.

## Ratification effect

This ADR now authorizes only the bounded local implementation and deterministic verification
described above. It grants no authority to stage, commit, push, open a pull request, replace
Elder-owned generated files, create Azure resources, change GitHub environments or identities,
deploy, migrate a hosted database, release, apply learning, or promote maturity.
