# ADR 0003: SD-002 Manual Signal-to-Prioritized-Issue Slice

## Status

Accepted for bounded implementation by Neel's explicit approval of the proposed SD-002
product outcome on August 17, 2026.

This approval does not authorize staging, production, merge, release, deployment, learning
promotion, L2 or L3 maturity, or an Elder constitutional change.

## Change classification

- The new Product Issue domain, HTTP endpoint, and compatibility contract are `public-contract`.
- The implementation remains local-only and additive to the ratified SD-001 contract.
- Neel retains architecture-exception, merge, release, deployment, and learning-promotion
  authority.

## Context

SD-001 lets a local operator capture customer feedback, inspect its canonical Signal, and append
manual triage history. SignalDesk's next product outcome is to let the operator turn an accepted
Signal into a prioritized Product Issue without losing the Feedback and Signal evidence that led
to the decision.

The smallest coherent slice is manual, deterministic, and one-to-one. It does not group repeated
feedback, infer priority, create implementation tasks, or add an issue lifecycle.

## Decision

### Bounded context and ownership

Add a `Product Issues` bounded context with domain, application, infrastructure, and HTTP layers.
It owns the immutable ProductIssue record and the validation required to create it.

`Signal Inbox` continues to own Signal, Feedback lineage, and triage history. A separate
`signal-to-issue` workflow coordinates public application ports from Signal Inbox and Product
Issues. Neither bounded-context domain may import the other bounded context.

Dependency direction remains:

```text
http -> application -> domain
infrastructure -> application and domain ports
signal-to-issue workflow -> public application ports only
platform -> no product domain module
```

### Product Issue and lineage

One accepted Signal may produce at most one Product Issue. The issue records:

- server-generated immutable identifier;
- immutable source Signal identifier;
- exact source Signal revision at promotion;
- manually entered title;
- manual priority: `low`, `medium`, `high`, or `critical`;
- explicit rationale;
- operator-supplied local label, which is not authenticated identity;
- server-generated creation timestamp.

The database enforces unique `signalId`. The source Signal row is locked while eligibility and
creation are evaluated. Promotion requires that the Signal is currently `accepted` and that its
current revision equals `expectedSignalRevision`.

The Product Issue record is append-only for SD-002. No update or delete endpoint exists, and the
database rejects update or delete operations.

### Content and HTTP boundary

The endpoint is:

```text
POST /api/v1/signals/{signalId}/product-issue
```

The request uses the existing exact UTF-8 JSON media type, 16 KiB streaming body limit, closed
object validation, explicit content acknowledgement, and deterministic restricted-content checks.
Errors never echo submitted content.

`GET /api/v1/signals/{signalId}` adds an optional `productIssue` value. Existing response fields
and SD-001 endpoint behavior remain unchanged.

### User interface

An accepted Signal without an issue displays a manual promotion form. After creation, the Signal
detail displays the immutable issue, priority, rationale, operator label, source Signal revision,
and Feedback lineage. Reload must preserve the result.

## Failure conditions

- Reject promotion when the Signal is missing, not accepted, or changed from the expected
  revision.
- Reject a second issue for the same Signal.
- Reject missing acknowledgement, unknown properties, invalid priority, empty or oversized text,
  restricted content, malformed identifiers, and unsupported media types.
- Fail closed when PostgreSQL or content controls are unavailable.
- Never create a partial or unlinked issue.

## Non-goals

- Automatic prioritization, model inference, grouping, deduplication, or synthesis.
- Product Issue editing, deletion, status workflow, assignment, implementation tracking, or
  release communication.
- Authentication, authorization, verified identity, tenancy, hosting, deployment, or production.
- Elder maturity promotion, autonomous pull-request authority, merge, or release.

## Evidence and ship target

The sole ship target is `reviewable-pr`.

Verification must run in Foundation, Component, Integration, Workflow, and Stress order. The
session stops when the slice is verified at the Git authorization boundary or when a reproduced
product or Elder blocker is verified. No subsequent product slice or hosted gate begins in this
session.
