# SD-008 ADR 0012 Local Rescue Evidence

**Status:** IMPLEMENTED locally; Foundation, Component, Integration, and Workflow VERIFIED; Stress
FAILED; hosted/provider proof BLOCKED

**Date:** August 23, 2026

**Authority:** `APPROVE SD-008 RESCUE PLAN AND ADR-0012 DIRECTION FOR LOCAL IMPLEMENTATION ONLY`

**Hard-stop/revert boundary:** `623ff665d2a276c7541622f73e34d15ee6a7d2bf`

## Bounded claim

ADR 0012, the machine-readable SD-008 records, the staging workflow artifact path, local adapter,
tests, plan, and reproduction documents implement the approved local rescue direction. The local
files now describe one canonical deployable image built once and reused through execution,
real default-command startup and HTTP liveness, application-tree hashing, secret/forbidden-file
scanning, vulnerability rejection, SBOM, private
publication without rebuilding, registry identity verification, attestations, and downstream
digest-only use. One independent build remains for blocking application-tree equality and explicit
advisory OCI config, manifest/layer, and final-digest diagnostics.

The adapter performs a temporary local Docker daemon mutation with verified cleanup when Docker is
present. It uses a uniquely named isolated builder and the project-pinned Node base. Docker build
steps use `--network=none`, but builder bootstrap and pinned-base resolution may perform read-only
registry pulls. It
performs no repository, Git, registry-write, or provider mutation. The early
diagnostic artifact is sanitized and minimal; raw OCI config environment/history, manifest bodies,
and application logs remain runner-local and are never uploaded.

This record does not claim that GitHub accepted the workflow, Docker built or ran an image, GHCR
created or retained a private package, a visibility change occurred, anonymous pull succeeded,
attestations were issued or verified, Azure authority was granted, staging ran, rollback or teardown
occurred, a hosted trace exists, or learning completed.

## Supplied incident context

The owner supplied these prior hosted observations; they were not reread from GitHub in this local
pass:

- run `32557411759`: permission admission failure;
- run `32561479012`: OCI archive passed to `docker load`;
- run `32580353832`: cancelled;
- runs `32581288784` and `32584573360`: OCI/config mismatches;
- PR 13 diagnostics: never dispatched.

The supplied live `main` baseline is `5cb103abf21923127fa5c65cea37fa41d68cda64`. The local checkout
is `42302a8b0aa6cb3483f80e544d0ae07fc37cf314`, reported to have the same tree. This pass did not
switch branches or otherwise change Git state.

## TDD evidence

| Slice | RED observation | GREEN observation |
|---|---|---|
| ADR/work-item/deployment contract | Focused Vitest failed with `ENOENT` for ADR 0012 | Exact focused test passed after the minimum governed records were added |
| Canonical workflow artifact path | Focused Vitest failed because `Build canonical image once and emit OCI diagnostics` was absent | Exact focused test passed after the third publication build was removed and canonical/advisory paths were separated |
| Local adapter | Focused Vitest failed with `MODULE_NOT_FOUND` for the adapter | The first implementation exposed a JavaScript delimiter syntax error; after that root-cause correction, the exact focused test passed |
| Spec-review corrections | Focused Vitest failed on the incomplete cloud-authority string and the `node --version` shortcut | Focused tests passed after real startup/liveness, always-retained sanitized diagnostics, executable Docker archive load/run, PR-gate invocation, and explicit three-gate authority ordering were implemented |
| Second spec-review corrections | Focused Vitest failed while raw OCI files/logs were uploaded and cleanup status was ignored | Focused tests passed after the early artifact was reduced to sanitized digests/comparisons, all raw OCI/log upload paths were rejected, and hosted plus adapter Docker cleanup became checked and actionable |
| Third spec-review corrections | Focused Vitest failed because tree divergence exited before diagnostics and cleanup absence trusted generic inspect failure | Focused tests passed after both tree hashes and blocking mismatch state were written before exit, missing diagnostics became an upload error, and exact inventory queries became mandatory for absence proof |
| Code-quality corrections | The new build-proof fixture reproduced `Build proof is incomplete`; focused Foundation tests also exposed permissive permission parsing and the host-native probe/builder lifecycle | The assembler now validates the current proof and rejects legacy or inconsistent shapes; behavioral permission, isolated-builder, portable pinned-base probe, and checked-cleanup contracts pass |

