# SD-008 Rescue Artifact Gate Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Amend SD-008 so one canonical image is built once and that exact artifact is executed, inspected, scanned, SBOMed, privately published, attested, registry-verified, and handed to later digest-only deployment, while independent two-build OCI reproducibility remains visible advisory evidence.

**Architecture:** Keep the existing manual workflow, consequence-specific environments, identities, evidence formats, rollback path, and teardown path. Replace the three-build artifact path with a canonical dual export (Docker daemon plus OCI diagnostics) and one independent advisory build; block on application-tree divergence, but record OCI config/manifest/final-digest differences as advisory failure and suppress any reproducibility claim. Add a small local Node adapter that reports workflow admission and local Docker capability without mutating GitHub, GHCR, Azure, or another provider. When Docker exists, the adapter performs a temporary local Docker daemon mutation with verified isolated-builder and image cleanup. Docker build steps use `--network=none`, while builder bootstrap and pinned-base resolution may perform read-only registry pulls. The adapter performs no repository, Git, registry-write, or provider mutation.

**Tech Stack:** GitHub Actions YAML, Docker Buildx, Bash, Node.js 22, TypeScript/Vitest Foundation contracts, JSON/Markdown governed records.

---

## Authority and stop boundary

- Owner approval: `APPROVE SD-008 RESCUE PLAN AND ADR-0012 DIRECTION FOR LOCAL IMPLEMENTATION ONLY`.
- Change class: `infrastructure` with security and evidence-governance impact.
- This pass may edit only local project-owned workflow, script, tests, work-item/contract, ADR, plan, reproduction, and evidence files.
- Do not stage, commit, switch branches, push, open a pull request, dispatch a workflow, publish a package, create credentials, or mutate GitHub, GHCR, Entra, Azure, or another provider.
- Hard-stop/revert boundary: `623ff665d2a276c7541622f73e34d15ee6a7d2bf`. Any rescue that requires weakening source binding, protected environments, separated identities, attestations, rollback, teardown, or the ordered ladder stops for owner review instead of proceeding.
- Stale authority cleanup is complete and out of scope. The separately owner-approved Rescue Step 5
  may now implement only the existing-contract JIT authority sequencing below; it may not create or
  assign identities, roles, credentials, Environments, or provider resources.

### Task 1: Ratify the phase-proportional artifact decision

**Files:**
- Create: `docs/adr/0012-sd008-phase-proportional-artifact-evidence.md`
- Modify: `docs/work-items/SD-008.json`
- Modify: `delivery/staging-deployment-contract.json`
- Test: `tests/foundation/contracts.test.ts`

**Step 1: Name the public seam**

Use the machine-readable `SD-008` work item and staging deployment contract, cross-checked against ADR 0012, as the public seam. A reviewer must be able to determine blocking artifact gates, advisory reproducibility evidence, authority sequencing, and completion requirements without interpreting workflow internals.

**Step 2: Write the failing Foundation test**

Add one focused Vitest contract test requiring:

- ADR 0012 to amend ADRs 0009-0011 without weakening their controls;
- one canonical artifact build and exact-artifact reuse through run, scan, SBOM, private publication, attestation, registry verification, and digest-only deployment;
- application-tree equality as blocking;
- independent OCI config, manifest/layer, and final-digest identity as advisory evidence;
- an explicit suppressed reproducibility claim on advisory mismatch;
- Azure authority only after publication evidence and owner provisioning approval;
- full staging, rollback, teardown, trace, and learning gates for SD-008 completion.

**Step 3: Run the focused test and preserve RED**

Run:

```powershell
npx vitest run --config vitest.foundation.config.ts tests/foundation/contracts.test.ts -t "records the ADR 0012 phase-proportional artifact boundary"
```

Expected: `FAIL` because ADR 0012 and its machine-readable fields do not exist.

**Step 4: Implement the minimum governed records**

Create ADR 0012 and update only the current `SD-008` work item and existing staging deployment contract. Keep exact source, pinned inputs/base, the ordered ladder, private-first publication, attestations, digest binding, protected environments, separated identities, rollback, teardown, hosted trace, and learning requirements.

**Step 5: Rerun the same focused test and preserve GREEN**

Run the Step 3 command. Expected: `PASS`.

**Step 6: Sequential review gate**

Review ADR -> work item -> deployment contract in that order. Stop on contradictory authority, a new evidence format, or any claim of hosted success.

### Task 2: Make one canonical artifact flow through every blocking artifact gate

**Files:**
- Modify: `.github/workflows/sd008-azure-staging.yml`
- Test: `tests/foundation/contracts.test.ts`

**Step 1: Name the public seam**

Use the manual `SD-008 Azure Staging Rehearsal` workflow as the public seam. The observable contract is its ordered jobs, explicit permissions, build commands, diagnostics, blocking comparisons, publication command, attestation subject, registry digest output, and downstream digest reference.

**Step 2: Write the failing Foundation test**

Require the workflow to:

