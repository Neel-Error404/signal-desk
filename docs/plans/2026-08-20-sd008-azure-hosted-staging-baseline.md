# SD-008 Azure-Hosted Staging Baseline Implementation Plan

**Status:** IN PROGRESS — local implementation authorized; Git, GitHub, and Azure mutations remain
separately gated

**Date:** August 20, 2026

**Base:** protected `main` at `623ff665d2a276c7541622f73e34d15ee6a7d2bf`

**Branch:** `work/sd-008-azure-staging-baseline`

**Proposed ADR:** `docs/adr/0009-sd008-azure-hosted-staging-baseline.md`

## Wayfinder intake

**Objective:** prove that one exact protected SignalDesk revision can become an identity-protected,
observable, rollback-capable ephemeral Azure staging deployment without public data exposure,
production authority, or retained cost-bearing runtime resources.

**Success:** an owner-approved GitHub run rebuilds the ordered gate, produces one attested OCI
digest, applies migrations through an exact-digest Azure job, verifies a zero-traffic Container
Apps revision, moves only staging traffic, restores the prior healthy revision during a controlled
rollback rehearsal, exports redacted evidence, and verifies deletion of the exact staging resource
group.

**Failure:** public ingress, public PostgreSQL, secret disclosure, mutable-image deployment,
unbound migration, unhealthy traffic shift, unverifiable rollback, real customer data, or any
production/maturity action.

**Constraints:** moderate risk, confidential data profile, public source repository, human-only
merge/release/deployment, Central India, Azure sponsorship, exact ordered test ladder, no silent
fallbacks, and no production credentials in agent sandboxes.

**Non-goals:** production, customer use, product authentication, multi-region/HA, automatic
promotion, automatic rollback, P5.2/L2/L3, qualification-period credit, or learning application.

**Authority:** Neel is architecture, product, security, release, code, and deployment owner. The
GitHub workflow may execute only after the owner separately approves `staging-publication`,
`staging-provision`, `staging-traffic`, and `staging-teardown` at their consequence boundaries. It
cannot merge, select production, broaden roles, or promote maturity.

**Next proof gate:** owner ratification of ADR 0009 plus cost, quota, identity, secret, and resource
preflight approval.

## Pre-implementation facts

- SignalDesk PR #6 merged to protected `main` as
  `623ff665d2a276c7541622f73e34d15ee6a7d2bf`.
- SignalDesk PRs #4 and #5 were closed without duplicate merges because PR #6 was cumulative.
- Elder PR #6 merged only into its reviewed intermediate base as
  `576f0d3e50d7189e8959c26c97aebfe29e573f81`; this is not Elder mainline integration.
- Repository `Neel-Error404/signal-desk` is public; default GitHub workflow permission is read;
  no GitHub Environment, repository secret, repository variable, deployment, or release existed
  before SD-008 planning.
- Azure subscription state is enabled under an existing sponsorship. Exact subscription, tenant,
  and user identifiers are intentionally omitted from this public plan.
- Existing Azure resource groups and Container Apps environments already use Central India, so the
  provider and region are operationally present. SD-008 will not reuse another product's resource
  group, network, database, registry, key vault, environment, or managed identity.
- Two unrelated Azure PostgreSQL Flexible Servers already exist; neither is authorized for
  SignalDesk.
- Azure CLI `2.77.0`, Container Apps extension `1.2.0b4`, and GitHub CLI `2.78.0` are available
  locally. Implementation must pin hosted actions and verify current provider APIs rather than
  relying on these mutable local versions.
- Key Vault and PostgreSQL use deterministic subscription-and-run-bound suffixes because their
  names are global and a purge-protected vault name remains reserved during its tombstone period.
  Quotas, SKUs, Entra features, and prices still require a fresh live preflight because availability
  can drift.
- The artifact target is the public GitHub Container Registry package
  `ghcr.io/neel-error404/signaldesk`, resolved and deployed by immutable digest. Publication is
  blocked unless source, layer, SBOM, and configuration scans find no secret or private runtime
  material.