Exact commands are recorded in `docs/test-reproduction/SD-008-ADR-0012.md`.

## Local adapter result

`npm run sd008:artifact-adapter -- --format json` returned
`pass-with-blocked-capabilities`:

- PASS, local static contract: reusable-workflow permission compatibility;
- PASS, local static contract: eight known acyclic jobs and publication-before-provision ordering;
- PASS, local static contract: OCI diagnostics are separated from Docker execution outputs;
- PASS, local static contract: required sanitized digest fields, retention, and claim suppression are present;
- BLOCKED: Docker is unavailable, so Docker export/load/run was not executed locally;
- BLOCKED: actionlint is unavailable, so GitHub workflow schema/admission was not executed locally;
- BLOCKED: `jq` is unavailable, so hosted `jq` expressions were not executed locally.

These local static passes are not provider acceptance.

## Foundation result

The first bounded `npm run test:foundation` invocation exceeded its 120-second outer command limit
while ESLint was still running and left its exact child process tree alive. That process tree was
identified from the `npm run test:foundation` command line and terminated; unrelated Node processes
were not touched. This timeout was not treated as a test verdict.

The next Foundation run failed at ESLint because the new adapter retained one unused local variable.
Removing that variable corrected the root cause. The same complete Foundation level was rerun and
passed in 60.3 seconds. After final self-review tightened the build-job wording and registry digest
lookup, the complete Foundation level passed again in 43.4 seconds.

The spec-review correction pass then made the four findings fail focused tests before implementation
and pass the same focused tests afterward. Its first full Foundation run reached the contract suite
and exposed two stale pre-rescue assertions: one still required the removed `node --version`
shortcut, and another hard-coded the old count of uploaded artifacts. The assertions were corrected
to require real default-command HTTP liveness and the named always-retained diagnostics artifact.
The exact focused rerun passed 2 tests with 55 skipped. The complete Foundation level was then rerun
from the beginning and passed in 52.1 seconds:

- exact direct-dependency lockfile check: PASS;
- Prisma client generation: PASS;
- TypeScript typecheck: PASS;
- ESLint with zero warnings: PASS;
- Prisma schema validation: PASS;
- six-migration safety check: PASS;
- Foundation contracts: PASS, 57 tests;
- source layout and dependency boundaries: PASS, 112 modules and 331 dependencies with no
  violations.

The Vitest run emitted its existing advisory warning about future Vite native config-loader ESM
behavior. It did not fail the suite.

After the second spec review, the exact focused correction run passed 2 tests with 55 skipped. The
first full Foundation attempt then found one older assertion that still required Docker auto-removal,
which conflicted with explicit verified cleanup. After correcting that assertion, the same focused
pair passed and the complete Foundation level passed again in 15.1 seconds with all 57 contracts and
all other checks above green.

The third spec review focused on tree-mismatch evidence ordering and absence verification. The
focused pair failed against the earlier diff-before-diagnostics and generic inspect-status behavior,
then passed 2 tests with 55 skipped after the corrections. The complete Foundation level passed in
18.2 seconds with all 57 contracts and all other checks above green.

The code-quality pass first reproduced `Build proof is incomplete` in the focused hosted-trace
Component test with the current build-proof shape. Focused Foundation tests then failed on a
behavioral `packages: write` caller fixture and the absent isolated-builder/pinned-base contracts.
After correction:

