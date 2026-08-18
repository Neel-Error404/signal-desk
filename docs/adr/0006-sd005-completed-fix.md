# ADR 0006: SD-005 Immutable Completed Fix

## Status

Accepted for bounded implementation by Neel's explicit selection of the Completed Fix outcome
for SD-005.

## Change classification and authority

- The Completed Fix domain, endpoint, Signal-detail addition, and lifecycle contract are
  `public-contract`.
- Implementation and local verification are authorized for this one slice.
- Staging, production, merge, release, credentials, learning promotion, and architecture
  exceptions remain human-only.
- Product context describes where evidence belongs; it does not create autonomous access.

## Context

SD-004 identifies the exact change delivered for review, but SignalDesk cannot represent that a
human completed the merge. The product mission requires an auditable path through completed
fixes before release communication can be safely added.

## Decision

Add one immutable Completed Fix per Review Delivery. It records the lowercase 40- or
64-character merged commit SHA, bounded completion summary, unverified local operator label,
and server timestamp. Creation requires an explicit assertion that the merge occurred outside
SignalDesk. The source Review Delivery is locked while eligibility and creation are evaluated in
one PostgreSQL transaction.

Add `delivery/completed-fix-contract.json` as product-owned lifecycle context. It identifies the
source and outcome records, required evidence, authority boundary, and next eligible product
stage. It contains no credentials and grants no execution authority.

## Failure conditions

- Reject a missing source, duplicate or concurrent creation, unknown fields, absent external
  merge confirmation, malformed commit, oversized or restricted content, and unavailable
  storage.
- Reject update or deletion at the PostgreSQL boundary.
- Never present operator confirmation as provider-verified evidence.

## Non-goals

GitHub API verification, merge execution, PR status synchronization, deployment, release,
customer communication, authentication, L2/L3 claims, and constitutional changes.

## Evidence and stop condition

Run Foundation, Component, Integration, Workflow, and Stress in order, then build, audit, and
Elder validation. Analyze the run after product verification and correct Elder only for one
reproduced generalized blocker. Stop without starting SD-006.
