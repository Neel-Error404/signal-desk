# ADR 0010: SD-008 Bootstrap And Learning Corrections

## Status

Accepted for bounded local implementation by Neel's exact ratification on August 20, 2026. The
ratification authorizes the smoke identity, effective cloud-authority, post-delete verification,
hosted trace-assembly, tests, and documentation corrections in this ADR. It does not authorize
staging, commit, push, pull-request creation, GitHub Environment or package mutation, Entra
mutation, Azure mutation, deployment, teardown, learning application, or production. ADR 0010
amends ADR 0009 only for the correction boundaries stated here.

**Date:** August 20, 2026

**Change class:** Infrastructure with security, evidence, and learning-governance impact

## Context

The live preflight verified that Central India supports the planned Container Apps and PostgreSQL
baseline at a bounded expected cost. It also found five gaps between ADR 0009's intended controls
and the merged implementation:

1. a manual workflow could publish from a selected ref after proving only that the input SHA equals
   `GITHUB_SHA`, without proving the ref and SHA are the current protected `main`;
2. raw Azure deployment output, FQDNs, workspace identifiers, and logs were selected for upload as
   artifacts associated with a public repository;
3. Azure authorizes Container Apps traffic and broader app updates through the same management-plane
   write operation, so differently named service principals do not create a traffic-only provider
   permission;
4. the accepted design calls for a dedicated smoke identity, while the implementation uses the
   provision and traffic deployment principals as smoke clients;
5. resource-group-scoped teardown authority disappears with the resource group and cannot perform
   the planned subscription-level post-delete reread.

An `expiresAt` resource-group tag is also evidence, not an automatic deletion mechanism. The first
SD-008 session must remain attended until teardown and must treat any orphan as a blocking incident.

## Decision

### Protected source before publication

Add a read-only `protected-main-source` job before every package write or attestation. It must fail
unless all of the following bind to the same lowercase 40-character commit:

- the workflow ref is exactly `refs/heads/main`;
- `github.sha` equals the owner-supplied source commit;
- the live GitHub `heads/main` ref equals that commit;
- active ruleset `21058424` includes `main`, has no bypass actors, and requires
  `signaldesk-ordered-review-gate` in strict mode;
- a successful required check with that name exists for the exact source commit.

The job has read-only repository and check permissions. Package and attestation writes remain in a
downstream job that cannot start when this proof fails.

### Public and private evidence

Raw provider responses remain ephemeral runner inputs and are never uploaded directly. A
repository-owned exporter must:

- reject secrets, bearer tokens, cookies, connection strings, passwords, and credential-shaped
  fields rather than attempting to preserve them;
- produce a redacted public JSON packet in which sensitive identifiers are replaced by typed
  SHA-256 bindings;
- produce a private JSON packet containing the non-secret exact identifiers required for owner
  replay;
- encrypt the private packet with a separately supplied owner public key by AES-256-GCM with an
  RSA-OAEP-SHA256-wrapped data key;
- upload only the public packet and encrypted envelope;
- bind public packet, private plaintext, encrypted envelope, source artifacts, run, commit, phase,
  and owner public-key fingerprint by SHA-256.

The owner private key never enters GitHub, the repository, Elder, or Azure. The public key is a
non-secret GitHub Environment variable duplicated only where evidence export occurs.

### Effective cloud authority

The provider permission envelope must be stated honestly:

- provision is resource-group-scoped infrastructure authority and includes Container Apps write;
- traffic is exact-app-scoped Container Apps write, because Azure does not expose a traffic-body-only
  RBAC operation;
- teardown is resource-group deletion authority;
- post-delete verification uses a separately declared minimal subscription-read assignment limited
  to resource-group existence, resource inventory, and deleted-vault metadata.

GitHub Environment approval, exact workflow content, request/evidence digests, short token lifetime,
exact resource scope, and provider reread constrain use. They do not turn a broad provider action
into a traffic-only permission. SD-008 may prove supervised staging control with this disclosed
limitation; it may not claim autonomous or provider-enforced field-level separation.

### Dedicated smoke identity

Use a separate `signaldesk-sd008-smoke` application identity. It receives two GitHub federated
credentials, one for `staging-provision` and one for `staging-traffic`, and only the ingress
application permission required by the smoke flow. The workflow exchanges a GitHub OIDC assertion
directly for the ingress API token without replacing the Azure CLI deployment login. Provision and
traffic client IDs are removed from the Container Apps authentication allow-list.

### Expiry and teardown

The workflow verifies an RFC 3339 `expiresAt` no more than eight hours in the future. This is not
automatic cleanup. The first run is attended, the complete hosted workflow remains bounded by job
timeouts, teardown approval is requested on every provisioned run, and an active orphan blocks
SD-008. Automatic unattended deletion is outside this amendment and requires a separately governed
destructive-authority design.

### Two-lane learning

Lane 1 is complete only after redacted evidence export, rollback, owner-approved deletion, independent
post-delete reread, endpoint absence, tombstone accounting, conservative cost capture, and owner
removal plus absence verification of the temporary subscription-scoped post-delete role. The cost
packet is a retail upper-bound estimate and cannot claim final provider billing while Azure billing
data is delayed. Lane 2 can then:

1. ingest only the redacted Lane 1 trace into an external quarantine;
2. verify trace schema, source digests, event order, exact commit/run, privacy scan, teardown, and
   absence evidence before candidate creation;
3. classify observations as cloud-neutral, Azure-adapter-specific, SignalDesk-specific, or unresolved;
4. create at most one immutable Elder candidate from the actual trace;
5. require at least two counterfactual-replay and two shadow cases with no side effects;
6. require `signaldesk-evaluator`, which is independent from `signaldesk-learning-agent`;
7. require Neel's exact approval or rejection bound to candidate and evaluation SHA-256 values;
8. permit only an immutable non-mutating promotion packet and deterministic journal replay.

The lane cannot reuse the SD-007 candidate or approval, generate a candidate from this plan alone,
apply the packet, mutate trusted memory or policy, or support a maturity claim.

## Executable fitness functions

- Foundation tests reject a workflow without the protected-main proof before package write.
- Component tests reject secret-shaped evidence and prove deterministic public redaction plus
  owner-key encryption/decryption.
- Foundation and Component tests reject a learning trace without teardown, absence, privacy,
  ordering, actual-hosted-source, or one-candidate boundaries.
- The hosted workflow uploads no raw `what-if`, deployment, FQDN, workspace, activity, or log file.
- A learning candidate cannot be created until the final Lane 1 trace validator passes.
- Elder P4.6 remains the authority for candidate, observations, evaluation, decision, promotion
  packet, and replay.

## Consequences

The correction adds a public-key bootstrap input and accurately discloses Azure's provider-action
granularity. It retains human consequence gates and makes the hosted trace directly consumable by
the Elder learning lane. It does not create a provider-neutral deployment engine, automatic expiry,
production authority, canonical L2, L3, or self-modifying learning.

## Approval boundary

Ratification, Git delivery, GitHub Environment configuration, public-key registration, Entra
applications, federated credentials, role definitions or assignments, budget creation, resource
group creation, package visibility, hosted dispatch, traffic, teardown, and learning decision each
remain separately gated.
