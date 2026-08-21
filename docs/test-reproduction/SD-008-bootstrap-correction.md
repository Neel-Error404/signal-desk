# SD-008 Bootstrap Correction Verification Plan

**Status:** ADR 0010 RATIFIED; BOUNDED LOCAL IMPLEMENTATION IN PROGRESS

## Claim under test

The SD-008 hosted workflow can fail closed before publication unless it is running the exact current
protected `main`, export only redacted public evidence plus an owner-encrypted private packet, and
emit one teardown-complete trace that the Elder P4.6 learning lane can consume without direct target
mutation.

## Foundation

1. Validate ratified ADR 0010, `delivery/sd008-bootstrap-correction-contract.json`, and the exact
   provider authority contract.
2. Prove the protected-main job precedes every package or attestation write.
3. Prove the source job checks ref, SHA, live `main`, active strict ruleset, zero bypass actors, and
   the exact successful required check.
4. Prove raw provider files are absent from every artifact upload path.
5. Prove only the public redacted packet and encrypted private envelope are uploadable.
6. Prove the dedicated smoke identity uses GitHub OIDC assertion exchange and that deployment
   principals are absent from the ingress allow-list.
7. Prove the initial baseline revision is explicitly pinned at 100% and the candidate starts at
   zero traffic.
8. Prove the learning contract requires actual hosted teardown, owner removal of the post-delete
   verifier assignment, and at most one candidate.

## Component

1. Export representative provider evidence and prove deterministic identifier redaction.
2. Decrypt the private envelope with the paired test key and prove its plaintext digest binding.
3. Reject bearer tokens, connection strings, passwords, cookies, client secrets, and malformed JSON.
4. Render the five declared custom-role assignments and prove the packet applies no mutation.
5. Calculate a conservative session-cost upper bound without claiming actual provider billing.
6. Normalize GitHub approvals and job results, then assemble a complete hosted trace with ordered
   approvals, consequences, rollback, teardown, absence, post-delete authority closure, cost, and
   evidence digests.
7. Reject planned/synthetic source, missing teardown, missing absence proof, event reordering,
   private identifiers, SD-007 reuse, multiple-candidate allowance, and target mutation.

## Later levels

Integration binds exporter output to the hosted workflow file set. Workflow validates the complete
redacted Lane 1 packet outside the disposable resource group. Stress injects secret-shaped content,
artifact drift, event reordering, missing approvals, missing teardown, and envelope tampering. Run
these only after the preceding test level passes.

## Stop boundary

ADR 0010 is ratified only for this bounded local implementation. Local validation cannot stage,
commit, push, open a pull request, create identities or roles, register a public key, publish an
image, deploy, produce an actual hosted trace, create or approve a learning candidate, emit a real
promotion packet, apply learning, or support an L2/L3 claim.
