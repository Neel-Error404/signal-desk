# ADR 0011: SD-008 Provider-Valid Delegated Role-Assignment Condition

## Status

Accepted for bounded local implementation by Neel's exact ratification on August 22, 2026. The
ratification authorizes only the authority contract, renderer, workflow assertions, tests, and
local evidence corrections in this ADR. It does not authorize staging, commit, push, pull-request creation,
cloud-resource or identity creation, role assignments, credentials, GitHub Environment or GHCR
mutation, or workflow dispatch. ADR 0011 amends ADR 0010 only for the delegated role-assignment
condition described here.

**Date:** August 22, 2026

**Change class:** Infrastructure with security and evidence-governance impact

## Context

The first attended Phase B2A bootstrap attempt reached Azure's role-assignment condition parser.
Azure rejected `Microsoft.Authorization/roleAssignments:RoleAssignmentScope` because that request
and resource attribute is not supported for delegated role-assignment conditions. Compensating
cleanup removed the empty resource group, and read-only verification found no assignments,
credentials, workflow dispatches, or runtime resources left behind.

Microsoft's provider contract supports `RoleDefinitionId`, `PrincipalId`, and `PrincipalType` for
the relevant role-assignment write and delete actions. Its aggregate not-equals form for excluding
a GUID is `ForAnyOfAllValues:GuidNotEquals`. The resource scope of a role assignment is therefore
bounded by the outer Azure role assignment that grants the provision principal its custom role,
not by a `RoleAssignmentScope` condition predicate.

## Decision

The provision delegation condition will:

- remove every unsupported `RoleAssignmentScope` predicate;
- allow only the Key Vault Secrets User role definition
  `4633458b-17de-408a-b874-0445c86b69e6` for both write and delete;
- prevent the provision principal from assigning the role to itself by applying
  `ForAnyOfAllValues:GuidNotEquals` to the request `PrincipalId`;
- restrict write and delete targets to `ServicePrincipal` through the supported `PrincipalType`
  request and resource attributes; and
- preserve the exact resource-group outer assignment scope for the provision custom role.

The provider does not expose a condition attribute that further limits the target role assignment
path to Key Vault vaults or secret children. The effective provider-enforced boundary is therefore:
the Key Vault Secrets User role may be assigned only to service principals other than the provision
principal, anywhere at or below the exact ephemeral resource-group outer scope. The current Bicep
still requests only exact secret-child assignments, and the exact workflow, protected Environment
approval, short-lived credentials, attended run, post-operation reread, teardown, and synthetic-data
boundary remain compensating controls. They do not create a narrower Azure RBAC scope claim.

## Executable fitness functions

- Foundation tests require the ratified ADR, the exact resource-group outer scope, supported
  attributes only, the Key Vault Secrets User role, `ServicePrincipal`, and the aggregate self-
  exclusion operator.
- Component tests render the non-mutating authority packet and reject the old
  `RoleAssignmentScope` token or the weaker not-equals operator.
- The hosted workflow rereads the live provision assignment and fails unless the condition contains
  the exact role, excluded provision principal, `ForAnyOfAllValues:GuidNotEquals`, and
  `ServicePrincipal`, and contains no `RoleAssignmentScope` token.
- Local passing tests are not provider execution evidence. A separately authorized bootstrap must
  still prove Azure accepts and enforces the exact rendered assignment.

## Consequences

This change removes an invalid provider predicate while retaining the strongest supported bounded
delegation needed by SD-008. The scope guarantee is broader than the previously intended Key Vault
path prefix and is now stated honestly. It does not increase the custom role's allowed role, target
principal type, outer resource scope, session duration, or workflow authority.

## Approval boundary

Any Git delivery, provider revalidation, role assignment, credential creation, workflow dispatch,
Environment approval, Azure runtime mutation, hosted trace, learning candidate, or promotion packet
remains a separate gate. This ADR cannot support a staging-success, SD-008 completion, L2, L3, or
production claim.
