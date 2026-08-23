import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_GROUP_NAME = /^(?=.{1,90}$)[A-Za-z0-9_.()\-]*[A-Za-z0-9_()\-]$/;
const CONTAINER_APP_NAME = /^(?=.{2,32}$)[a-z](?!.*--)[a-z0-9-]*[a-z0-9]$/;
const COMMIT = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const IMAGE_DIGEST = /^sha256:[0-9a-f]{64}$/;
const RUN_ID = /^[1-9][0-9]{0,19}$/;
const RFC3339_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?Z$/;
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const parseArguments = (arguments_) => {
  const values = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !name.startsWith("--") || value === undefined) {
      throw new Error("Every authority renderer argument must use --name value.");
    }
    const key = name.slice(2).replaceAll("-", "_");
    if (Object.hasOwn(values, key)) {
      throw new Error(`--${name.slice(2)} must be supplied exactly once.`);
    }
    values[key] = value;
  }
  return values;
};

const requireArguments = (arguments_, names) => {
  for (const required of names) {
    if (arguments_[required] === undefined || arguments_[required] === "") {
      throw new Error(`--${required.replaceAll("_", "-")} is required.`);
    }
  }
};

const uuidV5 = (namespace, name) => {
  const namespaceBytes = Buffer.from(namespace.replaceAll("-", ""), "hex");
  const digest = createHash("sha1").update(namespaceBytes).update(name, "utf8").digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonicalUuid = (value) => value.toLowerCase();

const canonicalJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const exactUtcEpoch = (value, field) => {
  const match = RFC3339_UTC.exec(value);
  if (match === null) {
    throw new Error(`${field} must be strict RFC3339 UTC with Z and optional millisecond precision.`);
  }
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) {
    throw new Error(`${field} must be a real strict RFC3339 UTC timestamp.`);
  }
  const normalized = new Date(epoch).toISOString();
  const expected = match[7] === undefined ? normalized.replace(".000Z", "Z") : normalized;
  if (value !== expected) {
    throw new Error(`${field} must be a real strict RFC3339 UTC timestamp.`);
  }
  return epoch;
};

const delegationCondition = ({ provisionPrincipalId }) => {
  const allowedRole = "4633458b-17de-408a-b874-0445c86b69e6";
  return `((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR ((@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {${allowedRole}}) AND (@Request[Microsoft.Authorization/roleAssignments:PrincipalId] ForAnyOfAllValues:GuidNotEquals {${provisionPrincipalId}}) AND (@Request[Microsoft.Authorization/roleAssignments:PrincipalType] ForAnyOfAnyValues:StringEqualsIgnoreCase {'ServicePrincipal'}))) AND ((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR ((@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {${allowedRole}}) AND (@Resource[Microsoft.Authorization/roleAssignments:PrincipalType] ForAnyOfAnyValues:StringEqualsIgnoreCase {'ServicePrincipal'})))`;
};

const loadContract = async () => {
  const contract = JSON.parse(
    await readFile("delivery/sd008-azure-authority-contract.json", "utf8")
  );
  if (contract.status !== "ratified-local-implementation") {
    throw new Error("The SD-008 Azure authority contract is not ratified for local implementation.");
  }
  if (contract.schemaVersion !== 2 || contract.justInTimeAuthority?.packetMode !== "exactly-one-requested-phase") {
    throw new Error("The SD-008 Azure authority contract does not define the JIT phase packet model.");
  }
  return contract;
};

const validateCommonBindings = (arguments_) => {
  requireArguments(arguments_, [
    "phase",
    "subscription_id",
    "azure_client_id",
    "azure_tenant_id",
    "resource_group",
    "source_commit",
    "image_digest",
    "publication_evidence_digest",
    "session_run_id"
  ]);
  if (!UUID.test(arguments_.subscription_id)) {
    throw new Error("subscription_id must be an exact UUID.");
  }
  if (!UUID.test(arguments_.azure_client_id)) {
    throw new Error("azure_client_id must be an exact UUID.");
  }
  if (!UUID.test(arguments_.azure_tenant_id)) {
    throw new Error("azure_tenant_id must be an exact UUID.");
  }
  if (!RESOURCE_GROUP_NAME.test(arguments_.resource_group)) {
    throw new Error("Resource group name is invalid.");
  }
  if (!COMMIT.test(arguments_.source_commit)) {
    throw new Error("source_commit must be an exact lowercase 40-character commit.");
  }
  if (!IMAGE_DIGEST.test(arguments_.image_digest)) {
    throw new Error("image_digest must be an exact sha256 registry digest.");
  }
  if (!SHA256.test(arguments_.publication_evidence_digest)) {
    throw new Error("publication_evidence_digest must be an exact lowercase SHA-256.");
  }
  if (!RUN_ID.test(arguments_.session_run_id)) {
    throw new Error("session_run_id must be an exact positive numeric run identifier.");
  }
};