- The selected cost mode is ephemeral staging: create the isolated Azure resource group only for
  an approved proof session, export evidence, obtain owner teardown approval, delete the group,
  and verify every cost-bearing resource is absent. Expected steady monthly cost is USD 0-2,
  subject to fresh provider pricing and actual usage; a USD 5 Azure budget alert is mandatory.

## SD-008 implementation completion matrix

| Capability | Completion evidence | Current state |
|---|---|---|
| Architecture decision | Owner-ratified ADR 0009 | RATIFIED |
| Work item and delivery contract | Machine-readable SD-008 and staging deployment contract | IMPLEMENTED locally |
| Azure cost and quota | Saved price estimate, USD 5 budget alert, provider registrations, Central India quotas | PLANNED |
| Infrastructure | Bicep what-if and successful exact deployment | Bicep IMPLEMENTED and locally compiled; hosted proof PLANNED |
| GitHub environment | Four required-reviewer, protected-main consequence gates | SPECIFIED; creation not authorized |
| External deploy identity | Three distinct OIDC subjects bound to environment-specific custom roles | SPECIFIED; creation not authorized |
| Runtime identity | Separate bootstrap, migration, and runtime identities with secret-scoped grants | IMPLEMENTED in Bicep; hosted proof PLANNED |
| Network | Private PostgreSQL, private DNS, TLS, no public database access | IMPLEMENTED in Bicep; hosted proof PLANNED |
| Secrets | Generated and masked; separate bootstrap/migration/runtime credentials in Key Vault | IMPLEMENTED in workflow/Bicep; hosted proof PLANNED |
| Container | Non-root Node 22 standalone image with pinned base digest | IMPLEMENTED; local execution blocked by absent container runtime |
| Artifact | Public GHCR manifest digest, secret/private-material scan, SBOM, vulnerability scan, provenance, Git binding | Workflow IMPLEMENTED; hosted artifact PLANNED |
| Reproducibility | Two normalized clean builds with identical application-tree and OCI manifest digests | Workflow IMPLEMENTED; hosted proof PLANNED |
| Migration | Same-digest Container Apps Job execution and status | Role separation and six migrations VERIFIED locally; hosted job PLANNED |
| Access protection | Anonymous denial and exact Entra owner/smoke acceptance | Bicep/workflow IMPLEMENTED; hosted proof PLANNED |
| Health | Liveness, database readiness, bounded failure behavior | VERIFIED locally; hosted observation PLANNED |
| Runtime workflow | Full owner flow on the protected candidate revision | Local owner flow VERIFIED; hosted flow PLANNED |
| Observability | Revision, Activity Log, hashed Log Analytics payloads, database, and HTTP evidence | Workflow IMPLEMENTED; hosted evidence PLANNED |
| Promotion | Explicit owner approval and exact staging traffic operation | Workflow IMPLEMENTED; hosted decision PLANNED |
| Rollback | Controlled traffic rollback and post-rollback health proof | Workflow IMPLEMENTED; hosted proof PLANNED |
| Teardown | Owner-approved resource-group deletion, zero-active-resource/endpoint verification, and tombstone accounting | Workflow IMPLEMENTED; hosted proof PLANNED |
| Learning | One quarantined candidate maximum, independent evaluation, exact human decision, non-mutating packet, replay | SPECIFIED; actual hosted trace absent |
| Handoff | Exact immutable evidence and stop boundary | IMPLEMENTED for local gate |

Nothing moves to `VERIFIED` from configuration or documentation alone.

## Planned repository changes

### Review unit 0: governed Azure profile candidate

Add a project-owned intake answer source for the Azure staging target. Generate a candidate profile
and complete capsule under `.tmp/` with `elder intake` and `elder compile --dry-run --diff`. Review
the complete generated diff and record it as evidence. Do not hand-edit or replace Elder-owned
generated files in this local implementation authorization.

### Review unit 1: contracts and deterministic application controls

1. Ratify ADR 0009 after owner review.
2. Add `delivery/staging-deployment-contract.json` with provider, resources, immutable-artifact,
   identity, secret, migration, health, promotion, rollback, evidence, and authority fields.
