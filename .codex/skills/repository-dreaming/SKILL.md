---
name: repository-dreaming
description: "Use Mem0 semantic recall and Azure Luna after evidence-bearing development work to produce one bounded repository-improvement candidate without direct trusted-state mutation."
---

# Repository Dreaming

## Workflow

1. Confirm the trigger is permitted by `.elder/repository-dreaming-policy.json`.
2. Activate the Elder session and bind the request to the activation digest.
3. Select only immutable, redacted evidence required for the hypothesis.
4. Prepare a quarantine workspace through `elder dreaming prepare`.
5. Run `elder dreaming run`; Elder sends only copied evidence and semantic recall to Azure.
6. Mem0 may write only to the local Qdrant candidate index.
7. Require Luna to emit one candidate artifact and one Elder learning-candidate record.
8. Validate the candidate through `elder dreaming accept`.
9. Submit the accepted candidate to the P4.6 learning runtime for replay, shadow evaluation,
   accountable approval, and separate promotion.

Mem0 and Luna are candidate generators. They cannot read the source repository, mutate governed
targets, approve their own proposal, promote it, or write trusted memory.