const phaseContext = (contract, arguments_) => {
  const phase = contract.justInTimeAuthority.phases[arguments_.phase];
  if (phase === undefined) {
    throw new Error("phase must be exactly provision, traffic, or teardown.");
  }
  const principalArgument = {
    provision: "provision_principal_object_id",
    traffic: "traffic_principal_object_id",
    teardown: "teardown_principal_object_id"
  }[arguments_.phase];
  requireArguments(arguments_, [principalArgument]);
  if (!UUID.test(arguments_[principalArgument])) {
    throw new Error(`${principalArgument} must be an exact UUID.`);
  }
  if (arguments_.phase === "traffic") {
    requireArguments(arguments_, ["container_app"]);
    if (!CONTAINER_APP_NAME.test(arguments_.container_app)) {
      throw new Error("Container App name is invalid.");
    }
  } else if (arguments_.container_app !== undefined) {
    throw new Error("container_app is permitted only for the traffic phase.");
  }
  return { phase, principalArgument };
};

const exactPhaseRoles = (contract, phase) => {
  const roles = phase.roleIds.map((roleId) => contract.roles.find((role) => role.id === roleId));
  if (roles.some((role) => role === undefined)) {
    throw new Error("The requested phase references an unknown contract role.");
  }
  return roles;
};

const phaseAuthorization = (contract, arguments_) => {
  validateCommonBindings(arguments_);
  const { phase, principalArgument } = phaseContext(contract, arguments_);
  const subscriptionId = canonicalUuid(arguments_.subscription_id);
  const subscriptionScope = `/subscriptions/${subscriptionId}`;
  const resourceGroupScope = `${subscriptionScope}/resourceGroups/${arguments_.resource_group}`;
  const appScope = arguments_.phase === "traffic"
    ? `${resourceGroupScope}/providers/Microsoft.App/containerApps/${arguments_.container_app}`
    : undefined;
  const scopeByBoundary = {
    "exact-resource-group": resourceGroupScope,
    "exact-container-app": appScope,
    "subscription-read-only": subscriptionScope
  };
  const principalObjectId = canonicalUuid(arguments_[principalArgument]);
  const azureClientId = canonicalUuid(arguments_.azure_client_id);
  const azureTenantId = canonicalUuid(arguments_.azure_tenant_id);
  const namespace = uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", subscriptionId);
  const roles = exactPhaseRoles(contract, phase);
  const roleDefinitions = roles.map((role) => ({
    Name: uuidV5(namespace, role.id),
    IsCustom: true,
    Description: `${role.name}; SD-008 non-production only.`,
    Actions: role.actions,
    NotActions: [],
    DataActions: [],
    NotDataActions: [],
    AssignableScopes: [subscriptionScope],
    roleName: role.name,
    contractRoleId: role.id
  }));
  const assignments = roles.map((role) => {
    const scope = scopeByBoundary[role.assignmentScope];
    if (scope === undefined) {
      throw new Error(`No exact scope is available for ${role.id}.`);
    }
    const assignment = {
      assignmentId: `${scope}/providers/Microsoft.Authorization/roleAssignments/${uuidV5(
        namespace,
        `${role.id}:${principalObjectId}:${scope.toLowerCase()}`
      )}`,
      roleName: role.name,
      roleDefinitionId: `${subscriptionScope}/providers/Microsoft.Authorization/roleDefinitions/${uuidV5(namespace, role.id)}`,
      principalObjectId,
      scope,
      principalType: "ServicePrincipal"
    };
    if (role.id === "sd008-provision-v1") {
      assignment.conditionVersion = "2.0";
      assignment.condition = delegationCondition({ provisionPrincipalId: principalObjectId });
    }
    return assignment;
  });
  return {
    phase,
    subscriptionScope,
    resourceGroupScope,
    appScope,
    azureClientId,
    azureTenantId,
    principalObjectId,
    roleDefinitions,
    assignments
  };
};

