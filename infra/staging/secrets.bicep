param location string
param resourcePrefix string
param virtualNetworkId string
param privateEndpointSubnetId string
param databaseFqdn string
param bootstrapPrincipalId string
param migrationPrincipalId string
param runtimePrincipalId string
param deploymentRunId string

@secure()
param administratorPassword string

@secure()
param migrationPassword string

@secure()
param runtimePassword string

@secure()
param entraClientSecret string

var keyVaultSecretsUserRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)
var administratorUrl = 'postgresql://signaldesk_admin:${uriComponent(administratorPassword)}@${databaseFqdn}:5432/signaldesk?schema=public&sslmode=require'
var migrationUrl = 'postgresql://signaldesk_migration:${uriComponent(migrationPassword)}@${databaseFqdn}:5432/signaldesk?schema=public&sslmode=require'
var runtimeUrl = 'postgresql://signaldesk_runtime:${uriComponent(runtimePassword)}@${databaseFqdn}:5432/signaldesk?schema=public&sslmode=require'

resource vault 'Microsoft.KeyVault/vaults@2024-11-01' = {
  name: take('sdstg${uniqueString(subscription().id, deploymentRunId)}', 24)
  location: location
  tags: {
    environment: 'staging'
    workItem: 'SD-008'
    deploymentRunId: deploymentRunId
  }
  properties: {
    tenantId: tenant().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Disabled'
  }
}

resource privateDns 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
}

resource dnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: privateDns
  name: '${resourcePrefix}-vault-link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: virtualNetworkId
    }
  }
}

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: '${resourcePrefix}-vault-pe'
  location: location
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: '${resourcePrefix}-vault-connection'
        properties: {
          privateLinkServiceId: vault.id
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

resource dnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = {
  parent: privateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'vault'
        properties: {
          privateDnsZoneId: privateDns.id
        }
      }
    ]
  }
}

resource administratorUrlSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'database-administrator-url'
  properties: {
    value: administratorUrl
  }
}

resource migrationPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'database-migration-password'
  properties: {
    value: migrationPassword
  }
}

resource runtimePasswordSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'database-runtime-password'
  properties: {
    value: runtimePassword
  }
}

resource migrationUrlSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'database-migration-url'
  properties: {
    value: migrationUrl
  }
}

resource runtimeUrlSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'database-runtime-url'
  properties: {
    value: runtimeUrl
  }
}

resource entraSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'entra-client-secret'
  properties: {
    value: entraClientSecret
  }
}

resource bootstrapAdministratorGrant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(administratorUrlSecret.id, bootstrapPrincipalId, keyVaultSecretsUserRoleId)
  scope: administratorUrlSecret
  properties: {
    principalId: bootstrapPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource bootstrapMigrationPasswordGrant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(migrationPasswordSecret.id, bootstrapPrincipalId, keyVaultSecretsUserRoleId)
  scope: migrationPasswordSecret
  properties: {
    principalId: bootstrapPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource bootstrapRuntimePasswordGrant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(runtimePasswordSecret.id, bootstrapPrincipalId, keyVaultSecretsUserRoleId)
  scope: runtimePasswordSecret
  properties: {
    principalId: bootstrapPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource migrationUrlGrant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(migrationUrlSecret.id, migrationPrincipalId, keyVaultSecretsUserRoleId)
  scope: migrationUrlSecret
  properties: {
    principalId: migrationPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource runtimeUrlGrant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(runtimeUrlSecret.id, runtimePrincipalId, keyVaultSecretsUserRoleId)
  scope: runtimeUrlSecret
  properties: {
    principalId: runtimePrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource entraSecretGrant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(entraSecret.id, runtimePrincipalId, keyVaultSecretsUserRoleId)
  scope: entraSecret
  properties: {
    principalId: runtimePrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

output administratorUrlSecretUri string = administratorUrlSecret.properties.secretUri
#disable-next-line outputs-should-not-contain-secrets
output migrationPasswordSecretUri string = migrationPasswordSecret.properties.secretUri
#disable-next-line outputs-should-not-contain-secrets
output runtimePasswordSecretUri string = runtimePasswordSecret.properties.secretUri
output migrationUrlSecretUri string = migrationUrlSecret.properties.secretUri
output runtimeUrlSecretUri string = runtimeUrlSecret.properties.secretUri
output entraSecretUri string = entraSecret.properties.secretUri