3. Add `/api/v1/health/live` and `/api/v1/health/ready` through a small health bounded context.
4. Add release metadata validation for Git SHA, OCI digest, revision, and deployment run ID.
5. Add `output: "standalone"` to `next.config.mjs`.
6. Add a multi-stage non-root `Dockerfile` and `.dockerignore`. Resolve and review the full base
   image digest; do not leave a floating `node:22` reference.
7. Set the Next.js build ID from the exact Git SHA and add a normalized Git build-context script.
8. Require two independent clean builds to produce identical application-tree and OCI manifest
   digests before publication.
9. Extend Foundation contracts and Component/Integration/Stress tests before infrastructure code.

### Review unit 2: declarative staging infrastructure

Create `infra/staging/`:

- `main.bicep`: resource-group-scoped composition;
- `network.bicep`: VNet, subnets, delegation, private DNS, links;
- `secrets.bicep`: run-unique Key Vault, private endpoint, secret-scoped RBAC, purge protection;
- `identities.bicep`: separate bootstrap, migration, and runtime managed identities;
- `database.bicep`: PostgreSQL Flexible Server 16, private access, database, backup policy;
- `observability.bicep`: Log Analytics and diagnostic settings;
- `container-apps.bicep`: environment, app, migration job, probes, revision mode, auth skeleton;
- `parameters.example.json`: placeholder-only parameter shape; the approved workflow supplies all
  real secure values without writing a parameter file;
- `README.md`: bootstrap, what-if, deployment, inspection, rollback, and destruction boundaries.

Every module must emit resource IDs and immutable deployment values without emitting secrets.
Bicep lint and `what-if` must reject public PostgreSQL, missing Entra auth, unbounded scaling,
production names, cross-product resource IDs, or role assignment outside the staging resource
group.

The resource group is disposable by design. PostgreSQL data, Container Apps revisions, Key Vault
secrets, private networking, private DNS, and Log Analytics are not retained after the accepted
proof packet is exported. Entra application registrations and the four GitHub staging
Environments may persist because they are control-plane records with no planned Azure runtime
charge.

### Review unit 3: owner-approved hosted deployment

Add `.github/workflows/staging-deploy.yml`:

- trigger: manual `workflow_dispatch` only;
- input: full protected `main` commit SHA and owner-approved release note;
- permissions: `contents: read`, `id-token: write`, `packages: write`, `attestations: write`, and no
  other write scope;
- concurrency: one non-canceling `signaldesk-staging` deployment;
- environments: `staging-publication`, `staging-provision`, `staging-traffic`, and
  `staging-teardown`, each with required
  reviewer Neel and branch restricted to `main`;
- all actions pinned to immutable commit SHAs;
- no `pull_request_target`, fork secrets, repository write, or production environment;
- plan job verifies the commit equals current protected `main`, the merge ancestry, clean source,
  required workflow identity, and unchanged ruleset;
- verification job runs the exact product-owned ladder in order and stops on first failure;
- publication job pauses after the exact private package is created, requires the separately
  approved public-visibility mutation, and proves an anonymous digest pull before Azure eligibility;
- each Azure job logs into the exact tenant/subscription through its Environment-specific OIDC
  principal and variables;
- infrastructure job runs Bicep validation and `what-if`; owner-approved mutation applies only the
  reviewed plan;
- artifact job performs two normalized clean builds, rejects application-tree or OCI manifest
  digest drift, scans for secrets/private runtime material and vulnerabilities, attests, pushes to
  public GHCR, resolves, and records the OCI digest;
- migration job updates and invokes the exact-digest Azure migration job and waits terminally;
- candidate job creates a zero-traffic labeled revision and verifies it;
- promotion job uses `staging-traffic` and requires a separate owner approval before staging
  traffic changes;
- rollback-rehearsal job performs the exact controlled traffic reversal and verifies final state;
- evidence job uploads only redacted JSON/Markdown evidence with explicit retention;
- teardown job uses `staging-teardown`, requires separate owner approval, deletes the exact staging
  resource group, and
  fails unless Azure active-resource, endpoint, database, Key Vault, network, DNS-link,
  log-workspace, and resource-scoped identity absence are independently reread and any
  provider-retained deletion tombstone is recorded with its expiry.

