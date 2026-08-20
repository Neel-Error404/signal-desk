# SD-008 Local Implementation Gate Handoff

**Date:** August 20, 2026

**Result:** BLOCKED at separately required mutation gates; local implementation is complete

**Canonical maturity:** L1

**Delivery state:** unstaged local working tree; no remote branch, pull request, package, staging
environment, deployment, or learning packet

## Outcome

ADR 0009 is ratified and the SD-008 local implementation is ready for review. The implementation
establishes the exact container, private Azure topology, identity separation, health, migration,
evidence, traffic, rollback, teardown, and learning contracts needed for the hosted slice. The full
local ordered ladder, build, audit, Bicep compiler, workflow linter, and Elder validation pass.

No reserved mutation was inferred from the local approval. The worktree remains unstaged and the
live GitHub/Azure state remains unchanged.

## Exact current repository state

- repository: `https://github.com/Neel-Error404/signal-desk`, public;
- local branch: `work/sd-008-azure-staging-baseline`;
- local HEAD and `origin/main`: `623ff665d2a276c7541622f73e34d15ee6a7d2bf`;
- remote SD-008 branch: absent;
- active protected-delivery ruleset: `21058424`, strict required
  `signaldesk-ordered-review-gate`, no bypass;
- Git identity remains `Neel <neelabhasamadder@gamil.com>`;
- index: empty;
- GitHub Environments/deployments: zero/zero;
- GHCR SignalDesk package: absent;
- Azure staging resource group: absent.

## Required approval sequence

1. **Git delivery approval:** review the complete local diff, approve the exact commit grouping,
   then separately authorize staging, commits, push of
   `work/sd-008-azure-staging-baseline`, and opening one main-targeting pull request. Do not merge
   merely because the PR exists.
2. **Review and merge approval:** require the unchanged `signaldesk-ordered-review-gate`, review the
   public diff and secret scan, then obtain an explicit human merge decision. The deployment
   workflow is eligible only from the resulting protected `main` commit.
3. **GitHub/Entra bootstrap approval:** create four protected-main Environments with Neel as required
   reviewer; create distinct provision, traffic, and teardown Entra service principals and exact
   Environment subjects; create the assignment-required ingress application; authorize the owner
   and provision/traffic smoke principals; store only documented identifiers plus the rotated
   ingress secret.
4. **Azure bootstrap approval:** verify sponsorship, live price, Central India SKU/quota/providers,
   and USD 5 budget alert; approve the condition-bound custom roles; create the exact resource group
   with `environment=staging`, `workItem=SD-008`, `owner=Neel`, and an `expiresAt` no more than eight
   hours ahead; assign only consequence-specific scopes.
5. **Hosted build/publication approval:** dispatch the exact protected-main SHA. The workflow creates
   and attests the initially private image. The owner separately changes that exact package to
   public, then approves `staging-publication` only after confirming the intended visibility.
6. **Hosted Azure approvals:** approve `staging-provision`, inspect the saved what-if, identity, cost,
   and candidate evidence; approve `staging-traffic` only for the exact healthy revision; approve
   `staging-teardown` only after rollback and evidence acceptance. Any failed teardown remains an
   incident until zero active resources and endpoint absence are proven.
7. **Learning decision:** only after the actual hosted/teardown trace, run one quarantined candidate
   maximum, obtain independent evaluation, and request an exact human approval or rejection. Even
   approval may emit only a non-mutating promotion packet.

## Proposed Git change plan, not authorized

1. Ratified governance, work item, deployment contract, capsule intake source, and reproduction
   plan.
2. Health endpoints, release metadata, migration safety, database-role bootstrap, and tests.
3. Standalone non-root reproducible container source and normalized context tooling.
4. Private Azure Bicep modules and placeholder-only parameter contract.
5. Reusable ordered gate plus four-gate SD-008 hosted workflow.
6. Evidence, final matrix, and this stop-boundary handoff.

Each concern should be reviewed independently. This list is a future commit plan, not permission to
stage or commit.

## Learning state

No actual hosted trace exists, so the SD-008 learning lane correctly did not produce a candidate.
The prior `.env` readiness check used the wrong path. A corrected live check through the capsule's
`.elder/runtime/memory.env` is ready, candidate-only, and bound to activation
`activation-signaldesk-2e6be5f31fb2576e` with digest
`5ab5e423b234fca6ac61cfe1edb82ff5c7e2e7d13fa3982d8753dcf7a658f912`. Evidence, not tooling, is
the current learning blocker. The eventual candidate must generalize the effective-principal and
consequence-separation lesson across cloud providers; Azure remains the concrete SD-008 adapter.
Do not reuse the SD-007 candidate or its prior approval for SD-008.

## Stop boundary

- no stage, commit, push, pull request, merge, Environment, package-visibility, identity, role,
  secret, Azure, deployment, traffic, rollback, or teardown mutation;
- no production, customer data, staging retention, automatic promotion, or automatic rollback;
- no SD-009, P5.2 activation, canonical L2 claim, qualification-period credit, L3, or canary;
- no learning candidate generation from local-only evidence and no candidate application;
- SignalDesk PR #4 and the already merged PR #6 were not modified; Elder PR #6 was not modified.

Resume only from a fresh live preflight and the next exact owner approval in the sequence above.
