---
name: signaldesk-sd008-delivery
description: "Use when inspecting, preparing, operating, or reporting the SD-008 artifact, ephemeral Azure staging, traffic, rollback, teardown, cost, or recovery path."
---

# SignalDesk SD-008 Delivery

Operate the delivery system that SignalDesk already owns. This skill is a map for the existing
contracts and workflow, not a second deployment framework.

## Boundary

- Default to read-only inspection.
- Treat local implementation, Git delivery, workflow dispatch, package visibility, cloud
  authority, provisioning, traffic, teardown, and learning as separate authority levels.
- Do not stage, commit, push, dispatch, publish, or mutate cloud state without the exact approval
  required for that consequence.
- Do not create a second deployment workflow, evidence format, identity, environment, or provider
  abstraction unless the current one is proven unusable and a new change is separately approved.
- SD-008 is staging only. Production, SD-009, canonical L2/L3, and autonomous promotion remain out
  of scope.

## Read Current Truth

Before making a claim or preparing an operation, read these current sources in order:

1. `docs/work-items/SD-008.json`
2. `docs/adr/0012-sd008-phase-proportional-artifact-evidence.md`
3. `delivery/staging-deployment-contract.json`
4. `delivery/sd008-azure-authority-contract.json`
5. `delivery/sd008-cost-model.json`
6. `.github/workflows/sd008-azure-staging.yml`
7. the newest applicable record under `docs/evidence/`
8. live GitHub, GHCR, and Azure state for every fact that may have changed

Do not use an old approval packet, prior run, plan, local test, or transferred AgentZ document as
current provider truth.

## Four Questions For Every Step

Do not add, repair, or execute a step unless all four answers are concrete:

| Question | Required answer |
|---|---|
| What does this step prove? | One named capability or safety property. |
| What evidence will answer it? | A current command, provider result, immutable artifact, or observed behavior. |
| What decision follows pass or fail? | Advance, stop, roll back, tear down, or open one bounded correction. |
| Why is it required now? | It gates the next real consequence; otherwise defer it. |

Static assertions prove repository contracts. They do not prove GitHub admission, image runtime,
GHCR publication, Azure behavior, traffic, rollback, or teardown.

## Operate The Existing Path

Use the jobs already defined in `.github/workflows/sd008-azure-staging.yml`:

| Stage | Question answered | Blocking evidence | Stop boundary |
|---|---|---|---|
| `protected-main-source` | Is this the exact reviewed main commit? | current main, merged review, required check, clean source binding | stop on drift or missing review |
| `ordered-review-gate` | Does the accepted product ladder pass? | the existing ordered hosted check | investigate only the first failing level |
| `build-and-attest` | Is there one safe, runnable, immutable package? | canonical image execution, application-tree identity, scan, SBOM, private publication, registry digest, attestations | stop before visibility approval |
| `staging-publication` | May Azure pull this exact digest? | separately approved visibility change, anonymous digest pull, attestation verification | stop before cloud authority |
| `staging-provision` | Can the exact digest run safely at zero traffic? | fresh phase packet, exact identity and role reread, migration, liveness, readiness, authenticated smoke, zero candidate traffic | stop before traffic approval |
| `staging-traffic` | Can traffic move and return safely? | approved bounded traffic change, observation, controlled rollback, restored healthy state | stop before teardown approval |
| `staging-teardown` | Is cost-bearing state gone? | resource-group deletion, endpoint absence, zero active resources, tombstone accounting, session cost | stop until temporary authority is closed |
| `hosted-trace-inputs` | Is the run reconstructable without secrets? | exact public packets, approvals, job results, checksums, owner-completed authority closure | only then enter learning |

OCI bit identity from the independent build is advisory for SD-008. Application-tree divergence,
source drift, image execution failure, scan failure, missing SBOM or attestation, registry digest
drift, migration failure, health failure, unauthorized access, traffic mismatch, rollback failure,
or incomplete teardown remains blocking. Never report an OCI mismatch as reproducible success.

## Just-In-Time Authority

Cloud authority starts only after the exact private package exists, the `staging-publication`
decision and verification are complete, and the owner approves `staging-provision`.

For each phase:

1. Bind one packet to the exact source commit, image digest, publication-evidence digest, run,
   owner approval tuple, principal, scope, issue time, and expiry.
2. Re-read the authenticated ARM identity, exact direct and inherited assignments, and custom-role
   definitions immediately before every mutation.
3. Require the contract's remaining window: provision 90 minutes, traffic 45, rollback 15, and
   teardown 60.
4. Revoke the previous phase before granting the next. Teardown uses a fresh packet and the
   post-delete verifier is removed last.
5. If bootstrap partly fails, stop new mutations and use the contract's bounded compensation path;
   do not invent broader or automatically renewed authority.

The procedure records assignment expiry; it does not claim Azure enforces assignment expiry.

## Evidence, Cost, And Recovery

Keep these claims separate:

```text
LOCAL_TESTED
HOSTED_REVIEW_VERIFIED
ARTIFACT_PUBLISHED_PRIVATE
ARTIFACT_VISIBILITY_VERIFIED
ZERO_TRAFFIC_STAGING_VERIFIED
STAGING_TRAFFIC_VERIFIED
ROLLBACK_VERIFIED
TEARDOWN_VERIFIED
AUTHORITY_CLOSED
TRACE_COMPLETE
```

Advance only when the named evidence exists. A deployed revision is not traffic proof; traffic is
not rollback proof; rollback is not teardown proof; teardown is not authority closure.

Before provisioning, confirm the approved resource inventory, live price/quota result, USD 5
budget boundary, maximum session duration, and rollback target. After teardown, verify zero active
resources and record any non-active provider tombstone separately. Never infer zero cost from zero
traffic.

Retain only redacted, decision-relevant evidence in the existing SD-008 public packet and encrypted
owner envelope formats. Keep raw tokens, credentials, cookies, connection strings, raw manifests,
application logs, and provider identifiers out of public artifacts.

## Failure Rule

On failure, identify the first divergent boundary: repository contract, GitHub admission, runner
tool, image runtime, registry, attestation, Azure identity/RBAC, infrastructure, application health,
traffic, rollback, or teardown. Fix only the reproduced cause and rerun the same level or stage.

Do not reopen stress, reproducibility, or architecture work merely because it could be improved.
Escalate only when the observed failure blocks the next required SD-008 consequence. If the
simplified artifact path still cannot publish after the one permitted root-cause correction, stop
and apply the approved SD-008 blocked/revert decision process; never reset history.

## Done

This skill's operating flow is complete only when the exact reviewed main commit has a published
immutable package, zero-traffic staging proof, smoke evidence, bounded traffic proof, controlled
rollback, approved teardown, zero active resources, revoked temporary authority, and an actual
hosted trace. Until then, report the narrowest verified state.
