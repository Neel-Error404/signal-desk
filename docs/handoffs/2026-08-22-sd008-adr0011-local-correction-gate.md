# SD-008 ADR 0011 Local Correction Gate Handoff

**Result:** ADR 0011 bounded local implementation VERIFIED; provider revalidation and hosted SD-008
BLOCKED at separate approval gates

**Canonical maturity:** unchanged; no L2 or L3 claim

**Delivery state:** unstaged working tree; no Git or provider mutation performed

## Resume point

ADR 0011 replaces the provider-invalid delegated role-assignment condition used by the SD-008
provision assignment. The renderer now relies only on supported Azure role-assignment attributes:
the Key Vault Secrets User `RoleDefinitionId`, aggregate exclusion of the provision `PrincipalId`,
and `ServicePrincipal` `PrincipalType`. The exact ephemeral resource group remains the outer Azure
assignment scope.

The hosted workflow will fail closed unless its live assignment reread contains those exact
controls and no `RoleAssignmentScope` token. The complete product-owned ordered ladder, workflow
lint, Bicep compile, build, audit, and Elder validation pass locally.

## Security truth

Azure cannot express the previous Key Vault path-prefix restriction through a delegated role-
assignment condition. The effective provider boundary permits the allowed role for eligible service
principals anywhere at or below the exact resource-group scope. Exact secret-child assignments are
still the only assignments requested by the Bicep, and Environment approval, attended execution,
short-lived authority, synthetic staging data, provider reread, and teardown remain required.

## Next separately approved gates

1. Review the nine-file ADR 0011 correction and its exact working-tree digests. If accepted,
   separately authorize a bounded Git delivery packet; no Git action is authorized here.
2. After protected review and merge, refresh the read-only GitHub, Entra, Azure, cost, expiry, role,
   resource-group, and privacy preflight at the exact live-main commit.
3. Present a new digest-bound Phase B2A provider-validation packet using the corrected condition.
   Require separate approval before creating any resource group, assignment, credential, secret,
   or other provider state.
4. Keep the first attempt attended. Before workflow dispatch, require Azure to accept the exact
   provision assignment and reread the exact scope, role, condition version, principal exclusion,
   and principal type. Compensating cleanup remains mandatory on failure.
5. Only after a separately authorized hosted run completes provision, traffic rehearsal, rollback,
   teardown, post-delete verification, and authority closure may the actual trace enter the Elder
   learning lane.
6. Candidate creation, independent evaluation, exact human approval or rejection, and issuance of
   a non-mutating promotion packet remain later, separately evidenced gates.

## Stop boundary

Do not stage, commit, push, open or merge a pull request, create or mutate cloud resources or
identities, create role assignments or credentials, mutate GitHub Environments or GHCR, dispatch a
workflow, infer a learning decision, issue or apply a promotion packet, claim canonical L2/L3,
start SD-009, or enter production without the corresponding separate approval.