- grant the reusable ordered gate compatible read-only permissions;
- build `signaldesk:sd008-canonical` once with Docker and OCI outputs;
- run the canonical Docker image and use it for forbidden-file scanning, vulnerability scanning, and SBOM generation;
- start the canonical image through its real default command, probe `/api/v1/health/live` without a
  database dependency, retain failure logs runner-locally, and fail closed unless container cleanup
  is verified;
- perform one separate advisory build with its own Docker and OCI outputs;
- write both application-tree SHA-256 values, equality/status, and blocking-mismatch state before
  blocking on canonical/advisory application-tree divergence;
- emit config, manifest/layer, and final-digest diagnostics without failing solely on OCI bit mismatch;
- retain a sanitized minimal `if: always()` artifact containing only the application-tree result,
  config/manifest/layer/final digests, comparison booleans, and claim suppression immediately after
  generation with missing-file retention treated as an error; never upload raw config
  environment/history, manifest bodies, or application logs;
- set the reproducibility claim to suppressed when advisory comparison fails;
- publish the canonical image with `docker push`, never rebuild it in the publish step;
- verify registry config/application bytes and attest the registry digest;
- keep `staging-provision` dependent on `staging-publication` and use the verified digest.

**Step 3: Run the focused test and preserve RED**

Run:

```powershell
npx vitest run --config vitest.foundation.config.ts tests/foundation/contracts.test.ts -t "reuses one canonical image through publication and reports advisory OCI diagnostics"
```

Expected: `FAIL` against the existing third-build publication path.

**Step 4: Implement the minimal workflow change**

Change only the artifact jobs and the caller permission needed by the reusable review gate. Preserve all later Azure, traffic, rollback, evidence, teardown, and learning job behavior. The canonical tag must be unique to the exact commit and run; the separate advisory tag must never be pushed.

**Step 5: Rerun the same focused test and preserve GREEN**

Run the Step 3 command. Expected: `PASS`.

**Step 6: Sequential review gate**

Review source proof -> reusable ordered gate -> canonical build/run/scan/SBOM -> advisory diagnostics -> private push -> registry digest/config/tree verification -> attestations -> `staging-publication` -> owner-gated `staging-provision`. Stop if a mutable tag becomes a deployment input or any cloud login appears before the publication gate.

### Task 3: Add the smallest bounded local adapter smoke seam

**Files:**
- Create: `scripts/check-sd008-artifact-adapter.mjs`
- Modify: `package.json`
- Modify: `tests/foundation/contracts.test.ts`

**Step 1: Name the public seam**

Use `node scripts/check-sd008-artifact-adapter.mjs --format json` as the public seam. It emits
explicit `pass`, `fail`, or `blocked` checks. It statically inspects local workflow text and tool
availability; when Docker exists, it also performs a temporary local Docker daemon
mutation with verified cleanup. More precisely, Docker build steps use `--network=none`, while
builder bootstrap and pinned-base resolution may perform read-only registry pulls. It performs no repository, Git,
registry-write, or provider mutation.

**Step 2: Write the failing Foundation test**

Execute the adapter in Vitest and require diagnostics for:

- reusable-workflow caller permission compatibility;
- local workflow graph/admission invariants;
- Docker/OCI exporter separation;
- Docker load/run capability;
- reproducibility diagnostic output presence.

The current workstation has no Docker or actionlint, so those checks must return `blocked` with actionable tool names; they must never be converted into a false pass or provider-acceptance claim.

**Step 3: Run the focused test and preserve RED**

Run:

```powershell
npx vitest run --config vitest.foundation.config.ts tests/foundation/contracts.test.ts -t "reports non-mutating SD-008 adapter admission and runtime diagnostics"
```

Expected: `FAIL` because the adapter command does not exist.

**Step 4: Implement the minimum adapter**

Use Node standard-library reads and bounded child-process probes. Do not add a dependency or YAML
framework. Static workflow checks must label themselves local contract checks, not GitHub
acceptance. When Docker exists, read the project-pinned Node base-image digest from `Dockerfile`,
create a uniquely named isolated Buildx builder, and build a portable Node probe with
`--network=none`. Builder bootstrap and pinned-base resolution may perform read-only registry pulls. Export the probe as a
Docker archive, load it, run it, and deterministically remove the isolated builder, image, and
temporary context. Verify absence with successful exact-name/reference Docker inventory
query; a daemon, transport, authorization, or other inventory failure is a cleanup failure. Report
`blocked` when Docker is absent. Never push, publish, or mutate GitHub, GHCR, Azure, or another
provider. The hosted PR gate invokes this executable smoke before Foundation.

**Step 5: Rerun the same focused test and preserve GREEN**

Run the Step 3 command. Expected: `PASS`, with Docker/actionlint limitations preserved as `blocked` diagnostics.

**Step 6: Sequential review gate**

Review adapter side effects, exit behavior, diagnostic schema, and wording. Stop if the bounded
daemon mutation is not fully cleaned up, it performs network activity beyond read-only pinned-base
resolution, changes repository or Git state, mutates a provider, or claims GitHub/provider acceptance.

### Task 4: Align reproduction and local evidence without overstating execution