The workflow must raise actionable errors and must not fall back from private networking, OIDC,
Key Vault, digest deployment, Entra protection, health, or rollback evidence.

## Azure bootstrap sequence

The owner performs or explicitly approves a one-time bootstrap separate from routine deployment:

1. reverify subscription state, Central India providers, quotas, PostgreSQL SKU, live price,
   sponsorship balance, and the USD 5 budget alert;
2. reverify global resource-name availability;
3. create `rg-signaldesk-stg-cin` with project, environment, owner, cost-center, and expiry tags;
4. create three separate Entra service principals for provision, traffic, and teardown so their
   Azure permissions cannot aggregate;
5. add one federated credential to each principal, restricted to repository
   `Neel-Error404/signal-desk` and its exact matching GitHub Environment;
6. create consequence-specific custom roles without production or tenant-wide authority and scope
   each principal to the exact staging resource group operation. The provision role's only
   role-assignment write is condition-bound to Key Vault Secrets User, secret child scopes, and a
   principal other than the provision principal;
7. create the four GitHub staging Environments, add Neel as required reviewer, restrict deployment
   to protected `main`, store non-secret Azure identifiers as Environment variables, duplicate the
   traffic principal client ID into `staging-provision` for the ingress allow-list, and store only
   the rotated Entra ingress secret as a protected `staging-provision` Environment secret;
8. create the Entra application registration used by Container Apps authentication and the
   separate smoke-test application identity;
9. capture identifiers in an owner-controlled private record; commit only symbolic variable names
   and redacted hashes.

If GitHub cannot enforce the reviewer/branch rule or the OIDC subject is broader than the staging
Environment, stop before resource creation.

## First deployment sequence

1. Owner dispatches the workflow with exact protected `main` SHA.
2. The workflow reruns Foundation, Component, Integration, Workflow, Stress, Build, high-severity
   dependency audit, and Elder validation in order.
3. Build the non-root standalone image twice from normalized clean contexts, compare the
   application-tree and OCI manifest digests, generate SBOM, scan for secrets/private runtime
   material and vulnerabilities, attest, push the initially private GHCR package, and resolve its
   digest.
4. The owner performs the separately approved GHCR public-visibility mutation, then approves
   `staging-publication`; the job proves anonymous digest pull and exact application-tree identity.
5. `staging-provision` pauses before any Azure resource mutation. Azure OIDC reconstructs the exact
   provision principal without a client secret.
6. Bicep validation and `what-if` match the approved resource plan, and the owner confirms any new
   resource or cost-bearing mutation.
7. Verify the digest and attestations from GHCR/GitHub before any migration.
8. Run the database-role bootstrap job and then the migration job with that digest, requiring one
   successful terminal execution of each.
9. Create candidate revision `sd008-<shortsha>-<run>` at zero traffic with exact release metadata.
10. Verify platform probes, liveness, readiness, anonymous denial, automated authorized smoke,
    complete owner flow, revision logs, and absence of secret-shaped output.
11. `staging-traffic` pauses for owner approval of the staging traffic change.
12. Move 100% staging traffic to the healthy candidate and repeat health/access/owner-flow checks.
13. Execute the controlled same-digest second-revision traffic change and rollback rehearsal.
14. Export the complete redacted public packet and owner-controlled private packet, bind both by
    digest, and verify they are readable outside the disposable resource group.
15. `staging-teardown` pauses for owner approval of destruction after accepting rollback and
    evidence completeness.
16. Delete `rg-signaldesk-stg-cin`; do not retain the app, PostgreSQL server, active Key Vault,
    accessible secrets, network, private DNS link, Log Analytics workspace, or resource-scoped
    identities.
17. Independently reread Azure resource state and the staging URL to prove active/billable resource
    and endpoint absence. Record the purge-protected Key Vault tombstone and any provider retention
    record with expiry. Any active orphan, unexpected charge, accessible secret, or reachable
    endpoint blocks SD-008 closure.
