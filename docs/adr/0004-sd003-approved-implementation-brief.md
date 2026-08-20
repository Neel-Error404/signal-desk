# ADR 0004: SD-003 Owner-Approved Implementation Brief

## Status

Accepted for bounded implementation by Neel's explicit approval of the integrated SD-003
SignalDesk and Elder dogfood loop on August 18, 2026.

This approval does not authorize merge, release, deployment, learning promotion, L2 or L3
maturity, Gate G continuation, or another product slice.

## Change classification

- The Implementation Brief domain, HTTP endpoint, and compatibility contract are
  `public-contract`.
- The implementation remains local-only and additive to SD-001 and SD-002.
- Neel retains architecture-exception, merge, release, deployment, and learning-promotion
  authority.

## Context

SD-002 preserves the owner decision that promotes one accepted Signal into one prioritized
Product Issue. Before implementation begins, a team also needs a bounded statement of what the
change must accomplish and how acceptance will be judged. That decision must remain traceable to
the underlying customer evidence without turning SignalDesk into a general project-management
system.

## Decision

Add an `Implementation Briefs` bounded context and an `issue-to-brief` workflow. One immutable
Product Issue may create at most one immutable Implementation Brief. The source Product Issue is
locked while eligibility and creation are evaluated in one PostgreSQL transaction.

The brief records a server-generated identifier, unique Product Issue identifier, objective,
one to ten acceptance criteria, zero to ten constraints, an unverified local approver label, and
a server-generated approval timestamp. Text is normalized and bounded as declared in the SD-003
contract. The existing deterministic restricted-content policy evaluates all persisted strings.

The endpoint is:

```text
POST /api/v1/product-issues/{productIssueId}/implementation-brief
```

`GET /api/v1/signals/{signalId}` additively returns `implementationBrief`. The local UI provides
the approval form only when a Product Issue exists and no brief has been created, then renders
the immutable brief and its lineage after creation and reload.

## Failure conditions

- Reject a missing Product Issue and duplicate or concurrent brief creation.
- Reject missing acknowledgement, unknown fields, malformed arrays, empty or oversized values,
  restricted content, malformed UUIDs, and unsupported media types.
- Fail closed when PostgreSQL or content controls are unavailable.
- Reject every update or deletion of a committed Implementation Brief at the database boundary.
- Never create an unlinked or partially persisted brief.

## Non-goals

- Brief editing, deletion, versioning, task breakdown, assignment, execution status, verification
  status, release notes, or customer communication.
- Model inference, automatic acceptance criteria, autonomous work creation, or autonomous PR
  creation.
- Authentication, authorization, verified identity, tenancy, hosting, staging, production,
  deployment, merge, or release.
- Gate G continuation, L2 or L3 promotion, or Elder constitutional changes.

## Evidence and stop condition

The sole product ship target is `reviewable-pr`. Verification runs Foundation, Component,
Integration, Workflow, and Stress in order. The integrated dogfood loop may then correct and
replay at most one Elder blocker reproduced during this run. It stops at the Git authorization
boundary with a new handoff; it does not begin SD-004 or another factory gate.