- Foundation passed in 14.9 seconds with all 58 contracts and no boundary violations;
- the focused hosted-trace Component test passed with 1 test run and 7 skipped;
- the complete Component level passed in 5.8 seconds with 13 files and 58 tests;
- the adapter returned `pass-with-blocked-capabilities`, with actionable `ENOENT` details for the
  locally unavailable Docker, actionlint, and `jq` executables.

## Preserved gates

- The workflow may create only an initially private package in the artifact job and verifies that
  state before and after push.
- It stops at `staging-publication`; any public visibility change requires separate owner approval.
- Anonymous digest pull occurs only after that approval.
- `staging-provision` remains a second protected gate, and cloud authority begins only after its
  owner approval.
- Protected source, ordered tests, action/base pins, application-tree equality, canonical execution,
  real default-command liveness, checked cleanup, scans, SBOM, immediately retained sanitized OCI
  digest diagnostics, provenance,
  registry digest, attestations, separated identities, zero-traffic staging,
  traffic approval, rollback, teardown, trace, and learning requirements remain intact.
- The current Azure runtime requires public GHCR. Private registry pull identity is not invented in
  this rescue and remains outside scope.

## Rescue Step 5 JIT authority evidence

The existing authority contract and renderer now implement one non-mutating packet for exactly one
requested phase. Packets bind source commit, immutable image digest, publication-evidence digest,
owner approval reference/digest/time, run, phase, exact principal/scopes, issuance, and expiry. The
validator rejects non-strict UTC, more than eight hours, insufficient phase/mutation windows, packet
digest drift, and current execution binding drift. It makes no Azure mutation.

The workflow consumes a phase packet and its SHA-256 from each existing protected Environment. It
revalidates immediately before provision deployment, each job start, the candidate app update,
traffic promotion, failure rollback, planned restoration, teardown deletion, and closure reads.
Live rereads reject overlapping SD-008 phase roles. Teardown depends on a new teardown-phase packet;
it cannot reuse a provision packet or clock. The workflow contains no command that creates/deletes
its authority assignments, changes GitHub secrets, creates federated credentials, or claims Azure
enforces assignment expiry.

The authority contract records Azure RBAC expiry as procedural evidence, not provider enforcement.
It also requires per-session cleanup of the ingress credential and `staging-provision` Environment
secret, verifier-last removal, and bounded compensating cleanup after partial bootstrap failure.
The closure template now requires those owner-verified states; local code does not claim they have
occurred.

TDD and ordered checks observed in this Step 5 pass:

- focused Component RED: 2 tests failed because the former CLI required all three principals and
  emitted all five roles before any phase/window validation;
- focused Component GREEN: 2 passed, 7 skipped;
- focused Foundation RED: 1 failed, 58 skipped because the JIT ADR/workflow contract was absent;
- focused Foundation GREEN: 1 passed, 58 skipped, followed by 2 passed, 57 skipped after closure
  assertions were added;
- first complete Foundation attempt stopped at TypeScript because the new test's generic phase map
  made required keys possibly undefined;
- same-level Foundation rerun after tightening the test type: PASS; lockfile, Prisma generation,
  typecheck, zero-warning ESLint, Prisma validation, six-migration safety, 59 Foundation contracts,
  source layout, and 112-module/331-dependency boundary analysis all passed;
- complete Component: PASS; 13 files and 59 tests;
- `node --check` for the renderer, parsing of all changed JSON contracts, and `git diff --check`:
  PASS.

The existing Vite future config-loader warning remained advisory. Local `actionlint`, GitHub
admission, protected-Environment value delivery, Azure CLI execution, assignment enforcement,
credential revocation, teardown, and closure remain unverified in this pass.

The review-correction pass then closed four fail-closed gaps without changing evidence schema:

- rollback validation is explicitly guarded inside the `set +e` failure trap and returns before
  any Azure traffic mutation when authority validation fails;
