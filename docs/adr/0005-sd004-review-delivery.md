# ADR 0005: SD-004 Immutable Review Delivery

## Status

Accepted for bounded implementation by Neel's explicit instruction to proceed with SD-004 and
make Git delivery a product-owned contract that Elder can eventually handle.

## Change classification and authority

- The Review Delivery domain, HTTP endpoint, Signal-detail addition, and delivery contract are
  `public-contract`.
- Neel authorized implementation plus commit, push, and reviewable PR delivery for this slice.
- Merge, staging, production, release, credentials, learning promotion, and architecture
  exceptions remain human-only.
- Elder may consume and validate the product contract, but it may not create a hosted PR unless
  its existing P5.2 authority chain is independently satisfied.

## Context

SD-003 records what should be implemented and how it will be accepted. SignalDesk still cannot
show which exact change was delivered for review. Separately, Elder's factory previously selected
its embedded contract instead of the invoking product repository. That subject-binding defect is
corrected in Elder PR #4, but SignalDesk still owns no explicit Git delivery policy for Elder to
consume.

## Decision

Add one immutable Review Delivery per Implementation Brief. The record contains the exact
SignalDesk repository, base and head branches, commit SHA, pull-request number and URL,
verification summary, unverified local submitter label, and server timestamp. The source brief is
locked while eligibility and creation are evaluated in one PostgreSQL transaction.

Add `delivery/review-delivery-contract.json` as product-owned machine-readable policy. It declares
the repository and trusted PR URL prefix, branch patterns, ordered checks, reviewable-PR target,
and retained authority. Credentials are never stored in the contract.

The endpoint is:

```text
POST /api/v1/implementation-briefs/{implementationBriefId}/review-delivery
```

`GET /api/v1/signals/{signalId}` additively returns `reviewDelivery`. The local UI creates the
record only after a brief exists and clearly labels the hosted reference as operator-supplied and
not independently verified.

## Failure conditions

- Reject a missing brief, duplicate or concurrent creation, unknown fields, missing
  acknowledgement, malformed branch, equal base/head branches, malformed commit, untrusted PR
  URL, inconsistent PR number, oversized text, restricted content, and unavailable storage.
- Reject update or deletion at the PostgreSQL boundary.
- Fail Elder contract consumption closed when the contract is absent, malformed, targets another
  repository, or requests authority beyond current policy.

## Non-goals

GitHub API verification, authenticated product identity, editing, deletion, multiple deliveries,
PR creation from the product, merge, deployment, release, customer communication, L2/L3 claims,
and constitutional changes.

## Evidence and stop condition

Run Foundation, Component, Integration, Workflow, and Stress in order, then build, audit, and
Elder validation. Attempt delivery through Elder's real capability; if authority is blocked,
record the blocker and use only the owner's explicitly authorized direct delivery path. Complete
the bounded Elder learning/correction loop and stop without starting SD-005.
