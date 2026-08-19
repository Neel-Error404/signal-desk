# ADR 0008: SD-007 Hosted Review Gate

## Status

Accepted for bounded implementation by Neel's explicit approval on August 19, 2026 after review
of the live repository, privacy preflight, hosted workflow, public-visibility mutation, protected
delivery rule, controlled-failure proof, human interventions, and stop boundary.

The hosted runner decision was amended from Windows Server 2022 to Ubuntu 24.04 by Neel's exact
approval on August 20, 2026 after live Windows runs proved that PostgreSQL rejects GitHub's
administrative `runneradmin` account.

## Change classification and authority

- The GitHub Actions workflow, runner cleanup correction, and protected-delivery configuration
  are `infrastructure`.
- Neel authorized the SD-007 branch, implementation, local verification, commits, pushes, stacked
  pull request, public visibility change, required-check rule, and controlled failure/correction.
- Humans retain merge, release, deployment, learning approval, learning application,
  certification, qualification ratification, and maturity promotion.
- SignalDesk PR #4, the SD-007 PR, and Elder PR #6 remain unmerged.

## Context

SignalDesk already owns the exact ordered verification ladder in
`delivery/review-delivery-contract.json`, and SD-006 proved a real owner-supervised pull request.
GitHub nevertheless reports no checks on PR #4. The private GitHub Free repository also returns
HTTP 403 for ruleset and branch-protection APIs. A workflow file alone would not prove protected
delivery.

The public-repository path is approved only after a history-wide secret and privacy scan. Public
visibility is a Git delivery control for this prototype; it is not application deployment.

## Decision

Add one pull-request workflow with one sequential Ubuntu 24.04 job named
`signaldesk-ordered-review-gate`. It uses immutable action revisions, Node.js 22, deterministic
`npm ci`, the product-owned checks in exact order, and the portable Elder capsule. The job has
read-only repository permission, persists no checkout credential, and uses `pull_request` rather
than `pull_request_target`.

Use GitHub's ephemeral Ubuntu 24.04 hosted runner because its job account is non-root and the
current official image includes PowerShell and Google Chrome. The immutable setup actions still
pin Node.js 22.18.0 and Python 3.13.5. SignalDesk's integration, workflow, and stress lanes keep
using embedded PostgreSQL, and the portable capsule keeps running through PowerShell. This does
not add WSL or change the owner's local Windows environment.

The original Windows selection was tested rather than assumed. Its work volume rejected
PostgreSQL permission changes, and its user-owned `C:` path allowed initialization but PostgreSQL
then explicitly refused the administrative runner account. Retaining Windows would therefore
make the hosted gate structurally unreliable.

After the private hosted check is real, make SignalDesk public and install one active GitHub
ruleset on `main` and the exact SD-007 base branch. Require pull requests and the observed exact
check, prohibit deletion and non-fast-forward updates, enforce strict check freshness, and grant
no bypass actor.

Prove enforcement with one temporary deterministic Foundation failure. The failed revision must
show the required check failing and the pull request unable to satisfy protected delivery. Remove
only that temporary failure, rerun the unchanged job, and bind the final green result to the exact
revision and active rule.

The pre-implementation live ladder also reproduced a Windows `EBUSY` race while deleting the
generated Stress PostgreSQL directory. Use Node's bounded recursive-removal retry for the exact
runtime directory and continue to raise when that bound is exhausted.

## Failure conditions

- Fail if any contract command is missing, duplicated, weakened, skipped, or reordered.
- Fail if the runner cannot start embedded PostgreSQL, installed Chrome, or the Elder capsule.
- Fail if the workflow receives write permission, persists credentials, or consumes secrets.
- Fail if the public privacy preflight changes or repository identity drifts.
- Fail if GitHub cannot reread an active rule requiring the observed exact check.
- Fail if the controlled failing revision can satisfy protected delivery.
- Fail if the corrected exact revision is not green or the rule can be bypassed.
- Fail if hosted CI or branch protection is described as application deployment or canonical L2.

## Non-goals

SignalDesk features, merging any open pull request, staging, production, application deployment,
release, rollback, signed workload identity, P5.2 activation, L3, certification, canonical
authority activation, maturity promotion, and the 20-item/30-day qualification period.

## Evidence and stop condition

Run Foundation, Component, Integration, Workflow, Stress, Build, Audit, and Elder validation in
order. Prove the same order on a real stacked pull request, then prove required-check failure and
recovery under the active rule. Analyse that exact trace through one quarantined Prime candidate,
independent evaluation, exact human decision, and at most one non-mutating promotion packet.
Stop with a new handoff when both lanes are `VERIFIED` or `BLOCKED`.