- packet use compares owner approval reference, digest, and time with independent owner-controlled
  protected-Environment values; this is not a live GitHub review-event query or cryptographic proof;
- a teardown packet binds the prior traffic-authority removal time and closure digest and must be
  issued strictly after that removal; and
- schema-v1 authority closure now requires teardown-role absence, ingress-credential revocation,
  `staging-provision:ENTRA_CLIENT_SECRET` removal, and post-delete-verifier removal last.

Focused RED reproduced all four gaps. Focused GREEN also proved threshold behavior for every
declared mutation: exact remaining-time boundaries pass and one millisecond less fails. The first
full Foundation rerun exposed an unnecessary renamed final step; the second exposed a stale
two-element closure-order assertion. Both were corrected at the same level. Final results:

A final self-review made cleanup timestamps strictly ordered after absence verification and added
negative approval-reference, digest, and time cases. Its first Foundation rerun stopped at
TypeScript because the new table was inferred as containing possibly undefined tuple members. An
explicit three-string tuple type corrected that test-only root cause; the same full level then
passed before Component was rerun.

- Foundation: PASS, 60 contracts plus lockfile, Prisma, TypeScript, zero-warning lint, migration
  safety, source layout, and dependency boundaries;
- Component: PASS, 13 files and 60 tests;
- renderer and hosted-trace assembler syntax, changed JSON parsing, and `git diff --check`: PASS.

The reusable bootstrap plan now leaves only reusable applications, federated credentials,
custom-role definitions, and protected Environment shells. Exact phase assignments, ingress
credential, Environment secret, and fresh teardown authority are session-specific. No hosted or
provider action was performed.

## Authority continuity review correction

The renderer and workflow now bind each phase packet to the protected Environment's Azure client
and tenant IDs and exact service-principal object ID. Immediately before every declared mutation,
the workflow decodes the current ARM token locally, confirms the Azure CLI account type, and uses
read-only ARM queries to refresh direct/inherited assignments and live custom-role definitions at
the exact mutation-relevant scope. The renderer accepts only the packet's exact assignment IDs and
fields plus role Actions, NotActions, DataActions, NotDataActions, and AssignableScopes.

The local token decoder rejects missing or malformed `appid`, `oid`, or `tid`, non-application
identity type, a non-empty `groups` claim, and supported group-overage signals. It emits only the
sanitized identity tuple; the token remains in shell memory/stdin and is not printed or persisted.
No Microsoft Graph permission or directory call is required. Absence of group and overage signals
in an ARM token does not prove absence of Microsoft Entra group membership. The check is immediate
but cannot make Azure reads and the later mutation atomic.

After resource-group deletion, `teardown-closure` expects only the subscription-scoped verifier
assignment and requires an exact ARM GET of the packet-bound teardown assignment ID to return 404.
The verifier is retained until that proof succeeds, preserving verifier-last closure ordering.

Rollback now explicitly guards both the traffic-set mutation and the baseline-weight reread even
under `set +e`, and sets `traffic_restored=true` only after the reread proves 100 percent baseline
weight. UUIDs are canonicalized before deterministic derivation, and resource-group versus
Container App names use separate Azure-compatible validators.

Focused RED produced 2 Foundation failures and 3 Component failures against the prior behavior.
Focused GREEN passed 2 Foundation tests and 5 Component tests. The first full Foundation attempt
then stopped at TypeScript because the new structural test used assertion-only narrowing for an
optional regex match; replacing it with an explicit throw corrected that test root cause. The same
full Foundation level passed with 60 contracts and all prerequisite/boundary checks. Full Component
then passed 13 files and 62 tests. No hosted Azure or Microsoft Graph call was made.

### Verifier operability and post-delete mutation correction

