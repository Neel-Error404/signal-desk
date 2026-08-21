# SD-008 ADR 0011 Local Correction Evidence

**Status:** VERIFIED for the ratified bounded local implementation; provider revalidation and
hosted SD-008 remain BLOCKED at separate approval gates

**Date:** August 22, 2026

**Authority:** Ratify ADR 0011 and implement its provider-valid delegated role-assignment condition
locally only. No Git, GitHub, GHCR, Entra, Azure, credential, or workflow-dispatch mutation was
authorized or performed.

## Claim

The SD-008 provision authority renderer, contract, hosted reread assertion, and tests now use only
provider-supported delegated role-assignment attributes. They preserve the Key Vault Secrets User
role restriction, prevent self-assignment, restrict targets to service principals, and preserve
the exact resource-group outer assignment scope.

## Implemented boundary

- removed the unsupported `RoleAssignmentScope` request and resource predicates;
- retained only Key Vault Secrets User role definition
  `4633458b-17de-408a-b874-0445c86b69e6`;
- changed request `PrincipalId` exclusion to `ForAnyOfAllValues:GuidNotEquals`;
- constrained write and delete target `PrincipalType` to `ServicePrincipal`;
- retained the provision custom-role assignment at the exact ephemeral resource-group scope;
- updated the hosted workflow to reject a reread condition with the obsolete token or without the
  exact role, provision-principal exclusion, aggregate operator, and principal type; and
- added deterministic Foundation and Component coverage for the amended contract and rendered
  packet.

Azure does not provide a target-role-assignment-scope attribute for this condition. The provider-
enforced limit is therefore Key Vault Secrets User assignments to service principals other than
the provision principal anywhere at or below the exact resource-group outer scope. The Bicep still
requests only secret-child assignments, but that narrower path is workflow intent and not an Azure
ABAC guarantee.

## Source validation

Microsoft's current authorization-action attribute reference lists `RoleDefinitionId`,
`PrincipalId`, and `PrincipalType` for role-assignment write and delete. Microsoft's delegated-role
examples use `ForAnyOfAllValues:GuidNotEquals` for aggregate GUID exclusion and
`ForAnyOfAnyValues:StringEqualsIgnoreCase {'ServicePrincipal'}` for service-principal targets.

- <https://learn.microsoft.com/azure/role-based-access-control/conditions-authorization-actions-attributes>
- <https://learn.microsoft.com/azure/role-based-access-control/delegate-role-assignments-examples>

Documentation comparison is design evidence, not proof that the live Azure provider accepted the
rendered assignment.

## Exact source state

- repository: `https://github.com/Neel-Error404/signal-desk`, public, default branch `main`;
- live main commit: `416b690b94ed4ceb6d2a109aa6dafc6bee7bb294`;
- local branch: `work/sd-008-adr0010-corrections` at
  `0b40cdaba088539aaad13cb8ee387e77ed3289d6`;
- live-main and local-HEAD tree: `880434b843c670e316ff6274c52ec5e17f181569`;
- index: empty; all ADR 0011 changes are unstaged.

The equal trees establish that the local correction began from the exact live source content
without a pull, merge, checkout, or branch mutation.

## Ordered verification

| Level or check | Result |
|---|---|
| Foundation | PASS; lockfile, Prisma generation/validation, typecheck, lint, migration safety, 53 contracts, layout, and boundaries |
| Component | PASS; 13 files and 58 tests, including corrected authority-packet rendering |
| Integration | PASS; six migrations and 25 tests |
| Workflow | PASS; desktop and mobile owner flows |
| Stress | PASS; 19 checks on Node 24.14.0 |
| Production build | PASS; optimized Next.js build |
| Dependency audit | PASS; zero vulnerabilities at the high threshold |
| actionlint | PASS; `sd008-azure-staging.yml` |
| Bicep compile | PASS; `infra/staging/main.bicep` |
| Elder validation | PASS |
| Changed-file privacy scan | PASS; no private keys, GitHub tokens, assigned client secrets, storage keys, or real bearer credentials; one declared synthetic bearer test fixture reviewed |
| Git diff/index check | PASS; no whitespace error and zero staged paths |

No ordered rung failed, so no same-level repair or fallback was required. Vite reported only its
existing future native-loader warning, and Prisma reported only an available major upgrade; neither
was a test failure.

## Review-binding working-tree digests

- workflow: `41ad65bce1793affb261f90a3bb14e30432455bd2ebed12f15824492da8cfd9f`;
- authority contract: `6bd677e89ff0d03b6ea2878b949f6fd69fe9fc482c5a0db82e9dae7c6efe5b8e`;
- authority renderer: `b91aafeabebee434b168b9d457d8073dbf8f056b10a08c8ce8c06f9246e96ee5`;
- Foundation contracts: `f16e1646df2ec1767fa80adf2509ae92d7c94c8c96c1a597f9e7b752ff54b1fc`;
- Component evidence tests: `158d69b9b8fa5e8bd182399bb201bbb4e1c0ef77abe545cfd7882ae2e3d83b1e`;
- ADR 0011: `1617853fe8e5928dd40a1a13ecd00a455adfb7df595c862904e3651320e9b19f`;
- reproduction record: `6828fa13be8c15eb26422b24b73c74e6fa3fc00d01bfa6b033802aab8a1f95c2`;
- handoff: `62ee56440f687607615ca3706ae8702f984a73ca474944ece8560a41cc663a64`.

These are unstaged file-byte SHA-256 values, not Git object identifiers. The evidence file omits
its own circular digest and must be hashed as part of any later delivery packet.

## Limitations and next gate

This evidence proves local contract consistency, deterministic rendering, workflow syntax, and
test coverage. It does not prove live Azure condition acceptance or enforcement. A separately
authorized, attended Phase B2A provider-validation attempt must render the exact reviewed packet,
create only the bounded session resources, and reread the accepted assignment before workflow
dispatch. No such attempt is authorized by ADR 0011.

No actual hosted trace, SD-008 candidate, independent evaluation, human learning decision, or
promotion packet was created in this slice. Canonical maturity remains unchanged; this evidence
cannot support L2, L3, staging-success, production, or SD-008-complete claims.

## Verdict

ADR 0011 bounded local implementation is `VERIFIED`. Hosted provider revalidation and the remaining
SD-008 two-lane work are `BLOCKED` at their separate human approval gates.
