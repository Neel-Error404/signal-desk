import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_NAME = /^[A-Za-z0-9][A-Za-z0-9._()-]{0,89}$/;

const parseArguments = (arguments_) => {
  const values = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !name.startsWith("--") || value === undefined) {
      throw new Error("Every authority renderer argument must use --name value.");
    }
    values[name.slice(2).replaceAll("-", "_")] = value;
  }
  return values;
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

const delegationCondition = ({ provisionPrincipalId, resourceGroupScope }) => {
  const allowedRole = "4633458b-17de-408a-b874-0445c86b69e6";
  const vaultPrefix = `${resourceGroupScope}/providers/Microsoft.KeyVault/vaults/`;
  return `((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR ((@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {${allowedRole}}) AND (@Request[Microsoft.Authorization/roleAssignments:PrincipalId] ForAnyOfAnyValues:GuidNotEquals {${provisionPrincipalId}}) AND (@Request[Microsoft.Authorization/roleAssignments:RoleAssignmentScope] StringStartsWithIgnoreCase '${vaultPrefix}'))) AND ((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR ((@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {${allowedRole}}) AND (@Resource[Microsoft.Authorization/roleAssignments:RoleAssignmentScope] StringStartsWithIgnoreCase '${vaultPrefix}')))`;
};

const main = async () => {
  const arguments_ = parseArguments(process.argv.slice(2));
  for (const required of [
    "subscription_id",
    "provision_principal_object_id",
    "traffic_principal_object_id",
    "teardown_principal_object_id",
    "resource_group",
    "container_app",
    "output"
  ]) {
    if (arguments_[required] === undefined) {
      throw new Error(`--${required.replaceAll("_", "-")} is required.`);
    }
  }
  for (const field of [
    "subscription_id",
    "provision_principal_object_id",
    "traffic_principal_object_id",
    "teardown_principal_object_id"
  ]) {
    if (!UUID.test(arguments_[field])) {
      throw new Error(`${field} must be an exact UUID.`);
    }
  }
  if (!RESOURCE_NAME.test(arguments_.resource_group) || !RESOURCE_NAME.test(arguments_.container_app)) {
    throw new Error("Resource group and Container App names are invalid.");
  }
  const contract = JSON.parse(
    await readFile("delivery/sd008-azure-authority-contract.json", "utf8")
  );
  if (contract.status !== "ratified-local-implementation") {
    throw new Error("The SD-008 Azure authority contract is not ratified for local implementation.");
  }
  const subscriptionScope = `/subscriptions/${arguments_.subscription_id.toLowerCase()}`;
  const resourceGroupScope = `${subscriptionScope}/resourceGroups/${arguments_.resource_group}`;
  const appScope = `${resourceGroupScope}/providers/Microsoft.App/containerApps/${arguments_.container_app}`;
  const principalByName = {
    "signaldesk-sd008-provision": arguments_.provision_principal_object_id.toLowerCase(),
    "signaldesk-sd008-traffic": arguments_.traffic_principal_object_id.toLowerCase(),
    "signaldesk-sd008-teardown": arguments_.teardown_principal_object_id.toLowerCase()
  };
  const scopeByBoundary = {
    "exact-resource-group": resourceGroupScope,
    "exact-container-app": appScope,
    "subscription-read-only": subscriptionScope
  };
  const namespace = uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", arguments_.subscription_id);
  const roleDefinitions = contract.roles.map((role) => ({
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
  const assignments = contract.roles.map((role) => {
    const assignment = {
      roleName: role.name,
      roleDefinitionId: `${subscriptionScope}/providers/Microsoft.Authorization/roleDefinitions/${uuidV5(namespace, role.id)}`,
      principalObjectId: principalByName[role.principal],
      scope: scopeByBoundary[role.assignmentScope],
      principalType: "ServicePrincipal"
    };
    if (role.id === "sd008-provision-v1") {
      assignment.conditionVersion = "2.0";
      assignment.condition = delegationCondition({
        provisionPrincipalId: principalByName[role.principal],
        resourceGroupScope
      });
    }
    return assignment;
  });
  const packet = {
    schemaVersion: 1,
    classification: "owner-controlled-confidential",
    workItem: "SD-008",
    contractId: contract.id,
    subscriptionScope,
    resourceGroupScope,
    containerAppScope: appScope,
    roleDefinitions,
    assignments,
    temporalRequirements: {
      provisionRemovedBeforeTrafficApproval: true,
      trafficAssignmentCreatedOnlyAfterExactAppExists: true,
      postDeleteVerifierRemovedAfterEvidence: true
    },
    appliesMutation: false
  };
  const packetText = `${JSON.stringify(packet, null, 2)}\n`;
  await writeFile(arguments_.output, packetText, { encoding: "utf8", flag: "wx" });
  console.log(
    JSON.stringify({
      status: "rendered-non-mutating-authority-packet",
      roleDefinitions: roleDefinitions.length,
      assignments: assignments.length,
      packetSha256: sha256(Buffer.from(packetText, "utf8")),
      appliesMutation: false
    })
  );
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`SD-008 authority packet render failed: ${error.message}`);
    process.exitCode = 1;
  });
}
