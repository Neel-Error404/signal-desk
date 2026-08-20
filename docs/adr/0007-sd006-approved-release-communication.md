# ADR 0007: SD-006 Approved Unsent Release Communication

## Status

Accepted for bounded implementation by Neel's explicit instruction on August 19, 2026 to
complete SD-006 and learn from the L2 delivery lane it exercises.

## Change classification and authority

- The Release Communications domain, endpoint, Signal-detail addition, and lifecycle contract
  are `public-contract`.
- Implementation and local verification are authorized for this one slice.
- Publication, customer contact, merge, staging, production, release, credentials, learning
  promotion, and architecture exceptions remain human-only.
- Approval is product state. It is not evidence that a message was sent or a release occurred.

## Context

SD-005 records one immutable human-confirmed Completed Fix, but SignalDesk cannot yet preserve
what the owner has approved communicating about that fix. The product mission requires release
communication with exact Feedback-to-Fix lineage while external publication remains outside the
local prototype.

## Decision

Add one immutable Release Communication per Completed Fix. It records the intended audience,
subject, message, unverified local approver label, and server approval timestamp. Creation
requires explicit confirmation that the owner approved the content. The source Completed Fix is
locked while eligibility and creation are evaluated in one PostgreSQL transaction.

Add `delivery/release-communication-contract.json` as product-owned lifecycle context. Register
it after the Completed Fix contract. The connected contracts describe an exact
Review Delivery -> Completed Fix -> Release Communication chain without granting transition,
publication, deployment, or credential authority.

## Failure conditions

- Reject a missing source, duplicate or concurrent creation, unknown fields, absent approval,
  oversized or restricted content, malformed identifiers, and unavailable storage.
- Reject update or deletion at the PostgreSQL boundary.
- Never present approval as publication, delivery, release, or customer contact.
- Fail Elder lifecycle consumption closed when registered stages are disconnected or reordered.

## Non-goals

Message sending, email or chat integration, customer contact storage, publication scheduling,
delivery tracking, provider credentials, authentication, staging, production, deployment,
release execution, L2/L3 claims, and constitutional changes.

## Evidence and stop condition

Run Foundation, Component, Integration, Workflow, and Stress in order, then build, audit, and
Elder validation. Attempt the declared reviewable-PR target through Elder. Correct no more than
one generalized Elder blocker reproduced by this work item. Stop with a handoff when the product
slice and correction are verified or when an external authority boundary blocks the target.
