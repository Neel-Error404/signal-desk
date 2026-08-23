# ADR 0012: SD-008 Phase-Proportional Artifact Evidence

## Status

Accepted for bounded local implementation by Neel's exact approval, `APPROVE SD-008 RESCUE PLAN
AND ADR-0012 DIRECTION FOR LOCAL IMPLEMENTATION ONLY`, on August 23, 2026. This ADR amends ADRs 0009, 0010, and 0011 only for the artifact evidence and authority ordering stated here. It does not
authorize Git staging, commit, branch changes, push, pull-request creation, workflow dispatch,
package publication or visibility changes, attestations, GitHub Environment mutation, identity or
credential changes, Azure mutation, deployment, traffic, rollback, teardown, learning application,
or production.

**Date:** August 23, 2026

**Change class:** Infrastructure with security and evidence-governance impact

## Context

The hosted SD-008 attempts exposed three different failure classes:

- run `32557411759` failed workflow permission admission;
- run `32561479012` passed an OCI archive to `docker load`, even though Docker requires its Docker
  archive exporter for that path;
- runs `32581288784` and `32584573360` produced independent OCI config or manifest differences.

Run `32580353832` was cancelled, and the later PR 13 diagnostic workflow was never dispatched.
These observations are failure evidence, not provider acceptance or a successful staging claim.

The existing workflow also built two proof images and then rebuilt a third image for publication.
That structure could not prove that the locally executed, scanned, SBOMed artifact was the exact
artifact published and later supplied to deployment. Requiring byte-identical OCI metadata from a
second clean build as a prerequisite for a basic, attended staging rehearsal also made a useful
diagnostic stronger than the risk boundary requires. It must remain visible, but it must not replace
the blocking controls on source, application bytes, artifact inspection, security, provenance, or
digest identity.

## Decision

### Blocking canonical artifact path

SD-008 will build one canonical deployable image exactly once from the exact authorized protected
source and pinned inputs. One Buildx invocation may export the same solve result through the Docker
exporter for local execution and through the OCI exporter for diagnostics. The Docker export, not
the OCI archive, is the loadable local image.

That exact canonical image must, in order:

1. start through its real default command, answer the bounded HTTP liveness endpoint without a
   database dependency, retain useful container logs runner-locally on failure without uploading
   them, and stop with checked, fail-closed cleanup whose absence proof requires a successful exact
   container inventory query;
2. produce its application-tree SHA-256;
3. pass the forbidden-file and secret-shaped-content scan;
4. produce an SBOM;
5. pass rejection of fixed high or critical vulnerabilities;
6. be tagged and published without rebuilding to the initially private GHCR package;
7. resolve to an immutable registry manifest digest whose config digest matches the locally
   executed canonical image;
8. be pulled and rerun by registry digest under authenticated publication authority, with the same
   application tree;
9. receive provenance and SBOM attestations bound to that registry digest; and
10. be passed to every later migration and Container Apps operation only by registry digest.

Exact source, current protected `main`, the ordered test ladder, pinned action/tool/base-image
inputs, clean normalized context, canonical application-tree identity, image execution,
secret/forbidden-file scan, vulnerability rejection, SBOM, provenance, immutable registry digest,
private initial publication, and later digest-only deployment remain blocking.

The artifact dispatch may create the package privately and record authenticated publication
evidence. It must then stop at the protected `staging-publication` Environment. Package visibility
may change only through a separately owner-approved action. Anonymous/public pull and application-
tree verification occur only after that approval; neither this ADR nor local static checks claim
that the package is public.

### Independent advisory build

One separate no-cache build remains required as an observation. Application-tree equality remains blocking because differing application bytes mean the candidate is not the same application.

OCI config, manifest/layer, and final-digest bit identity is advisory evidence
for this basic attended staging phase. Every compared digest and mismatch must be emitted in a
sanitized minimal diagnostic artifact immediately after generation even when a later scan, SBOM,
publication, or attestation gate fails. That artifact contains only the application-tree result,
both canonical and advisory application-tree SHA-256 values, config, manifest, layer, and final
digests, comparison booleans, blocking-mismatch state, and claim-suppression state. It is written
before a tree mismatch terminates the build, and missing-file retention is itself an error. Raw
config including environment and history, raw manifest bodies, and application logs remain
runner-local and must never be uploaded.
A mismatch is an explicit advisory failure, continues only after application-
tree equality and all blocking checks pass, and suppresses every reproducibility success claim.
It cannot be reported as reproducible, silently ignored, or converted into a successful
reproducibility verdict.

### Authority and completion ordering

Cloud authority begins only after all of the following exist for the exact source and run:

1. authenticated private publication evidence for the canonical artifact;
2. the separate owner-approved package-visibility decision and `staging-publication` verification;
3. owner approval of staging provisioning through the protected `staging-provision` Environment.

The Azure runtime currently consumes public GHCR. Solving private registry pull would require a new
registry identity and contract outside this rescue. Public visibility therefore remains a bounded
staging limitation and a separately approved consequence, not an implicit side effect of artifact
publication.

After those artifact gates, the owner renders one phase-specific, non-mutating authority packet at
a time from the existing SD-008 authority contract. Every packet binds the exact source commit,
immutable image digest, publication-evidence SHA-256, owner approval reference, approval SHA-256 and
approval time, GitHub run identifier, requested phase, exact principal and scopes, issuance time,
and expiry time. The renderer cannot assign a role, create a credential, approve an Environment, or
invoke Azure.

Immediately before use, the validator compares the packet's owner approval reference, digest, and
timestamp with independently supplied owner-controlled variables in the matching protected GitHub
Environment. This prevents the packet from self-asserting its own expected approval tuple. It does
not query GitHub's deployment-review API or cryptographically verify a review event; that remains a
hosted evidence limitation and must not be claimed by local validation.

Each packet also binds the phase-specific Azure application/client ID, tenant ID, and
service-principal object ID. Immediately before every declared mutation, the workflow obtains a
current ARM access token, passes it by standard input to a local decoder, and fails closed unless
its `appid`, `oid`, and `tid` claims exactly match the packet and the Azure CLI account type is a
service principal. The token is not printed or persisted, and no secret or credential value enters
the packet or evidence.

The same immediate check freshly enumerates direct and inherited Azure role assignments at the
exact mutation-relevant ARM scope and accepts only the packet's exact role-definition IDs, scopes,
principal type, assignment IDs, and condition/version. It rereads custom-role definitions at that
scope and compares Actions, NotActions, DataActions, NotDataActions, and AssignableScopes. The
local token decoder rejects a non-empty `groups` claim or either supported group-overage signal.
Absence of those token signals does not prove that the service principal has no Microsoft Entra
group memberships. Missing or malformed identity claims, token group/overage signals, extra
authority, or definition drift blocks the mutation. This is a point-in-time fail-closed check, not
an atomic Azure authorization snapshot.

For `teardown-closure`, the expected live assignment set changes after deletion: only the
subscription-scoped post-delete verifier may remain. The workflow also performs an exact ARM GET
for the packet-bound teardown assignment ID and accepts only HTTP 404 before running the closure
validator. The post-delete verifier remains last so this absence proof is still authorized.

Authority is sequenced as follows:

1. Provision receives only the exact-resource-group provision role. Traffic, evidence-reader,
   teardown, and post-delete-verifier assignments must be absent.
2. After the exact Container App exists and provision authority is absent, traffic receives the
   exact-app traffic role plus the exact-resource-group evidence-reader role.
3. After traffic and evidence-reader authority is absent, their removal time and closure-evidence
   digest are bound into a teardown packet issued strictly afterward. Closure receives the teardown
   role plus the subscription-read-only post-delete verifier. The teardown assignment
   disappears with or is removed after resource-group deletion; the verifier is removed last, only
   after absence evidence is complete.

Timestamps use strict RFC 3339 UTC. A packet lasts no more than a maximum eight-hour lease and never
renews automatically. Immediately before each Azure mutation, the workflow revalidates the packet
digest and exact source, image, publication evidence, run, phase, principal, scope, and remaining
window. Provision deployment, job start, and app update each require 90 minutes remaining; traffic
promotion requires 45; rollback or planned restoration requires 15; teardown deletion and closure
each require 60. A mismatch or insufficient window fails closed before mutation. Teardown uses its
fresh packet and never reuses the provision clock.

Azure RBAC assignment expiry is procedural evidence, not a provider-enforced expiry claim. The owner
records assignment creation and planned removal, and the workflow rereads exact presence or absence.
The ingress Entra client credential and `staging-provision` Environment secret are per-session JIT
inputs with an eight-hour maximum lifetime; they are never written to repository or workflow
artifacts, and closure requires owner removal of the Environment secret, credential revocation, and
absence evidence. The existing schema-v1 authority-closure record must prove teardown-role absence,
credential revocation, Environment-secret removal, and post-delete-verifier removal last; no new
closure evidence format is introduced.

Partial authority bootstrap failure requires bounded compensating cleanup within fifteen minutes:
stop new mutations; remove any phase assignments already created; remove the Environment secret and
revoke the ingress credential if created; delete an owner-created empty resource group when safe;
verify absence; and record a blocking incident. Cleanup cannot silently broaden or renew authority.
If current authority is insufficient, the owner must approve a fresh teardown packet before cleanup.

Full staging behavior, controlled rollback, approved teardown and absence proof, protected
environments, separated identities, exact source binding, attestations, hosted trace assembly, and
the governed learning decision remain mandatory for SD-008 completion. This phase-proportional
artifact decision weakens none of rollback, teardown, protected environments, separated identities,
source binding, or attestations.

## Executable fitness functions

- Foundation tests bind this ADR to the existing SD-008 work item and deployment contract.
- Foundation tests bind one-phase JIT packets, strict time windows, procedural expiry language,
  phase separation, credential cleanup, and bounded compensating cleanup to the authority contract.
- Component tests render and validate exact phase packets and reject malformed UTC, leases longer
  than eight hours, approval/binding mismatches, stale teardown issuance, and insufficient remaining
  windows at the boundary for every declared mutation. Hosted-trace tests reject incomplete or
  misordered schema-v1 authority closure.
- Foundation tests reject a workflow that rebuilds during publication, loads an OCI archive through
  Docker, omits canonical execution/security/SBOM checks, blocks solely on advisory OCI mismatch,
  omits diagnostics, or permits cloud authority before both publication gates and owner provision
  approval.
- A local adapter reports reusable-workflow permission compatibility, locally decidable workflow
  graph/admission checks, Docker versus OCI exporter separation, Docker capability, and required
  diagnostic outputs. When Docker exists, it performs a temporary local Docker daemon mutation with
  verified cleanup. It derives the already pinned Node base-image digest from the project Dockerfile,
  creates a uniquely named isolated Buildx builder, exports and runs a probe image, and verifies
  builder and image removal through successful exact inventory queries. Docker build steps use
  `--network=none`, while builder bootstrap and pinned-base resolution may perform read-only
  registry pulls. It performs
  no repository, Git, registry-write, or provider mutation. Missing local Docker, Buildx, actionlint,
  or `jq` is reported as blocked or failed honestly, never as a pass.
- Local static checks and unavailable-tool reports are not GitHub, GHCR, Docker-runtime, attestation,
  or Azure execution evidence.

## Consequences

The deployable artifact now has one auditable lifecycle rather than a proof build followed by an
unrelated publication rebuild. Independent OCI instability stays observable and actionable without
preventing a basic attended staging exercise when application bytes and all security and identity
bindings agree. The workflow may describe an advisory mismatch, but it may not make a positive
reproducibility claim for that run.

The private-to-public package transition remains necessary for the currently designed Azure
runtime. That visibility is not suitable for a private application artifact without a separately
governed registry-authentication change.

## Approval boundary

This approval covers local implementation and Foundation verification only. Sequential independent
review, the complete ordered ladder, Git delivery, provider admission, private package publication,
package visibility, attestations, provisioning, traffic, rollback, teardown, hosted trace, and
learning decisions each remain separately gated. The hard-stop/revert boundary remains
`623ff665d2a276c7541622f73e34d15ee6a7d2bf`.
