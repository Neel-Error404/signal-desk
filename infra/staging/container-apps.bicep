param location string
param resourcePrefix string
param infrastructureSubnetId string
param logAnalyticsWorkspaceName string
param logAnalyticsCustomerId string
param imageReference string
param releaseCommit string
param deploymentRunId string
param revisionSuffix string
param entraClientId string
param entraTenantId string
param authorizedProvisionClientId string
param authorizedTrafficClientId string
param bootstrapIdentityId string
param migrationIdentityId string
param runtimeIdentityId string
param administratorUrlSecretUri string
param migrationPasswordSecretUri string
param runtimePasswordSecretUri string
param migrationUrlSecretUri string
param runtimeUrlSecretUri string
param entraSecretUri string

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsWorkspaceName
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${resourcePrefix}-environment'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: infrastructureSubnetId
      internal: false
    }
    zoneRedundant: false
  }
}

resource bootstrapJob 'Microsoft.App/jobs@2024-03-01' = {
  name: '${resourcePrefix}-dbinit'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${bootstrapIdentityId}': {}
    }
  }
  properties: {
    environmentId: environment.id
    configuration: {
      replicaRetryLimit: 0
      replicaTimeout: 600
      triggerType: 'Manual'
      manualTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
      }
      secrets: [
        {
          name: 'database-administrator-url'
          keyVaultUrl: administratorUrlSecretUri
          identity: bootstrapIdentityId
        }
        {
          name: 'database-migration-password'
          keyVaultUrl: migrationPasswordSecretUri
          identity: bootstrapIdentityId
        }
        {
          name: 'database-runtime-password'
          keyVaultUrl: runtimePasswordSecretUri
          identity: bootstrapIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'database-role-bootstrap'
          image: imageReference
          command: [
            'node'
          ]
          args: [
            'scripts/bootstrap-database-roles.mjs'
          ]
          env: [
            {
              name: 'DATABASE_ADMIN_URL'
              secretRef: 'database-administrator-url'
            }
            {
              name: 'SIGNALDESK_MIGRATION_PASSWORD'
              secretRef: 'database-migration-password'
            }
            {
              name: 'SIGNALDESK_RUNTIME_PASSWORD'
              secretRef: 'database-runtime-password'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
}

resource migrationJob 'Microsoft.App/jobs@2024-03-01' = {
  name: '${resourcePrefix}-migrate'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${migrationIdentityId}': {}
    }
  }
  properties: {
    environmentId: environment.id
    configuration: {
      replicaRetryLimit: 0
      replicaTimeout: 900
      triggerType: 'Manual'
      manualTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
      }
      secrets: [
        {
          name: 'database-migration-url'
          keyVaultUrl: migrationUrlSecretUri
          identity: migrationIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'prisma-migration'
          image: imageReference
          command: [
            'node'
          ]
          args: [
            'node_modules/prisma/build/index.js'
            'migrate'
            'deploy'
          ]
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-migration-url'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${resourcePrefix}-app'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${runtimeIdentityId}': {}
    }
  }
  properties: {
    environmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        allowInsecure: false
        external: true
        targetPort: 3000
        transport: 'http'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      secrets: [
        {
          name: 'database-runtime-url'
          keyVaultUrl: runtimeUrlSecretUri
          identity: runtimeIdentityId
        }
        {
          name: 'entra-client-secret'
          keyVaultUrl: entraSecretUri
          identity: runtimeIdentityId
        }
      ]
    }
    template: {
      revisionSuffix: revisionSuffix
      containers: [
        {
          name: 'signaldesk'
          image: imageReference
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-runtime-url'
            }
            {
              name: 'SIGNALDESK_RELEASE_COMMIT'
              value: releaseCommit
            }
            {
              name: 'SIGNALDESK_IMAGE_DIGEST'
              value: last(split(imageReference, '@'))
            }
            {
              name: 'SIGNALDESK_DEPLOYMENT_RUN_ID'
              value: deploymentRunId
            }
            {
              name: 'SIGNALDESK_REVISION'
              value: revisionSuffix
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/v1/health/live'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 15
              timeoutSeconds: 3
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/v1/health/ready'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              timeoutSeconds: 3
              failureThreshold: 3
              successThreshold: 1
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

resource authentication 'Microsoft.App/containerApps/authConfigs@2024-03-01' = {
  parent: app
  name: 'current'
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      unauthenticatedClientAction: 'Return401'
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraClientId
          clientSecretSettingName: 'entra-client-secret'
          openIdIssuer: '${az.environment().authentication.loginEndpoint}${entraTenantId}/v2.0'
        }
        validation: {
          allowedAudiences: [
            'api://${entraClientId}'
          ]
          defaultAuthorizationPolicy: {
            allowedApplications: [
              entraClientId
              authorizedProvisionClientId
              authorizedTrafficClientId
            ]
          }
        }
      }
    }
    httpSettings: {
      requireHttps: true
      routes: {
        apiPrefix: '/.auth'
      }
    }
  }
}

output appName string = app.name
output appFqdn string = app.properties.configuration.ingress.fqdn
output bootstrapJobName string = bootstrapJob.name
output migrationJobName string = migrationJob.name