The bounded re-review removed all subscription-wide `az role assignment list --all` checks and all
Microsoft Graph calls from the workflow. Every assignment and custom-role read now targets the
exact relevant resource-group, Container App, or subscription scope with inherited assignments
included. `teardown-closure` is mutation-specific: its live snapshot must contain only the
post-delete verifier, while a separate exact ARM lookup must return 404 for the deterministic
teardown assignment ID. The verifier remains active until that check succeeds.

Focused RED was one Foundation failure for the absent scoped refresh seam and two Component
failures for the absent ARM-token decoder and deterministic assignment-ID closure proof. Focused
GREEN passed the one Foundation and two Component tests. The first full Foundation rerun reached
59/60 because an older smoke-identity test prohibited every Azure CLI token read; narrowing it to
permit only the three ARM-resource reads fixed that test without allowing an application-audience
smoke token. The first full Component rerun reached 63/64 because an adversarial extra-assignment
fixture lacked the newly required assignment ID; adding a valid extra ID restored the intended
exact-set mismatch assertion. After the final exact-scope sweep, Foundation passed 60/60 with all
prerequisite and boundary checks, and Component passed 64/64 across 13 files. These are local tests;
no Azure, Microsoft Graph, GitHub provider, or Git mutation was performed.

### Final mutation-scope and bearer-transport correction

Provision authority refresh now fails closed on unknown mutation names and selects the exact live
ARM scope for each real mutation: resource group for deployment, the database-role bootstrap job
for its start, the migration job for its start, and the Container App for update. Each child query
retains `--include-inherited`, so the expected resource-group assignment remains visible while an
unexpected child-scope assignment is rejected. There is no Azure smoke-job mutation; the existing
HTTP smoke uses its separately federated identity and does not enter this scope switch.

Neither the teardown assignment lookup nor any of the four application smoke requests places a
bearer token in curl arguments. Bash `printf` supplies each authorization header as raw curl
header input on standard input; these requests create no token file or log.

Focused RED was one Foundation failure plus three Component failures. Focused GREEN passed one
Foundation and three Component tests. Final ordered local reruns passed Foundation 60/60 with all
prerequisite and boundary checks, followed by Component 68/68 across 13 files. No hosted or provider
operation and no Git mutation was performed.

### Hosted review-gate actionlint probe correction

PR 14 runs `32618788939` at `3ff22131f854699b9bee03942722fafb40aa06b0` and `32620690030` at
`0eb69964ff73df52367e77b7b486a9a54af22210` both stopped in `Install exact actionlint`, before
the adapter or product tests. The second run had already removed the `head` pipeline, so the prior
broken-pipe diagnosis is retracted.

A direct isolated reproduction with Go 1.26.7 installed
`github.com/rhysd/actionlint/cmd/actionlint@v1.7.12` from source. The resulting executable reported
`v1.7.12`; the workflow's exact comparison against unprefixed `1.7.12` returned false.

- **Immediate cause:** `v1.7.12` did not exactly equal the required `1.7.12`.
- **Enabling cause:** runner-side `go install` used a source-built distribution with different
  version identity from the official release binary and no verified release-archive boundary. The
  prior regression modeled an unobserved multiline producer instead of this real identity.
- **Non-causes:** no broken pipe caused the failure; actionlint did not report a workflow finding;
  and neither the adapter nor product tests ran.

The local correction downloads the official actionlint 1.7.12 Linux amd64 release archive from its
exact GitHub release URL, verifies SHA-256
`8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8` before extraction or
execution, then requires the first version line to be exactly `1.7.12`. Download, checksum,
extraction, execution, and version failures are explicit and actionable. The focused Foundation
contract rejects `go install` and verifies the URL, checksum, verification order, exact comparison,
diagnostic, and ordering before both the adapter and Foundation.

