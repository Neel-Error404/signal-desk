# SD-005 Completed Fix Design

**Objective:** Let a local product owner record that a delivered review was merged and preserve
the exact completion evidence without granting SignalDesk or Elder merge authority.

## Product decision

SD-005 adds a `Completed Fixes` bounded context and a `delivery-to-completion` workflow. One
Review Delivery may create at most one immutable Completed Fix. The record captures the merged
commit, a bounded completion summary, an unverified local operator label, and server time.

The operator must explicitly confirm that the merge occurred outside SignalDesk. This
confirmation is an input gate, not independent hosted-provider verification.

## Public surface

```text
POST /api/v1/review-deliveries/{reviewDeliveryId}/completed-fix
```

`GET /api/v1/signals/{signalId}` additively returns `completedFix`, either `null` or the
serialized record. The local interface exposes the complete Feedback-to-Completion lineage.

## Transaction and invariants

The workflow locks the source Review Delivery, rejects a missing or already-completed source,
and creates the record in one PostgreSQL transaction. Database constraints enforce the commit
format, text bounds, one-to-one lineage, and immutability.

## Evidence boundary

SignalDesk stores operator-supplied completion evidence. It does not query GitHub, verify the
merge, merge a pull request, deploy, release, or communicate with customers. Elder may consume
the product-owned lifecycle context, but the context grants no authority.

## Proof ladder

Foundation validates the static contracts, schema, migration, source layout, and architecture
boundaries. Component proves confirmation, commit, content, and time/identity rules. Integration
proves locked lineage, uniqueness, immutability, and concurrency. Workflow proves the complete
UI path and persistence. Stress proves fail-closed concurrency, missing sources, recovery, and
log hygiene.
