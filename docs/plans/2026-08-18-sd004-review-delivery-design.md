# SD-004 Review Delivery Design

## Governed intake

**Objective:** Let a local product team attach one immutable review delivery to an approved
Implementation Brief and inspect the exact implementation-to-PR trace through SignalDesk.

**Affected user:** The local product owner following an accepted issue from brief to review.

**Success:** SignalDesk shows the repository, base and head branches, commit, pull-request URL,
verification summary, unverified local submitter label, server time, and complete source lineage.
The repository also owns a deterministic Git delivery contract that Elder can validate and
consume.

**Failure:** A delivery can be recorded without a brief, a second delivery is accepted, an
untrusted repository or PR URL is accepted, branches or commit are malformed, content leaks to
logs, or the product represents operator-supplied Git data as provider-verified.

**Constraints:** Local prototype; moderate risk; confidential data; single repository; autonomy
ceiling L2; merge, deployment, release, credentials, architecture exceptions, and learning
promotion remain human-controlled.

**Non-goals:** Editing, deletion, GitHub API verification, commit signing, creating or updating a
PR from the product, merge, deployment, release, release notes, customer communication, L2/L3
promotion, or changing Elder's constitutional authority.

**Change class:** `public-contract`.

**Capability packs:** core, web-product, data, factory-operations, assurance, learning.

**Knowledge sources:** executable SignalDesk behavior; `delivery/review-delivery-contract.json`;
SD-001 through SD-003 contracts and accepted ADRs; generated Elder profile and authority files.

**Next proof gate:** Foundation validates the delivery contract, ADR, work item, schema, migration,
route surface, and dependency direction before Component execution begins.

## Architecture

Add a `Review Deliveries` bounded context and a `brief-to-delivery` workflow. The application
layer depends on an injected `ReviewDeliveryPolicy`; composition loads the product-owned JSON
contract. The domain never imports Git, GitHub, HTTP, Prisma, or Elder code.

The workflow locks the source Implementation Brief and creates one immutable Review Delivery in
the same PostgreSQL transaction. `GET /api/v1/signals/{signalId}` adds the delivery after the
existing Feedback -> Signal -> Product Issue -> Implementation Brief lineage.

The delivery record is an operator-supplied trace, not hosted-provider evidence. The trusted URL
prefix and branch rules are deterministic product policy. Elder consumption of the contract is a
separate factory trace and cannot make the product record provider-verified.

## Delivery sequence

1. Implement and verify the product record and product-owned contract.
2. Attempt Elder contract consumption and autonomous readiness without bypassing P5.2.
3. Correct only a reproduced Elder consumption blocker within this loop.
4. Deliver SD-004 as a stacked reviewable PR using the declared branch and ordered checks.
5. Record which actor performed each Git action, propose candidate learning, and stop.
