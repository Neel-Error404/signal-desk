# SD-008 ADR 0010 Local Correction Evidence

**Status:** VERIFIED for the ratified bounded local implementation; hosted SD-008 remains BLOCKED

**Date:** August 21, 2026

**Authority:** Ratify ADR 0010 and implement locally only. No Git/GitHub, GHCR, Entra, or Azure
mutation was authorized.

## Verified outcome

ADR 0010 corrects the merged SD-008 baseline without claiming a hosted deployment. The local
implementation now:

1. proves the dispatched source is exact current protected `main` before any package or attestation
   write;
2. pins the baseline Container App revision at 100% so candidate creation cannot inherit traffic;
3. uses a dedicated secretless smoke application with environment-bound GitHub OIDC assertions;
4. excludes provision and traffic deployment principals from the ingress authorization allow-list;
5. declares the effective Azure authority honestly, including that `containerApps/write` is broader
   than traffic weights even at exact-app scope;
6. separates provision, exact-app traffic, evidence read, resource-group teardown, and temporary
   subscription read-only post-delete verification roles;
7. exports only redacted public evidence plus owner-key-encrypted exact non-secret identifiers;
8. calculates a conservative retail cost upper bound without claiming final provider billing;
9. assembles a 13-event hosted trace only after four accountable GitHub approvals, the ordered gate,
   zero-traffic proof, rollback, teardown, absence, and owner removal of the temporary verifier role;
10. leaves candidate creation, independent evaluation, exact human decision, and non-mutating
    promotion-packet issuance to the existing Elder P4.6 lane after an actual hosted trace exists.

The teardown path also derives the session start from the provision output, the resource-group
`createdAt` tag, or the GitHub run start in that order. A provision failure after resource creation
therefore cannot skip resource-group deletion merely because the provision job did not export its
output. Invalid or unavailable timestamps still fail closed before cost evidence is accepted.

The trace-input workflow artifact is intentionally incomplete until the owner supplies the final
post-delete role-removal proof. The assembler rejects the template and any remaining assignment.
No local plan or synthetic fixture is eligible to create the SD-008 learning candidate.

## Fresh live read-only state

- repository: `https://github.com/Neel-Error404/signal-desk`, public, default branch `main`;
- local branch: `work/sd-008-azure-staging-baseline` at `49e78225fceb26c497fd4058d02ea935bf90eb30`;
- remote branch: present at the same commit from merged PR #7;
- `origin/main`: merge commit `a74b430094855987ce14e2ebb294d9e345ee7d07`;
- PR #7: merged on August 20, 2026; PR #4: closed without merge;
- active ruleset: `21058424`, strict required `signaldesk-ordered-review-gate`, zero bypass actors;
- GitHub Environments: zero; deployments: zero;
- GHCR package lookup: absent or inaccessible (HTTP 404);
- Azure resource group `rg-signaldesk-stg-cin`: absent;
- Azure subscription: enabled; current operator has subscription Owner authority;
- Central India: Container Apps, PostgreSQL Flexible Server, Key Vault, Log Analytics, managed
  identity, networking, authorization, and cost providers registered and required resource types
  available;
- selected PostgreSQL `Standard_B1ms`: available with PostgreSQL 16 support;
- Container Apps managed-environment usage: 1 of 5; no SD-008 Entra applications, custom roles,
  assignments, or budget exist;
- conservative maximum eight-hour session estimate: USD 0.89, below the USD 2 owner-review
  threshold and USD 5 budget stop boundary;
- Git identity: `Neel <neelabhasamadder@gamil.com>`;
- staged files: zero; all ADR 0010 correction files remain unstaged.

The local HEAD is the second parent and merge-base of merged `origin/main`, and both commits resolve
to the exact same Git tree `c47372f11c4884459582c07b760a6797636a29a1`. No source reconciliation is
needed. The eventual correction delivery should create a fresh branch from exact protected main
`a74b430094855987ce14e2ebb294d9e345ee7d07` while preserving this working tree.

## Ordered verification

| Level or check | Result |
|---|---|
| Foundation | PASS; 52 contracts plus typecheck, lint, schema, migration safety, layout, boundaries |
| Component | PASS; 58 tests including smoke OIDC exchange, evidence, trace, cost, and authority packets |
| Integration | PASS; six migrations and 25 tests |
| Workflow | PASS; desktop and mobile owner flows |
| Stress | PASS; 19 checks under the hosted ladder's pinned Node 22 runtime |
| Build | PASS; optimized Next.js production build |
| Dependency audit | PASS; zero high-threshold vulnerabilities |
| Elder validation | PASS |
| Bicep compile | PASS; `infra/staging/main.bicep` |
| actionlint | PASS; pinned local actionlint binary |
| Git diff check | PASS; line-ending notices only |
| Changed-file privacy scan | PASS; no private key, GitHub token, JWT, credentialed database URL, storage key, or secret-shaped value |
| Eight-hour cost calculation | PASS; conservative USD 0.89 upper bound, not an Azure billing claim |

The first Stress attempt used the machine default Node 24.14 and reached the expected database
outage response before `embedded-postgres` rejected its Windows restart with an undefined reason.
The same level was rerun without source changes on installed Node 22.14, matching hosted CI, and all
19 checks passed. The machine default was not changed.

## Working-tree digests

- ADR 0010: `d16be839300c5ba286f87432aa29851a9d01bbab615342f13d17703ea0cc40be`;
- correction contract: `681ab2517e6660dd44091375fe8a3bad9502b09719189fcc3bdb0e5bf877c45e`;
- Azure authority contract: `55afa30b0b8bcff647f974d258b94a61da19ba0727bcc02d6edd7f10be45699b`;
- learning contract: `9a8156704ce612f1872665b4d8e9c1ba91095cec3c9b4560a57c04d3d3968796`;
- cost model: `4917a02d267a8b644682906e1d7b3285b0587a6bcac2794800bd9944d6645186`;
- staging workflow: `0c0d85ef60df0de2243155e0121f3ce719115c1d3d9d9413f162bfcdcacb3065`;
- main Bicep: `55eb0f70e9d8307648b86e63342a2d2c7c76893c637e0c44511ad0c010f493a6`;
- smoke token exchange: `cc30772fc853717e42bd639a1960c25f6f2966723b8dd2bcfcefe6f325055760`;
- hosted trace assembler: `3988c2fa7f820043a5a1adb474de5656673e1f8f90591d7e8579d9d1cb753881`;
- Foundation contracts: `06da8b0c17562b697d0f60ceae2ad6bc18f34e13d823cbf9bd72ed5391d0e459`.

These are unstaged working-tree byte digests, not Git object identifiers. Recompute them after any
review amendment.

## Verdict

The ADR 0010 bounded local implementation is `VERIFIED`. Full SD-008 is still `BLOCKED` because no
GitHub Environments, identities, roles, package, resource group, hosted run, post-delete authority
closure, actual trace, quarantined candidate, independent evaluation, human learning decision, or
promotion packet exists. This evidence does not claim canonical L2, L3, staging success, production,
or learning application.