const validateAuthorityWindow = (contract, packet, mutation, now) => {
  const issuedAt = exactUtcEpoch(packet.authorityWindow?.issuedAt, "issuedAt");
  const expiresAt = exactUtcEpoch(packet.authorityWindow?.expiresAt, "expiresAt");
  const approvedAt = exactUtcEpoch(packet.ownerApproval?.approvedAt, "ownerApprovedAt");
  const nowEpoch = exactUtcEpoch(now, "now");
  if (approvedAt > issuedAt) {
    throw new Error("owner approval time must not be later than authority issuance.");
  }
  if (issuedAt > nowEpoch) {
    throw new Error("authority is not yet active at the supplied validation time.");
  }
  if (expiresAt <= issuedAt) {
    throw new Error("authority expiry must be later than issuance.");
  }
  const leaseMinutes = (expiresAt - issuedAt) / 60_000;
  if (leaseMinutes > contract.justInTimeAuthority.maximumLeaseMinutes) {
    throw new Error("authority exceeds the maximum eight-hour lease.");
  }
  const minimumRemainingMinutes =
    contract.justInTimeAuthority.minimumRemainingMinutesByMutation[mutation];
  if (minimumRemainingMinutes === undefined) {
    throw new Error(`mutation ${mutation} is not declared by the authority contract.`);
  }
  if (!mutation.startsWith(`${packet.requestedPhase}-`)) {
    throw new Error(`mutation ${mutation} does not belong to phase ${packet.requestedPhase}.`);
  }
  const remainingMinutes = (expiresAt - nowEpoch) / 60_000;
  if (remainingMinutes < minimumRemainingMinutes) {
    throw new Error(
      `${mutation} requires at least ${minimumRemainingMinutes} minutes remaining; ${remainingMinutes.toFixed(3)} remain.`
    );
  }
  return { leaseMinutes, remainingMinutes, minimumRemainingMinutes };
};

