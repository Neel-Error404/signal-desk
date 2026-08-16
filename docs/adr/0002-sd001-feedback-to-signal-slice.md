# ADR 0002: SD-001 Local Feedback-to-Signal Slice

## Status

Accepted.

Neel, the accountable human, product, architecture, security, release, and code owner, explicitly
ratified this decision on August 16, 2026. This record does not delegate Neel's retained authority
to an agent.

## Change classification

- This accepted architecture decision is constitutional design intent.
- Implementation of its HTTP, domain, persistence, and dependency contracts is classified as
  `public-contract`.
- Architecture exceptions, merge, release, deployment, and learning promotion remain human-only
  decisions owned by Neel.

## Context

SignalDesk needs its first traceable product slice: a person submits one bounded item of customer
feedback and can see the one canonical signal created from it. A person may then triage the signal
without erasing the prior decision history.

The repository is a prototype with moderate risk and confidential data. SD-001 must prove a small,
local workflow without implying that authentication, hosted operation, complete data-loss
prevention, autonomous operation, or production readiness exists.

## Decision

### Runtime and topology

SD-001 will be a TypeScript and Next.js modular monolith. Prisma is the only application database
adapter and PostgreSQL is the system of record. The slice runs locally. It has no file or object
storage and accepts no uploads.

The planned source topology is:

```text
src/
  modules/
    feedback-intake/
      domain/
      application/
      infrastructure/
      http/
    signal-inbox/
      domain/
      application/
      infrastructure/
      http/
  workflows/
    feedback-to-signal/
  platform/
    database/
```

`Feedback Intake` owns feedback acceptance, acknowledgement, restricted-content rejection, and the
Feedback record. `Signal Inbox` owns Signal, its one-to-one source lineage, append-only TriageEvent
history, and inbox projections. The `feedback-to-signal` application workflow coordinates their
public application ports and the shared database transaction; neither bounded-context domain may
import the other bounded context.

### Dependency direction

Within each bounded context, dependencies point inward:

```text
http -> application -> domain
infrastructure -> application and domain ports
workflow -> public application ports of both bounded contexts
platform -> no product domain module
```

Forbidden dependencies include domain-to-HTTP, domain-to-infrastructure, direct HTTP-to-Prisma,
cross-context domain imports, and imports from either bounded context into `platform`. Production
imports from test code are also forbidden.

These TypeScript rules will be encoded in `dependency-cruiser` before implementation is accepted.
The dependency check is a Foundation fitness function and must fail closed for undeclared source
modules. SD-001A only records that requirement; it does not install or configure the tool and does
not claim the boundary is operational.

### Deterministic lineage

Accepted feedback creates exactly one Feedback and exactly one Signal in a single PostgreSQL
transaction. Signal carries a required `feedbackId`, and the database enforces uniqueness of that
foreign key. The transaction commits both records or neither record. No model inference,
classification, grouping, deduplication, or many-to-one merge participates in signal creation.

The initial Signal statement is a deterministic representation of the accepted feedback content.
Derived inbox state always retains the originating Feedback identifier. SD-001 does not group
repeated feedback; that is a later governed decision that may not weaken original-source lineage.

### Append-only manual triage

Triage is a human-requested append operation. It creates a TriageEvent containing the signal,
sequence, prior state, requested state, rationale, timestamp, and an operator-supplied local label.
Existing triage events are never updated or deleted. Current inbox state is a projection of the
ordered event stream. Optimistic revision checks reject conflicting appends instead of overwriting
history.

The local operator label is not an authenticated identity and must never be presented as one.

### Input and content controls

The HTTP boundary accepts UTF-8 JSON only. Request bodies are limited to 16 KiB. Feedback content is
required and limited to 8,000 Unicode code points. Other text fields have the smaller limits in the
public contract.

Every content-bearing write requires the literal acknowledgement
`"contentAcknowledged": true`. Before persistence, deterministic high-confidence detectors reject
recognized secrets and regulated-data patterns. Rejections return rule identifiers and never echo
the detected value. Raw submitted content is excluded from logs and telemetry.

These controls are deliberately bounded. They are not complete DLP, do not prove that all secrets
or regulated data will be detected, and do not make SignalDesk an approved repository for such
data. When a detector is uncertain, SD-001 provides no silent sanitization or probabilistic
fallback.

### HTTP and domain contract

The public contract is [SD-001.md](../contracts/SD-001.md). It defines versioned endpoints, domain
records, validation limits, atomicity, errors, and non-claims. Contract-breaking implementation
changes require the approvals and evidence associated with `public-contract`.

### Operating contract

The component operating contract is
[signaldesk-web.component.json](../contracts/signaldesk-web.component.json). It records ownership,
interfaces, dependencies, side effects, authority, confidential-data handling, failure behavior,
telemetry boundaries, planned verification, local deployment, and rollback responsibility.

## Human authority and claim boundary

Neel retains merge, release, deployment, learning-promotion, and architecture-exception authority.
Agents may prepare changes and evidence only within separately delegated work.

SD-001 makes no claim of:

- authentication, authorization, verified user identity, tenancy, or multi-user isolation;
- hosted, internet-facing, production, or autonomous deployment readiness;
- complete secret detection, complete regulated-data detection, or complete DLP;
- upload handling, attachment scanning, background processing, or external-service integration;
- probabilistic analysis, feedback grouping, issue prioritization, or learning promotion.

Any hosted or shared deployment requires a new governed decision covering authentication,
authorization, tenancy, secrets, observability, retention, recovery, and hosted evidence.

## Consequences

- The first slice remains small, deterministic, traceable, and operable without an external model.
- Cross-context coordination is explicit and domain ownership remains separate inside one process.
- Atomic one-to-one lineage is simple to verify but intentionally postpones grouping and synthesis.
- Append-only triage preserves decision history at the cost of projection logic.
- Local-only operation limits exposure but is not a substitute for authentication or DLP.
- Prisma/PostgreSQL and dependency-cruiser become deliberate implementation constraints.

## Alternatives considered

### Separate services

Rejected for SD-001 because distributed transactions, deployment, and operational boundaries add
cost without improving the first local workflow.

### One module for feedback and signals

Rejected because intake policy and signal lifecycle have different ownership and change pressures.
The modular-monolith boundary preserves that distinction without a network boundary.

### Mutable triage columns only

Rejected because overwriting state would erase the manual decision trail required by the product
mission.

### Model-generated or grouped signals

Rejected for the first slice because it introduces probabilistic behavior and weakens the simple
one-feedback-to-one-signal proof gate.

## Acceptance and next gate

This ADR authorizes design intent; it is not runtime evidence. Implementation may begin only under
the ready SD-001 work item and must advance through Foundation, Component, Integration, Workflow,
and Stress validation in that order. No implementation is part of SD-001A.