Primary integration's live GitHub API query confirmed that the official asset is
`actionlint_1.7.12_linux_amd64.tar.gz` at
`https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz`;
the earlier `linux_x86_64` URL was invalid. The corrected curl command is bounded to three retries,
uses `--proto '=https'` for the initial request and `--proto-redir '=https'` for every redirect, and
requires TLS 1.2 or newer.
The follow-up focused RED failed 1 test with 60 skipped on the invalid asset name before reaching
the missing transport assertions. The same focused test passed with 60 skipped after both the asset
identity and curl constraints were corrected.
A subsequent focused RED failed 1 test with 60 skipped because `--proto-redir '=https'` was absent;
the same test passed with 60 skipped after the redirect constraint was added.

Focused RED failed 1 test with 60 skipped because the official release URL and checksum were absent
and `go install` remained. Focused GREEN passed 1 test with 60 skipped after the minimum workflow
change. The complete Foundation level passed all 61 contracts plus lockfile, Prisma generation and
validation, TypeScript, ESLint, migration-safety, source-layout, and dependency-boundary checks.
The cached source-built actionlint reported `v1.7.12`, `installed by building from source`, and Go
1.26.7, and accepted both workflow files. Git Bash accepted all 25 explicit Bash workflow steps.

The local checks did not execute the official Linux release archive. No Git or provider mutation
occurred, neither failed hosted run was rerun, and hosted success remains unverified.

## Primary coordinator ordered verification

After the implementation and review corrections, the primary coordinator ran the local ladder in
order:

- **Foundation — PASS:** 61/61 contracts, with prerequisite lockfile, Prisma generation and
  validation, TypeScript, ESLint, migration-safety, source-layout, and dependency-boundary checks
  passing.
- **Component — PASS:** 68/68 tests.
- **Integration — PASS:** 25/25 tests and all six migrations.
- **Workflow — PASS:** 2/2 desktop and mobile workflows.
- **Stress — FAIL:** the level did not pass, so the ladder stopped there.

The Stress observations were:

1. The first Node 24.14 attempt ended with a top-level `undefined` failure.
2. A traced Node 24 attempt timed out; its exact test process tree was identified and terminated.
3. A clean Node 24 rerun reached all concurrency and outage checks. After the embedded database was
   restarted, the readiness list GET returned HTTP 200, but the immediately following full detail
   GET returned HTTP 503 `storage_unavailable` at `scripts/run-stress.mjs:362`.
4. An isolated Node 22.14 rerun also ended with a top-level `undefined` failure.

The strongest current cause is a pre-existing flaky Windows embedded-postgres/Prisma connection-
pool recovery race, not the four-file actionlint installer diff. Existing code forcibly stops and
restarts PostgreSQL with Windows `taskkill`; readiness polls only the one-query list endpoint, while
the detail endpoint starts two concurrent Prisma reads and then performs lineage reads. The stores
normalize raw database failures to HTTP 503 `storage_unavailable`. The exact failing Prisma
operation remains unknown, so this classification is evidence-based but not a completed operation-
level root-cause proof.

The ladder did not advance to Build, dependency audit, Bicep validation, the post-ladder actionlint
recheck, or Elder validation because the test policy stops at the failed Stress level. No harness or
source correction was made: that would exceed the approved actionlint hard-stop exception and
requires separate approval.

## Owner closure decision and next gate

On August 23, 2026, the owner directed the rescue to stop investigating the local Stress harness
and proceed from the already passing basic product evidence. The local Stress result remains
explicitly failed and deferred; it is not relabeled as a pass. This decision is limited to delivery
of the actionlint installer correction and does not remove, bypass, or weaken the hosted Stress step
in the required pull-request check. The exact hosted runner remains the next authoritative boundary.

If hosted Stress fails, that hosted failure becomes the evidence for a separately scoped root-cause
decision. Until then, no change is authorized to the stress harness, embedded PostgreSQL restart
behavior, Prisma pool recovery, or product data access. Hosted success remains unverified. Git
staging, commit, push, the resulting pull-request run, merge, GHCR mutation, package visibility,
identity setup, Azure provisioning, traffic, rollback, teardown, trace assembly, and learning
remain separately authorized.