const renderPacket = async (contract, arguments_) => {
  requireArguments(arguments_, [
    "owner_approval_reference",
    "owner_approval_digest",
    "owner_approved_at",
    "issued_at",
    "expires_at",
    "output"
  ]);
  if (!SHA256.test(arguments_.owner_approval_digest)) {
    throw new Error("owner_approval_digest must be an exact lowercase SHA-256.");
  }
  if (arguments_.owner_approval_reference.length > 512) {
    throw new Error("owner_approval_reference must be 512 characters or fewer.");
  }
  const authorization = phaseAuthorization(contract, arguments_);
  const phaseMutationNames = Object.keys(
    contract.justInTimeAuthority.minimumRemainingMinutesByMutation
  ).filter((mutation) => mutation.startsWith(`${arguments_.phase}-`));
  const issuedAtEpoch = exactUtcEpoch(arguments_.issued_at, "issuedAt");
  const approvedAtEpoch = exactUtcEpoch(arguments_.owner_approved_at, "ownerApprovedAt");
  const expiresAtEpoch = exactUtcEpoch(arguments_.expires_at, "expiresAt");
  let priorPhaseClosure;
  if (arguments_.phase === "teardown") {
    requireArguments(arguments_, [
      "prior_traffic_authority_closure_digest",
      "prior_traffic_authority_removed_at"
    ]);
    if (!SHA256.test(arguments_.prior_traffic_authority_closure_digest)) {
      throw new Error("prior_traffic_authority_closure_digest must be an exact lowercase SHA-256.");
    }
    const trafficAuthorityRemovedAtEpoch = exactUtcEpoch(
      arguments_.prior_traffic_authority_removed_at,
      "priorTrafficAuthorityRemovedAt"
    );
    if (issuedAtEpoch <= trafficAuthorityRemovedAtEpoch) {
      throw new Error("teardown authority must be issued after traffic authority removal.");
    }
    priorPhaseClosure = {
      phase: "traffic",
      authorityRemovedAt: arguments_.prior_traffic_authority_removed_at,
      evidenceDigest: arguments_.prior_traffic_authority_closure_digest
    };
  } else if (
    arguments_.prior_traffic_authority_closure_digest !== undefined ||
    arguments_.prior_traffic_authority_removed_at !== undefined
  ) {
    throw new Error("prior traffic authority closure is permitted only for the teardown phase.");
  }
  if (approvedAtEpoch > issuedAtEpoch) {
    throw new Error("owner approval time must not be later than authority issuance.");
  }
  if (expiresAtEpoch <= issuedAtEpoch) {
    throw new Error("authority expiry must be later than issuance.");
  }
  if ((expiresAtEpoch - issuedAtEpoch) / 60_000 > contract.justInTimeAuthority.maximumLeaseMinutes) {
    throw new Error("authority exceeds the maximum eight-hour lease.");
  }
  const phaseMinimum = Math.max(
    ...phaseMutationNames.map(
      (mutation) => contract.justInTimeAuthority.minimumRemainingMinutesByMutation[mutation]
    )
  );
  if ((expiresAtEpoch - issuedAtEpoch) / 60_000 < phaseMinimum) {
    throw new Error(`phase ${arguments_.phase} requires at least ${phaseMinimum} minutes at issuance.`);
  }
  const packet = {
    schemaVersion: 2,
    classification: "owner-controlled-confidential",
    workItem: "SD-008",
    contractId: contract.id,
    requestedPhase: arguments_.phase,
    sourceCommit: arguments_.source_commit,
    imageDigest: arguments_.image_digest,
    publicationEvidenceDigest: arguments_.publication_evidence_digest,
    sessionRunId: arguments_.session_run_id,
    ownerApproval: {
      reference: arguments_.owner_approval_reference,
      digest: arguments_.owner_approval_digest,
      approvedAt: arguments_.owner_approved_at,
      environment: authorization.phase.approvalEnvironment
    },
    authenticatedIdentity: {
      clientId: authorization.azureClientId,
      principalObjectId: authorization.principalObjectId,
      tenantId: authorization.azureTenantId,
      principalType: "ServicePrincipal"
    },
    ...(priorPhaseClosure === undefined ? {} : { priorPhaseClosure }),
    authorityWindow: {
      issuedAt: arguments_.issued_at,
      expiresAt: arguments_.expires_at,
      maximumLeaseMinutes: contract.justInTimeAuthority.maximumLeaseMinutes,
      providerEnforcedExpiry: false,
      expiryEvidence: contract.justInTimeAuthority.assignmentExpiryEvidence,
      expiryEvidenceDetail: contract.justInTimeAuthority.assignmentExpiryEvidenceDetail,
      automaticRenewal: false
    },
    subscriptionScope: authorization.subscriptionScope,
    resourceGroupScope: authorization.resourceGroupScope,
    ...(authorization.appScope === undefined ? {} : { containerAppScope: authorization.appScope }),
    principalBindings: [authorization.principalObjectId],
    roleDefinitions: authorization.roleDefinitions,
    assignments: authorization.assignments,
    phaseRequirements: {
      preconditions: authorization.phase.preconditions,
      forbiddenConcurrentRoleIds: authorization.phase.forbiddenConcurrentRoleIds,
      ...(authorization.phase.removalOrder === undefined
        ? {}
        : { removalOrder: authorization.phase.removalOrder })
    },
    credentialRequirements: contract.justInTimeAuthority.ingressCredential,
    partialBootstrapCompensation: contract.justInTimeAuthority.partialBootstrapCompensation,
    appliesMutation: false
  };
  const packetText = `${JSON.stringify(packet, null, 2)}\n`;
  await writeFile(arguments_.output, packetText, { encoding: "utf8", flag: "wx" });
  console.log(
    JSON.stringify({
      status: "rendered-non-mutating-authority-packet",
      phase: arguments_.phase,
      roleDefinitions: packet.roleDefinitions.length,
      assignments: packet.assignments.length,
      packetSha256: sha256(Buffer.from(packetText, "utf8")),
      appliesMutation: false
    })
  );
};

