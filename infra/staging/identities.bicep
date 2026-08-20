param location string
param resourcePrefix string

resource bootstrapIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${resourcePrefix}-bootstrap-id'
  location: location
}

resource migrationIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${resourcePrefix}-migration-id'
  location: location
}

resource runtimeIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${resourcePrefix}-runtime-id'
  location: location
}

output bootstrapIdentityId string = bootstrapIdentity.id
output bootstrapPrincipalId string = bootstrapIdentity.properties.principalId
output migrationIdentityId string = migrationIdentity.id
output migrationPrincipalId string = migrationIdentity.properties.principalId
output runtimeIdentityId string = runtimeIdentity.id
output runtimePrincipalId string = runtimeIdentity.properties.principalId