18. Write the exact evidence and handoff, close the Elder session, and stop.

## Controlled failure proofs

SD-008 is not verified without all of these bounded failures:

1. **Anonymous access:** request the staging URL without Entra identity; prove denial before product
   content is returned.
2. **Database unavailable:** temporarily deny the candidate's database path before it receives
   traffic; liveness stays bounded, readiness returns `503`, and no traffic moves.
3. **Migration failure:** run a disposable staging-only invalid migration case or invalid migration
   job configuration against an isolated database branch/server restore; prove the job fails and no
   application revision or traffic change follows. Do not corrupt the accepted staging database.
4. **Digest mismatch:** substitute a non-authorized digest in a dry-run/fixture path; prove the
   deployment contract rejects it before provider mutation.
5. **Unhealthy candidate:** fail the candidate readiness fixture at zero traffic; prove promotion is
   denied and the current healthy revision remains unchanged.
6. **Rollback:** move staging traffic to the controlled second same-digest revision, restore the
   prior revision, and prove traffic, health, access protection, and logs match the rollback record.

Failure injection must be isolated, deterministic, reversible, and unable to touch production or
real customer data.

## Ordered verification ladder

### Foundation

- JSON/ADR/work-item/contract consistency;
- Bicep build and lint;
- exact resource names, environment, region, sizes, tags, and public-network denials;
- workflow triggers, permissions, OIDC subject, reviewer gate, concurrency, action pins;
- Docker base digest, non-root user, standalone output, health route boundaries;
- secret-shape, production-name, mutable-image, and forbidden-permission negative fixtures.

### Component

- liveness success and bounded error contracts;
- readiness success and explicit `503` database failure;
- release metadata and digest validation;
- redaction and actionable error types;
- deployment-contract parser and rollback target validation.

### Integration

- build and run the exact image locally;
- build twice from normalized clean Git contexts and compare application-tree and OCI manifest
  digests;
- apply six current migrations to isolated PostgreSQL;
- prove runtime and migration credentials are separate;
- verify container-to-PostgreSQL readiness, TLS configuration, graceful shutdown, and no secret
  output;
- Bicep `what-if` fixture inspection and OIDC claim validation fixtures.

### Workflow

- complete owner flow from the built container;
- hosted manual workflow dry run through artifact/evidence preparation;
- exact-digest migration job and zero-traffic candidate deployment;
- anonymous denial and authorized Entra smoke;
- owner-approved staging traffic transition.

### Stress

- concurrent health/owner requests within staging bounds;
- database outage and recovery;
- restart/scale-to-zero cold start;
- migration duplicate/timeout/digest mismatch;
- unhealthy-candidate non-promotion;
- secret and identity redaction;
- controlled rollback and post-rollback observation;
- exact resource-group deletion, endpoint absence, orphan-resource detection, and expected
  deletion-tombstone accounting.

Run one level at a time. On failure, record root cause, correct it, and rerun that same level before
advancing. Do not weaken controls or hide a provider failure behind retries or fallbacks.

## Elder learning lane

After the actual hosted teardown trace is complete, copy only redacted evidence into an external
quarantine. Propose at most one bounded candidate from the observed trace rather than from this
plan. Run counterfactual replay and shadow observations, then require evaluation by an identity
independent from the candidate owner. The evaluator remains advisory. Neel must approve or reject
the exact candidate state and evaluation digests. An approval may issue only an immutable
non-mutating promotion packet. Replay must bind candidate bytes, observations, evaluation,
decision, packet, and the append-only event chain. Candidate application is outside SD-008.

The learning claim must be cloud-provider-neutral. Azure, Container Apps, Entra, Key Vault, and
Bicep are the concrete SD-008 adapter and observed evidence source, not the universal rule. The
weakest eligible hypothesis is that CI/CD approval gates and cloud execution authority are separate
control layers: the factory must evaluate permissions at the effective cloud principal and fail
closed when publication, provisioning, traffic mutation, rollback, or teardown authority is
aggregated through one principal or delegation chain. Counterfactual and shadow cases must exercise
equivalent principal and permission structures without depending on Azure product names. A broader
multi-cloud architecture, policy, evaluator, or skill change requires evidence beyond this single
provider trace and is outside SD-008.