**Files:**
- Modify: `docs/test-reproduction/SD-008.md`
- Create: `docs/test-reproduction/SD-008-ADR-0012.md`
- Create: `docs/evidence/SD-008-ADR-0012-local-rescue.md`
- Modify: `docs/evidence/SD-008.md`

**Step 1: Update the reproduction contract**

Document exact focused RED/GREEN commands, the single-canonical-artifact sequence, advisory reproducibility semantics, private-first publication, provisioning stop, and Foundation-only local scope.

**Step 2: Update the evidence record**

Record only observed local commands and results. State that Docker, actionlint, `jq`, hosted workflow admission, GHCR publication, attestations, registry verification, Azure provisioning, rollback, teardown, hosted trace, and learning remain unverified or blocked as applicable.

**Step 3: Review evidence vocabulary**

Use `IMPLEMENTED` for local file behavior, `VERIFIED` only for locally executed Foundation checks, and `BLOCKED` for unavailable or unauthorized hosted/runtime proof. Static assertions are not provider acceptance.

### Task 5: Verify Foundation, then the bounded hosted-trace Component slice

**Files:**
- Verify all files listed above.

**Step 1: Run the local adapter explicitly**

```powershell
npm run sd008:artifact-adapter -- --format json
```

Expected: local contract checks pass; Docker and actionlint checks explicitly report `blocked` when unavailable.

**Step 2: Run the Foundation level**

```powershell
npm run test:foundation
```

Expected: `PASS`. On failure, record root cause, make the smallest correction, and rerun Foundation.
After Foundation passes, run the focused hosted-trace Component test and then `npm run
test:component`. Do not advance to Integration, Workflow, or Stress.

**Step 3: Review the local diff without changing Git state**

```powershell
git diff --check
git status --short
git diff -- docs/adr/0012-sd008-phase-proportional-artifact-evidence.md docs/plans/2026-08-23-sd008-rescue-artifact-gate.md docs/work-items/SD-008.json delivery/staging-deployment-contract.json .github/workflows/sd008-azure-staging.yml scripts/check-sd008-artifact-adapter.mjs package.json tests/foundation/contracts.test.ts docs/test-reproduction/SD-008.md docs/test-reproduction/SD-008-ADR-0012.md docs/evidence/SD-008.md docs/evidence/SD-008-ADR-0012-local-rescue.md
```

**Step 4: Independent gates after this pass**

The primary coordinator must arrange sequential architecture/security review, then complete the ordered ladder. Git delivery requires fresh owner approval. GitHub workflow admission/dispatch, private GHCR publication, package visibility, attestations, registry verification, Azure identity/provisioning, traffic, rollback, teardown, trace assembly, and learning each remain separately authorized gates.

No commit step is included because this assignment expressly forbids staging and committing.

### Task 5: Sequence existing Azure authority just in time

**Public seams:** `delivery/sd008-azure-authority-contract.json`,
`scripts/render-sd008-azure-authority.mjs`, and `.github/workflows/sd008-azure-staging.yml`.

1. Render exactly one non-mutating packet for `provision`, `traffic`, or `teardown`, bound to the
   exact commit, immutable image, publication-evidence digest, owner approval reference/digest/time,
   run, principal, scope, issue time, and expiry.
   At execution, compare the approval tuple exactly with owner-controlled variables in the matching
   protected Environment. This is an independent expected-value binding, not a live GitHub approval-
   event query or cryptographic attestation.
2. Enforce strict RFC 3339 UTC, an eight-hour maximum lease, and remaining windows of 90 minutes for
   provision mutations, 45 for traffic promotion, 15 for rollback/restoration, and 60 for teardown
   deletion/closure.
3. Keep only provision authority active first. After the exact app exists, remove provision before
   traffic plus evidence-reader authority. Bind their removal time and closure-evidence digest into
   a teardown packet issued strictly afterward, then assign teardown plus post-delete verifier;
   remove teardown, revoke the ingress credential, remove the Environment secret, and remove the
   verifier last after closure evidence in the existing schema-v1 format.
4. Treat Azure assignment expiry as procedural owner evidence, not provider enforcement. Treat the
   ingress credential and Environment secret as per-session JIT material requiring revocation,
   removal, and absence evidence.
5. On partial bootstrap failure, stop new mutation and complete the contract's bounded compensating
   cleanup with current authority or a separately approved fresh teardown packet.
6. Prove RED then GREEN at the existing Foundation/Component seams. Stop after complete Foundation
   and Component; later ladder levels and every hosted or provider action remain for the primary.
7. Bind the phase packet to the protected Environment's Azure client and tenant IDs and the exact
   service-principal object ID. Immediately before every mutation, decode the current ARM token
   locally for exact `appid`, `oid`, and `tid`, confirm the Azure CLI account is a service principal,
   and reread direct/inherited assignments plus live custom-role definitions at the exact relevant
   ARM scope. Reject non-empty token group claims and supported overage signals, while recording
   that their absence does not prove absence of Entra group membership. For teardown closure,
   require verifier-only live authority and an exact packet-bound teardown-assignment ARM GET that
   returns 404 before the verifier-last closure check.
