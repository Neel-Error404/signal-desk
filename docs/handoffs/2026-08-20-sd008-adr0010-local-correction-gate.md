# SD-008 ADR 0010 Local Correction Gate Handoff

**Result:** ADR 0010 bounded local implementation VERIFIED; hosted execution and learning BLOCKED

**Canonical maturity:** unchanged; no L2 or L3 claim

**Delivery state:** unstaged working tree; no mutation performed in this slice

## Resume point

The local correction is ready for owner review. It adds the dedicated secretless smoke identity,
effective cloud-authority packet, exact baseline revision pinning, post-delete verification role,
privacy-preserving evidence exporter, conservative cost packet, public hosted trace inputs, and a
fail-closed 13-event learning trace assembler.

The attended teardown now remains reachable when provision fails after creating the resource group
but before exporting its session-start output: it recovers the timestamp from the resource-group
tag and, when no group exists, from the GitHub run. This closes the last locally discovered
cost-retention path without weakening timestamp or cost validation.

The older SD-008 local handoff predates ADR 0010 and its identity/authority corrections. Use this
handoff and `docs/evidence/SD-008-ADR-0010-local-correction.md` for the next gate.

## Current truth

- local branch `work/sd-008-azure-staging-baseline`: `49e78225fceb26c497fd4058d02ea935bf90eb30`;
- merged `origin/main`: `a74b430094855987ce14e2ebb294d9e345ee7d07` from PR #7;
- local corrections are unstaged; index is empty;
- protected ruleset `21058424` remains active, strict, zero-bypass, and requires
  `signaldesk-ordered-review-gate`;
- GitHub Environments and deployments: zero;
- GHCR package lookup: HTTP 404;
- Azure resource group `rg-signaldesk-stg-cin`: absent;
- no SD-008 Entra applications, custom Azure roles, assignments, or budget exist;
- refreshed Central India capability and quota checks pass; the conservative eight-hour upper
  estimate is USD 0.89;
- actual hosted trace and SD-008 learning candidate: absent.

## Next separately approved gates

1. Review this complete local diff, create `work/sd-008-adr0010-corrections` from exact protected
   `origin/main` `a74b430094855987ce14e2ebb294d9e345ee7d07`, and separately authorize the
   exact staging/commit/push/PR sequence. HEAD and `origin/main` have identical source trees, so no
   merge or rebase is required. No Git action is authorized by this handoff.
2. After protected review and merge, separately approve GitHub Environment configuration, owner
   evidence public-key variables, package visibility, and the dedicated Entra applications and
   environment-bound federated credentials.
3. Render and inspect the non-mutating Azure authority packet. Separately authorize role definitions,
   assignments, budget, and exact tagged resource-group creation only after the live cost/quota/region
   preflight is refreshed.
4. Dispatch only the exact protected-main SHA. Approve publication, provision, traffic, and teardown
   independently. Keep the first run attended through teardown.
5. After resource and endpoint absence are verified, the owner removes the temporary post-delete
   verifier assignment and supplies the public absence proof. Only then assemble and validate the
   actual 13-event hosted trace.
6. Only after the trace validator passes, run the Elder P4.6 learning lane: at most one immutable
   quarantined candidate, two counterfactual cases, two shadow cases, independent evaluation, and
   Neel's exact digest-bound approval or rejection. Approval may issue only a non-mutating promotion
   packet; application requires a future work item and authorization.

## Stop boundary

Do not stage, commit, push, open or merge a pull request, create GitHub Environments, change GHCR,
create or mutate Entra identities, define or assign Azure roles, create or mutate Azure resources,
dispatch the hosted workflow, infer a learning decision, apply a promotion packet, claim canonical
L2/L3, start SD-009, or enter production without the corresponding separate approval.
