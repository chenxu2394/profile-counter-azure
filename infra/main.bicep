targetScope = 'resourceGroup'

@description('Azure region for Cosmos DB and the Static Web App managed API.')
param location string

@description('Short prefix used in Azure resource names.')
@minLength(3)
@maxLength(20)
param namePrefix string

@description('Counter IDs that the public endpoint is allowed to update.')
@minLength(1)
param counterIds array

var resourceToken = uniqueString(subscription().subscriptionId, resourceGroup().id)
var cosmosAccountName = 'pc-${resourceToken}'
var staticWebAppName = '${namePrefix}-${take(resourceToken, 8)}'
var databaseName = 'profile-counter'
var containerName = 'counters'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: true
    publicNetworkAccess: 'Enabled'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    disableLocalAuth: false
    minimalTlsVersion: 'Tls12'
    capacity: {
      // The lifetime free tier covers 1,000 RU/s. This hard cap prevents an
      // accidental configuration change from provisioning beyond that amount.
      totalThroughputLimit: 1000
    }
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
    options: {
      throughput: 400
    }
  }
}

resource counters 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: containerName
  properties: {
    resource: {
      id: containerName
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
        version: 2
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
    options: {}
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2024-11-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
  }
}

resource managedApiSettings 'Microsoft.Web/staticSites/config@2024-11-01' = {
  parent: staticWebApp
  name: 'functionappsettings'
  kind: 'config'
  properties: {
    COSMOS_ENDPOINT: cosmosAccount.properties.documentEndpoint
    COSMOS_KEY: cosmosAccount.listKeys().primaryMasterKey
    COSMOS_DATABASE_ID: databaseName
    COSMOS_CONTAINER_ID: containerName
    COUNTER_IDS: join(counterIds, ',')
  }
}

output staticWebAppName string = staticWebApp.name
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output cosmosAccountName string = cosmosAccount.name
output allowedCounterIds array = counterIds
