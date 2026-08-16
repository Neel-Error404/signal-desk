# SignalDesk

SignalDesk is Elder Protocol's first independent dogfood product. SD-001 implements a local,
deterministic feedback-intake to signal-inbox workflow with PostgreSQL lineage and append-only
manual triage.

## Current Scope

- Capture bounded UTF-8 customer feedback.
- Require an explicit storage acknowledgement.
- Reject configured high-confidence credential and payment-card patterns before persistence.
- Commit one Feedback and one linked Signal in one PostgreSQL transaction.
- Inspect source lineage and ordered triage history.
- Append revision-safe manual triage events.

SD-001 is local-only. It does not provide authentication, authorization, tenancy, uploads,
complete DLP, hosted operation, production deployment, or autonomous product decisions.

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

See [SD-001 evidence](docs/evidence/SD-001.md) and
[test reproduction](docs/test-reproduction/SD-001.md).
