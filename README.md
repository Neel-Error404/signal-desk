# SignalDesk

SignalDesk is Elder Protocol's first independent dogfood product. SD-001 implements local,
deterministic feedback intake, PostgreSQL Signal lineage, and append-only manual triage. SD-002
adds manual promotion of one accepted Signal into one immutable prioritized Product Issue. SD-003
adds one immutable owner-approved Implementation Brief with explicit acceptance criteria while
preserving the full source lineage. SD-004 adds one immutable, operator-supplied Review Delivery
and a product-owned Git delivery contract without claiming hosted-provider verification.

## Current Scope

- Capture bounded UTF-8 customer feedback.
- Require an explicit storage acknowledgement.
- Reject configured high-confidence credential and payment-card patterns before persistence.
- Commit one Feedback and one linked Signal in one PostgreSQL transaction.
- Inspect source lineage and ordered triage history.
- Append revision-safe manual triage events.
- Promote one accepted Signal into one manually prioritized Product Issue.
- Inspect the issue's Feedback, Signal, revision, priority, rationale, and local operator lineage.
- Approve one immutable implementation objective, acceptance-criteria list, and bounded
  constraints for one Product Issue.
- Inspect the brief's Feedback, Signal, Product Issue, approver label, and approval-time lineage.
- Record one immutable Review Delivery with exact branches, commit, pull request, verification
  summary, and full Feedback-to-Brief lineage.
- Declare the trusted SignalDesk repository, PR URL prefix, branch policy, ordered checks, and
  retained authority in `delivery/review-delivery-contract.json`.

SD-001 through SD-004 are local-only. They do not provide authentication, authorization, tenancy,
uploads, complete DLP, hosted-provider verification, production deployment, automatic
prioritization, or autonomous product decisions, task execution, merge, or release communication.

## Local Development

Requirements:

- Node.js 22 or later.
- Google Chrome for browser Workflow tests.

```powershell
npm ci
$env:DATABASE_URL = "postgresql://signaldesk:replace-me@127.0.0.1:5432/signaldesk?schema=public"
npm exec -- prisma migrate deploy
npm run dev
```

The application binds to `127.0.0.1`. Do not expose SD-001 to a shared or public network.

## Verification

Run one level at a time and stop on failure:

```powershell
npm run test:foundation
npm run test:component
npm run test:integration
npm run test:workflow
npm run test:stress
npm run build
```

Integration, Workflow, and Stress launch real project-scoped PostgreSQL binaries under the ignored
`.elder/runtime/` directory. Workflow uses installed Chrome at desktop and mobile viewports.

See [SD-001 evidence](docs/evidence/SD-001.md), [SD-002 evidence](docs/evidence/SD-002.md), and
[SD-003 evidence](docs/evidence/SD-003.md), plus the forthcoming SD-004 evidence and
the corresponding test-reproduction records under `docs/test-reproduction/`.