## Evidence packet

The final public/redacted packet must bind:

- repository, PR, protected base/head/merge commits, trees, and diff;
- review and deployment workflow/run/job/check identities and actors;
- GitHub Environment approval identity and time;
- OIDC issuer, audience, redacted subject hash, federated credential, and role digest;
- Bicep source digest, what-if digest, deployment name, resource IDs as redacted hashes, region,
  SKU, cost estimate, and operation results;
- Dockerfile/base digest, Git commit, OCI manifest digest, secret/private-material scan, SBOM,
  vulnerability report, provenance, public GHCR package, and tag lock state;
- PostgreSQL version/network/TLS/backup state and redacted credential-role separation;
- migration job definition, image digest, execution ID, start/end, and result;
- Container Apps environment, app, candidate/accepted/rollback revision IDs, labels, digest,
  replica/probe state, and traffic weights;
- anonymous and authorized access results, liveness/readiness, owner workflow, correlation IDs,
  Log Analytics queries/windows, and secret scan;
- every human intervention, limitation, rollback action, final state, and stop boundary.
- evidence export locations and digests, teardown approval, resource-group deletion operation,
  post-delete inventory, endpoint failure, orphan-resource query results, and deletion-tombstone
  expiry.
- learning quarantine, candidate artifact and state digests, observations, independent evaluation,
  exact human decision, non-mutating packet when approved, and journal replay.

The public repository must not contain subscription IDs, tenant IDs, object IDs, client IDs,
database hosts, FQDNs before approval, connection strings, tokens, cookies, passwords, private IPs,
or raw logs that contain customer or identity data. Exact sensitive identifiers belong in an
owner-controlled private packet whose digest is referenced by public evidence.

## Branch, commit, and PR plan

- One branch: `work/sd-008-azure-staging-baseline` from exact protected `main` merge
  `623ff665d2a276c7541622f73e34d15ee6a7d2bf`.
- Commit 1: ratified contracts, governed Azure profile candidate, and generated-diff evidence.
- Commit 2: health behavior, release metadata, migration safety, and tests.
- Commit 3: reproducible non-root container build and artifact contracts.
- Commit 4: Bicep infrastructure and deterministic validation.
- Commit 5: manual staging workflow, provider fixtures, learning template, and evidence templates.
- Commit 6: local verification evidence and review corrections.
- One PR to `main`, guarded by `signaldesk-ordered-review-gate`; no staging mutation before PR
  review and owner merge.
- After merge, owner separately approves provisioning, traffic, and teardown from exact main.
- Deployment evidence may update a separate evidence-only branch/PR; it must not change the
  already deployed artifact digest.

No branch deletion, squash, rebase, force push, merge, or cloud mutation is implied by this plan.

## Required human interventions

1. ADR 0009 ratification and bounded local implementation — APPROVED August 20, 2026.
2. Approve applying the reviewed generated Elder capsule replacement.
3. Approve the live Azure cost and quota preflight.
4. Approve GitHub Environments, Entra applications, OIDC credentials, and custom role creation.
5. Approve the implementation branch commit/push/PR mutations.
6. Review and merge the SD-008 implementation PR.
7. Approve `staging-provision`.
8. Approve `staging-traffic` after candidate evidence, including the rollback rehearsal.
9. Accept or reject final SD-008 staging evidence.
10. Approve `staging-teardown` after evidence export and rollback acceptance.
11. Approve or reject the exact learning candidate and evaluation digests.

## Stop boundary

This local implementation pass may edit product-owned source, tests, draft evidence, Docker,
Bicep, and workflow files and may generate candidate output under `.tmp/`. It does not stage,
commit, push, open a PR, replace Elder-owned generated files, register an Entra application,
create a GitHub Environment, create or modify Azure resources, publish an image, run hosted
migrations, expose a URL, deploy, release, roll back, destroy resources, apply learning, activate
P5.2, claim L2/L3, or count qualification time. Each later mutation begins only after its listed
human decision.
