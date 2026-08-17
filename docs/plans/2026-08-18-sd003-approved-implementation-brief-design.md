# SD-003 Approved Implementation Brief Design

## Product outcome

Let a product owner turn one already-prioritized Product Issue into one immutable, approved
implementation brief with explicit acceptance criteria. The brief remains visibly connected to
the Feedback, Signal, and Product Issue that justified the work.

## Smallest coherent design

SD-003 adds an `Implementation Briefs` bounded context and one `issue-to-brief` workflow. One
Product Issue may have at most one brief. A brief contains:

- a server-generated UUID;
- the unique source Product Issue UUID;
- an objective of 1 to 2,000 Unicode code points;
- 1 to 10 acceptance criteria, each 1 to 500 Unicode code points;
- 0 to 10 constraints, each 1 to 500 Unicode code points;
- an approver-supplied local label of 1 to 120 Unicode code points, explicitly unverified;
- a server-generated approval timestamp.

Creation uses the existing bounded UTF-8 JSON, acknowledgement, restricted-content, error,
privacy, and correlation rules. PostgreSQL locks the source Product Issue, checks that it exists,
enforces the one-to-one relationship, and rejects update or deletion of the resulting brief.

The Signal detail response adds `implementationBrief`, either `null` or the serialized brief.
The local UI displays a creation form only after a Product Issue exists. After approval it shows
the immutable brief, exact acceptance criteria, constraints, approver label, timestamp, and
source identifiers. Reload must preserve the same record.

## Architecture boundary

```text
Implementation Briefs owns brief validation and persistence ports
Product Issues owns the immutable Product Issue
issue-to-brief coordinates their public application ports
Signal detail composes the existing lineage with the brief projection
```

No domain module imports another bounded context. HTTP does not access Prisma directly.

## Alternatives rejected

- A task board was rejected because assignment and execution state are not needed to prove an
  owner-approved implementation contract.
- Editing a Product Issue was rejected because it would weaken SD-002 immutability and blur
  prioritization with implementation approval.
- Free-form markdown alone was rejected because acceptance criteria must remain independently
  visible and testable.
- Automatic plan generation was rejected because SD-003 is a deterministic owner decision, not
  a model-inference experiment.

## Failure conditions

- reject a missing Product Issue or a second brief for the same Product Issue;
- reject missing acknowledgement, unknown fields, invalid arrays, empty or oversized values,
  restricted content, malformed identifiers, and unsupported media types;
- fail closed when PostgreSQL or content controls are unavailable;
- never create a partial brief or lose source lineage;
- stop the ordered test ladder at the first failing level and rerun that level after root-cause
  correction.

## Dogfood boundary

The product ship target is one reviewable PR stacked on SD-002. The same run records which Elder
controls operated, which actions required direct Codex or human intervention, and one reproduced
Elder blocker at most. After SD-003 verification, the run may correct and replay that single
Elder blocker. It then writes the handoff and stops without SD-004, merge, deployment, Gate G,
or maturity promotion.
