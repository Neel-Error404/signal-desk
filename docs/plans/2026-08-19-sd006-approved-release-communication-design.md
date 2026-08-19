# SD-006 Approved Unsent Release Communication Design

## Governed intake

- Objective: preserve one owner-approved customer-facing communication with exact source lineage.
- Success: a local operator can approve, inspect, and reload the immutable content without any
  publication claim or external credential.
- Failure: duplicate or unapproved content persists, lineage is incomplete, or approval is shown
  as sent/released.
- Risk: moderate, confidential, local prototype, L2 autonomy ceiling.
- Authority: Neel approves product content; publication, merge, deployment, and release remain
  human-only.
- Ship target: reviewable PR.

## Architecture

Add a `Release Communications` bounded context with inward dependency direction and a
`completion-to-communication` workflow. The workflow locks the Completed Fix, resolves the full
lineage through Review Delivery, Implementation Brief, Product Issue, Signal, and Feedback, then
creates exactly one immutable record in the same PostgreSQL transaction.

The UI adds one approval form after a Completed Fix exists and then renders the approved artifact
with a permanent `Approved - not sent` label. There is no adapter for email, chat, release notes,
or any external publication provider.

## Alternatives

1. Store a mutable draft and approval history. Rejected because SD-006 needs only one bounded
   approved artifact and no editing workflow.
2. Send the communication after approval. Rejected because credentials, recipients, retries,
   consent, and delivery evidence are a separate product and authority boundary.
3. Store only free-form message text. Rejected because subject and intended audience make the
   approved artifact understandable without introducing channel-specific fields.

## Elder experiment

Register the new lifecycle contract after Completed Fix. Elder must reject a registry whose
previous outcome does not match the next source or whose declared next stage does not match the
next lifecycle stage. Successful chain validation remains descriptive and grants no transition.

After product verification, attempt the reviewable-PR target. A hosted or provider constraint is
recorded as blocked unless current authority and exact evidence are available; it is never
silently replaced with direct ungoverned delivery.
