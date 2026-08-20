targetScope = 'resourceGroup'

@allowed([
  'centralindia'
])
param location string = 'centralindia'

param resourcePrefix string = 'signaldesk-stg-cin'

@description('Exact public GHCR reference ending in @sha256:<64 lowercase hex>.')
param imageReference string

@minLength(40)
@maxLength(40)
param releaseCommit string

param deploymentRunId string
param revisionSuffix string
param entraClientId string
param authorizedProvisionClientId string
param authorizedTrafficClientId string

@secure()
param entraClientSecret string

@secure()
param administratorPassword string

@secure()
param migrationPassword string

@secure()
param runtimePassword string

module network 'network.bicep' = {
  name: 'sd008-network'
  params: {
    location: location
    resourcePrefix: resourcePrefix
  }
}

module observability 'observability.bicep' = {
  name: 'sd008-observability'
  params: {
    location: location
    resourcePrefix: resourcePrefix
  }
}

module identities 'identities.bicep' = {
  name: 'sd008-identities'
  params: {
    location: location
    resourcePrefix: resourcePrefix
  }
}

module database 'database.bicep' = {
  name: 'sd008-database'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    delegatedSubnetId: network.outputs.postgresqlSubnetId
    privateDnsZoneId: network.outputs.postgresqlPrivateDnsZoneId
    deploymentRunId: deploymentRunId
    administratorPassword: administratorPassword
  }
}

module secrets 'secrets.bicep' = {
  name: 'sd008-secrets'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    virtualNetworkId: network.outputs.virtualNetworkId
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    databaseFqdn: database.outputs.serverFqdn
    bootstrapPrincipalId: identities.outputs.bootstrapPrincipalId
    migrationPrincipalId: identities.outputs.migrationPrincipalId
    runtimePrincipalId: identities.outputs.runtimePrincipalId
    deploymentRunId: deploymentRunId
    administratorPassword: administratorPassword
    migrationPassword: migrationPassword
    runtimePassword: runtimePassword
    entraClientSecret: entraClientSecret
  }
}

module containerApps 'container-apps.bicep' = {
  name: 'sd008-container-apps'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    infrastructureSubnetId: network.outputs.containerAppsSubnetId
    logAnalyticsWorkspaceName: observability.outputs.workspaceName
    logAnalyticsCustomerId: observability.outputs.customerId
    imageReference: imageReference
    releaseCommit: releaseCommit
    deploymentRunId: deploymentRunId
    revisionSuffix: revisionSuffix
    entraClientId: entraClientId
    entraTenantId: tenant().tenantId
    authorizedProvisionClientId: authorizedProvisionClientId
    authorizedTrafficClientId: authorizedTrafficClientId
    bootstrapIdentityId: identities.outputs.bootstrapIdentityId
    migrationIdentityId: identities.outputs.migrationIdentityId
    runtimeIdentityId: identities.outputs.runtimeIdentityId
    administratorUrlSecretUri: secrets.outputs.administratorUrlSecretUri
    migrationPasswordSecretUri: secrets.outputs.migrationPasswordSecretUri
    runtimePasswordSecretUri: secrets.outputs.runtimePasswordSecretUri
    migrationUrlSecretUri: secrets.outputs.migrationUrlSecretUri
    runtimeUrlSecretUri: secrets.outputs.runtimeUrlSecretUri
    entraSecretUri: secrets.outputs.entraSecretUri
  }
}

output appName string = containerApps.outputs.appName
output appFqdn string = containerApps.outputs.appFqdn
output bootstrapJobName string = containerApps.outputs.bootstrapJobName
output migrationJobName string = containerApps.outputs.migrationJobName
output logAnalyticsCustomerId string = observability.outputs.customerId
output imageReference string = imageReference
output releaseCommit string = releaseCommit
