---
name: signaldesk-delivery-learning
description: "Use when a complete SD-008 hosted teardown trace exists and one cloud-neutral delivery learning should be derived, evaluated, and packaged for possible later Elder adoption."
---

# SignalDesk Delivery Learning

Turn one completed SignalDesk delivery trace into one testable candidate. Preserve useful AgentZ
architecture as comparative source material, while keeping SignalDesk evidence and Elder authority
separate.

## Entry Gate

Do not start this skill until current evidence proves all of the following for one exact SD-008
run:

- an actual hosted SD-008 trace exists and passes the existing trace validator;
- the immutable package, staging deployment, smoke, traffic, and rollback are bound to one source
  commit and image digest;
- teardown proves zero active resources and endpoint absence;
- temporary authority revoked, including the teardown role, ingress credential,
  `staging-provision` secret, and post-delete verifier in the required order;
- evidence is redacted and its hashes are recorded.

Plans, local tests, workflow YAML, an incomplete run, or AgentZ documentation cannot satisfy this
gate.

## Preserved Source Lineage

Use the private transfer only as reference material:

- transfer commit: `5c7812ec515aff51431aa399409a99fc5f9c0350`;
- sanitized AgentZ view: `2bc202ddd27344be61b66650f2aad6def9fb4d73`;
- underlying AgentZ revision: `bff86e1d9243acd3546007ee0167a0bd40439b53`;
- transfer ID: `agentz-to-signaldesk-delivery-skills-v1`;
- expected vault route: `00-Reference/Skill Transfers/AgentZ to SignalDesk/v1`.

Reverify `SHA256SUMS` and `TRANSFER_MANIFEST.json` before use. The package has
`unknown-private-internal-review-only` license status. Do not copy its text into a public template
or treat historical Azure names, costs, resources, or runtime claims as current truth.

The eight source skills contribute questions, not authority:

| AgentZ source | SignalDesk evidence question | Potential cloud-neutral abstraction |
|---|---|---|
| source-of-truth reconciler | Which exact commit, workflow run, and evidence root are authoritative? | explicit release source binding |
| deploy-context builder | Was the artifact built from a clean, manifest-bound context? | build-context integrity |
| local-cloud proof ledger | Which proof layer has actually been observed? | non-collapsible evidence stages |
| cloud-revision lifecycle | What is candidate, active, rollback, stale, and deleted? | runtime-state lifecycle |
| cost hygiene | What remains billable before, during, and after the run? | cost closure |
| recovery-claim boundary | Did observed behavior prove recovery rather than only deployment? | recovery claim semantics |
| evidence retention | Which redacted evidence is needed for the decision and for how long? | bounded evidence retention |
| Azure deployment | Which provider adapter gates proved staging, traffic, rollback, and closure? | provider-neutral lifecycle plus adapter tests |

## Candidate Workflow

1. Validate the exact hosted trace with `scripts/validate-sd008-learning-trace.mjs` and the contract
   in `delivery/sd008-learning-contract.json`.
2. Separate observations into product runtime evidence, factory execution evidence, provider-
   specific behavior, and unresolved limitations.
3. Compare the actual failed and successful boundaries with the AgentZ questions above. Use only
   lessons supported by both the trace and a counterexample analysis.
4. Form the weakest sufficient hypothesis. Prefer a small invariant such as phase-proportional
   controls, executable adapter proof, just-in-time authority, explicit proof layers, or verified
   cost/teardown closure.
5. Create exactly one cloud-neutral candidate in quarantine through the existing SD-008 learning
   runtime. Azure commands and SignalDesk names may appear as evidence, not as universal policy.
6. Use an independent evaluator that did not author the candidate. Test portability beyond Azure,
   counterexamples, whether the rule would have prevented the observed failures, and whether it
   adds unnecessary process.
7. Present the candidate and evaluation SHA-256 values and obtain the exact human approval or
   rejection required by `delivery/sd008-learning-contract.json`.
8. If approved, emit only a non-mutating promotion packet. Do not apply it from SignalDesk.

## Later Elder Adoption

Do not edit Elder Protocol from this skill. After SignalDesk learning closes, start a separately
authorized Elder work item in `D:\Balcony\Template\elder-protocol`.

That future work must decide which layer owns the candidate:

- a capability-pack invariant when every product must satisfy it;
- a provider-neutral delivery skill when the procedure applies across clouds;
- a stack adapter when only provider commands or evidence shapes vary;
- a reference implementation when it demonstrates the contract without becoming universal policy.

Validate the proposal against at least one non-Azure counterexample and one product unlike
SignalDesk. Preserve the same immutable-artifact and evidence-stage concepts where they survive;
discard AgentZ trading, broker, release-pair, resource-name, production, and unattended-Git
assumptions. Constitutional changes require a new Elder ADR, independent evaluation, human
approval, version change, and the Elder repository's own test ladder.

## Done

This learning slice ends with an independently evaluated candidate, an exact human decision, and—
only if approved—a non-mutating promotion packet. Generalized Elder templates are not implemented
until a later Elder-authorized change consumes that packet.