const readJsonSnapshot = async (file, label) => {
  let value;
  try {
    value = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid readable JSON: ${error.message}`);
  }
  return value;
};

const sortedStrings = (value, label, { lowercase = false } = {}) => {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`${label} must be an array of strings.`);
  }
  return [...value].map((entry) => lowercase ? entry.toLowerCase() : entry).sort();
};

const normalizedCondition = (value) => value === undefined || value === null || value === ""
  ? null
  : value;

const normalizedAssignment = (assignment, label, principalField) => {
  const principalId = assignment[principalField];
  for (const [field, value] of [
    ["id", principalField === "principalObjectId" ? assignment.assignmentId : assignment.id],
    [principalField, principalId],
    ["principalType", assignment.principalType],
    ["roleDefinitionId", assignment.roleDefinitionId],
    ["scope", assignment.scope]
  ]) {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`${label} ${field} is missing.`);
    }
  }
  return {
    id: (principalField === "principalObjectId" ? assignment.assignmentId : assignment.id).toLowerCase(),
    principalId: principalId.toLowerCase(),
    principalType: assignment.principalType.toLowerCase(),
    roleDefinitionId: assignment.roleDefinitionId.toLowerCase(),
    scope: assignment.scope.toLowerCase(),
    condition: normalizedCondition(assignment.condition),
    conditionVersion: normalizedCondition(assignment.conditionVersion)
  };
};

const normalizedRoleDefinition = (definition, label, packetShape) => {
  if (packetShape) {
    return {
      name: definition.Name.toLowerCase(),
      roleName: definition.roleName,
      roleType: "CustomRole",
      actions: sortedStrings(definition.Actions, `${label} Actions`),
      notActions: sortedStrings(definition.NotActions, `${label} NotActions`),
      dataActions: sortedStrings(definition.DataActions, `${label} DataActions`),
      notDataActions: sortedStrings(definition.NotDataActions, `${label} NotDataActions`),
      assignableScopes: sortedStrings(
        definition.AssignableScopes,
        `${label} AssignableScopes`,
        { lowercase: true }
      )
    };
  }
  if (
    typeof definition.name !== "string" ||
    typeof definition.roleName !== "string" ||
    definition.roleType !== "CustomRole" ||
    !Array.isArray(definition.permissions) ||
    definition.permissions.length !== 1
  ) {
    throw new Error(`${label} has an invalid Azure custom-role shape.`);
  }
  const permission = definition.permissions[0];
  return {
    name: definition.name.toLowerCase(),
    roleName: definition.roleName,
    roleType: definition.roleType,
    actions: sortedStrings(permission.actions, `${label} actions`),
    notActions: sortedStrings(permission.notActions, `${label} notActions`),
    dataActions: sortedStrings(permission.dataActions, `${label} dataActions`),
    notDataActions: sortedStrings(permission.notDataActions, `${label} notDataActions`),
    assignableScopes: sortedStrings(
      definition.assignableScopes,
      `${label} assignableScopes`,
      { lowercase: true }
    )
  };
};

const validateLiveAuthority = async (packet, arguments_) => {
  const [liveAssignments, liveDefinitions] = await Promise.all([
    readJsonSnapshot(arguments_.live_role_assignments, "Live role assignments"),
    readJsonSnapshot(arguments_.live_role_definitions, "Live role definitions")
  ]);
  if (!Array.isArray(liveAssignments) || !Array.isArray(liveDefinitions)) {
    throw new Error("Live Azure authority snapshots must contain arrays.");
  }
  const expectedPacketAssignments = arguments_.mutation === "teardown-closure"
    ? packet.assignments.filter(
        (assignment) => assignment.roleName === "SignalDesk SD008 Post Delete Verifier"
      )
    : packet.assignments;
  const expectedAssignments = expectedPacketAssignments
    .map((assignment, index) => normalizedAssignment(assignment, `Packet assignment ${index}`, "principalObjectId"))
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
  const actualAssignments = liveAssignments
    .map((assignment, index) => normalizedAssignment(assignment, `Live assignment ${index}`, "principalId"))
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
  if (canonicalJson(actualAssignments) !== canonicalJson(expectedAssignments)) {
    if (arguments_.mutation === "teardown-closure") {
      throw new Error("live authority does not match verifier-only post-delete authority.");
    }
    throw new Error("live authority assignments do not exactly match the phase packet.");
  }

  const expectedDefinitionIds = new Set(
    expectedPacketAssignments.map((assignment) => assignment.roleDefinitionId.toLowerCase())
  );
  const expectedPacketDefinitions = packet.roleDefinitions.filter((definition) =>
    [...expectedDefinitionIds].some((id) => id.endsWith(`/${definition.Name.toLowerCase()}`))
  );
  for (const [index, packetDefinition] of expectedPacketDefinitions.entries()) {
    const matching = liveDefinitions.filter(
      (definition) => typeof definition.name === "string" &&
        definition.name.toLowerCase() === packetDefinition.Name.toLowerCase()
    );
    if (matching.length !== 1) {
      throw new Error(`live custom role definition drift for packet role ${packetDefinition.roleName}.`);
    }
    const expected = normalizedRoleDefinition(packetDefinition, `Packet role ${index}`, true);
    const actual = normalizedRoleDefinition(matching[0], `Live role ${index}`, false);
    if (canonicalJson(actual) !== canonicalJson(expected)) {
      throw new Error(`live custom role definition drift for packet role ${packetDefinition.roleName}.`);
    }
  }

  if (arguments_.mutation === "teardown-closure") {
    requireArguments(arguments_, ["post_delete_teardown_assignment"]);
    const postDelete = await readJsonSnapshot(
      arguments_.post_delete_teardown_assignment,
      "Post-delete teardown assignment snapshot"
    );
    const teardownAssignment = packet.assignments.find(
      (assignment) => assignment.roleName === "SignalDesk SD008 Teardown"
    );
    if (
      teardownAssignment === undefined ||
      postDelete.assignmentId?.toLowerCase() !== teardownAssignment.assignmentId.toLowerCase() ||
      postDelete.state !== "absent" ||
      postDelete.httpStatus !== 404
    ) {
      throw new Error("post-delete teardown assignment is not proven absent by exact ARM lookup.");
    }
  } else if (arguments_.post_delete_teardown_assignment !== undefined) {
    throw new Error("post-delete teardown assignment snapshot is valid only for teardown-closure.");
  }
};

const validatePacket = async (contract, arguments_) => {
  requireArguments(arguments_, [
    "validate_packet",
    "packet_sha256",
    "mutation",
    "now",
    "expected_owner_approval_reference",
    "expected_owner_approval_digest",
    "expected_owner_approved_at",
    "authenticated_azure_client_id",
    "authenticated_principal_object_id",
    "authenticated_principal_type",
    "authenticated_tenant_id",
    "live_role_assignments",
    "live_role_definitions"
  ]);
  if (!SHA256.test(arguments_.packet_sha256)) {
    throw new Error("packet_sha256 must be an exact lowercase SHA-256.");
  }
  if (!SHA256.test(arguments_.expected_owner_approval_digest)) {
    throw new Error("expected_owner_approval_digest must be an exact lowercase SHA-256.");
  }
  exactUtcEpoch(arguments_.expected_owner_approved_at, "expectedOwnerApprovedAt");
  const packetBytes = await readFile(arguments_.validate_packet);
  if (sha256(packetBytes) !== arguments_.packet_sha256) {
    throw new Error("authority packet SHA-256 binding mismatch.");
  }
  const packet = JSON.parse(packetBytes.toString("utf8"));
  if (
    packet.schemaVersion !== 2 ||
    packet.workItem !== "SD-008" ||
    packet.classification !== "owner-controlled-confidential" ||
    packet.contractId !== contract.id ||
    packet.appliesMutation !== false
  ) {
    throw new Error("authority packet contract binding is invalid.");
  }
  const authorization = phaseAuthorization(contract, arguments_);
  if (!UUID.test(arguments_.authenticated_azure_client_id)) {
    throw new Error("authenticated_azure_client_id must be an exact UUID.");
  }
  if (!UUID.test(arguments_.authenticated_principal_object_id)) {
    throw new Error("authenticated_principal_object_id must be an exact UUID.");
  }
  if (!UUID.test(arguments_.authenticated_tenant_id)) {
    throw new Error("authenticated_tenant_id must be an exact UUID.");
  }
  if (arguments_.authenticated_principal_type.toLowerCase() !== "serviceprincipal") {
    throw new Error("authenticated principal type must be servicePrincipal.");
  }
  const scalarBindings = {
    requestedPhase: arguments_.phase,
    sourceCommit: arguments_.source_commit,
    imageDigest: arguments_.image_digest,
    publicationEvidenceDigest: arguments_.publication_evidence_digest,
    sessionRunId: arguments_.session_run_id,
    subscriptionScope: authorization.subscriptionScope,
    resourceGroupScope: authorization.resourceGroupScope
  };
  for (const [field, expected] of Object.entries(scalarBindings)) {
    if (packet[field] !== expected) {
      throw new Error(`${field} binding mismatch.`);
    }
  }
  if (authorization.appScope === undefined) {
    if (Object.hasOwn(packet, "containerAppScope")) {
      throw new Error("containerAppScope is forbidden outside the traffic phase.");
    }
  } else if (packet.containerAppScope !== authorization.appScope) {
    throw new Error("containerAppScope binding mismatch.");
  }
  if (
    packet.ownerApproval?.environment !== authorization.phase.approvalEnvironment ||
    typeof packet.ownerApproval?.reference !== "string" ||
    packet.ownerApproval.reference.length === 0 ||
    !SHA256.test(packet.ownerApproval?.digest ?? "")
  ) {
    throw new Error("owner approval binding is invalid for the requested phase.");
  }
  if (packet.authenticatedIdentity?.clientId !== authorization.azureClientId) {
    throw new Error("azureClientId binding mismatch.");
  }
  if (
    packet.authenticatedIdentity?.principalObjectId !== authorization.principalObjectId ||
    packet.authenticatedIdentity?.tenantId !== authorization.azureTenantId ||
    packet.authenticatedIdentity?.principalType !== "ServicePrincipal"
  ) {
    throw new Error("authenticated principal packet binding mismatch.");
  }
  if (canonicalUuid(arguments_.authenticated_azure_client_id) !== authorization.azureClientId) {
    throw new Error("authenticated Azure client ID binding mismatch.");
  }
  if (
    canonicalUuid(arguments_.authenticated_principal_object_id) !==
    authorization.principalObjectId
  ) {
    throw new Error("authenticated principal object ID binding mismatch.");
  }
  if (canonicalUuid(arguments_.authenticated_tenant_id) !== authorization.azureTenantId) {
    throw new Error("authenticated tenant ID binding mismatch.");
  }
  if (packet.ownerApproval.reference !== arguments_.expected_owner_approval_reference) {
    throw new Error("owner approval reference binding mismatch.");
  }
  if (packet.ownerApproval.digest !== arguments_.expected_owner_approval_digest) {
    throw new Error("owner approval digest binding mismatch.");
  }
  if (packet.ownerApproval.approvedAt !== arguments_.expected_owner_approved_at) {
    throw new Error("owner approval time binding mismatch.");
  }
  if (arguments_.phase === "teardown") {
    requireArguments(arguments_, [
      "expected_prior_traffic_authority_closure_digest",
      "expected_prior_traffic_authority_removed_at"
    ]);
    if (!SHA256.test(arguments_.expected_prior_traffic_authority_closure_digest)) {
      throw new Error("expected_prior_traffic_authority_closure_digest must be an exact lowercase SHA-256.");
    }
    const trafficAuthorityRemovedAtEpoch = exactUtcEpoch(
      arguments_.expected_prior_traffic_authority_removed_at,
      "expectedPriorTrafficAuthorityRemovedAt"
    );
    const issuedAtEpoch = exactUtcEpoch(packet.authorityWindow?.issuedAt, "issuedAt");
    if (issuedAtEpoch <= trafficAuthorityRemovedAtEpoch) {
      throw new Error("teardown authority must be issued after traffic authority removal.");
    }
    if (
      packet.priorPhaseClosure?.phase !== "traffic" ||
      packet.priorPhaseClosure?.evidenceDigest !==
        arguments_.expected_prior_traffic_authority_closure_digest ||
      packet.priorPhaseClosure?.authorityRemovedAt !==
        arguments_.expected_prior_traffic_authority_removed_at
    ) {
      throw new Error("prior traffic authority closure binding mismatch.");
    }
  } else if (Object.hasOwn(packet, "priorPhaseClosure")) {
    throw new Error("priorPhaseClosure is forbidden outside the teardown phase.");
  }
  if (
    canonicalJson(packet.roleDefinitions) !== canonicalJson(authorization.roleDefinitions) ||
    canonicalJson(packet.assignments) !== canonicalJson(authorization.assignments) ||
    canonicalJson(packet.principalBindings) !== canonicalJson([authorization.principalObjectId])
  ) {
    throw new Error("exact principal, role, or scope bindings do not match the requested phase.");
  }
  const expectedPhaseRequirements = {
    preconditions: authorization.phase.preconditions,
    forbiddenConcurrentRoleIds: authorization.phase.forbiddenConcurrentRoleIds,
    ...(authorization.phase.removalOrder === undefined
      ? {}
      : { removalOrder: authorization.phase.removalOrder })
  };
  if (
    canonicalJson(packet.phaseRequirements) !== canonicalJson(expectedPhaseRequirements) ||
    canonicalJson(packet.credentialRequirements) !==
      canonicalJson(contract.justInTimeAuthority.ingressCredential) ||
    canonicalJson(packet.partialBootstrapCompensation) !==
      canonicalJson(contract.justInTimeAuthority.partialBootstrapCompensation)
  ) {
    throw new Error("phase, credential, or compensating-cleanup contract binding mismatch.");
  }
  if (
    packet.authorityWindow?.maximumLeaseMinutes !== contract.justInTimeAuthority.maximumLeaseMinutes ||
    packet.authorityWindow?.providerEnforcedExpiry !== false ||
    packet.authorityWindow?.expiryEvidence !== contract.justInTimeAuthority.assignmentExpiryEvidence ||
    packet.authorityWindow?.expiryEvidenceDetail !== contract.justInTimeAuthority.assignmentExpiryEvidenceDetail ||
    packet.authorityWindow?.automaticRenewal !== false
  ) {
    throw new Error("authority expiry semantics do not match the procedural contract.");
  }
  const window = validateAuthorityWindow(contract, packet, arguments_.mutation, arguments_.now);
  await validateLiveAuthority(packet, arguments_);
  console.log(
    JSON.stringify({
      status: "valid-authority-window",
      phase: arguments_.phase,
      mutation: arguments_.mutation,
      minimumRemainingMinutes: window.minimumRemainingMinutes,
      remainingMinutes: window.remainingMinutes,
      providerEnforcedExpiry: false,
      appliesMutation: false
    })
  );
};

const readStandardInput = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

const decodeArmToken = async () => {
  const token = await readStandardInput();
  if (!JWT.test(token)) {
    throw new Error("ARM access token must be a well-formed JWT.");
  }
  const segments = token.split(".");
  let claims;
  try {
    claims = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("ARM access token must be a well-formed JWT.");
  }
  for (const [claim, label] of [
    ["appid", "client application"],
    ["oid", "object"],
    ["tid", "tenant"]
  ]) {
    if (!UUID.test(claims?.[claim] ?? "")) {
      throw new Error(`ARM access token ${claim} claim is missing or invalid for the ${label} ID.`);
    }
  }
  if (claims.idtyp !== undefined && claims.idtyp !== "app") {
    throw new Error("ARM access token idtyp claim is not app.");
  }
  if (claims.groups !== undefined) {
    if (!Array.isArray(claims.groups) || claims.groups.length !== 0) {
      throw new Error("ARM access token exposes group membership.");
    }
  }
  if (
    claims.hasgroups === true ||
    (claims._claim_names !== null &&
      typeof claims._claim_names === "object" &&
      Object.hasOwn(claims._claim_names, "groups"))
  ) {
    throw new Error("ARM access token exposes group overage.");
  }
  console.log(JSON.stringify({
    clientId: canonicalUuid(claims.appid),
    principalObjectId: canonicalUuid(claims.oid),
    tenantId: canonicalUuid(claims.tid),
    principalType: "ServicePrincipal",
    tokenGroupSignal: "none-exposed"
  }));
};

const main = async () => {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.decode_arm_token !== undefined) {
    if (arguments_.decode_arm_token !== "stdin" || Object.keys(arguments_).length !== 1) {
      throw new Error("--decode-arm-token must be supplied exactly as --decode-arm-token stdin.");
    }
    await decodeArmToken();
    return;
  }
  const contract = await loadContract();
  if (arguments_.validate_packet !== undefined) {
    await validatePacket(contract, arguments_);
    return;
  }
  await renderPacket(contract, arguments_);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`SD-008 authority packet render failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export { exactUtcEpoch, validateAuthorityWindow };
