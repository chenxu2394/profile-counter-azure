targetScope = 'subscription'

@description('Region for the bootstrap and application resource groups.')
param location string

@description('Resource group containing only the GitHub deployment identity.')
param bootstrapResourceGroupName string

@description('Resource group managed by the GitHub Actions identity.')
param applicationResourceGroupName string

@description('Exact GitHub OIDC subject calculated by the bootstrap script.')
param githubSubject string

@description('Name of the managed identity used by GitHub Actions.')
param identityName string = 'github-deployment'

resource bootstrapResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: bootstrapResourceGroupName
  location: location
}

resource applicationResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: applicationResourceGroupName
  location: location
}

module githubIdentity './identity.bicep' = {
  name: 'github-deployment-identity'
  scope: bootstrapResourceGroup
  params: {
    identityName: identityName
    githubSubject: githubSubject
  }
}

var contributorRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'b24988ac-6180-42a0-ab88-20f7382dd24c'
)

module applicationContributor './role-assignment.bicep' = {
  name: 'github-application-contributor'
  scope: applicationResourceGroup
  params: {
    principalId: githubIdentity.outputs.principalId
    roleDefinitionId: contributorRoleDefinitionId
    roleAssignmentName: guid(applicationResourceGroup.id, identityName, contributorRoleDefinitionId)
  }
}

output clientId string = githubIdentity.outputs.clientId
output principalId string = githubIdentity.outputs.principalId
output tenantId string = tenant().tenantId
output subscriptionId string = subscription().subscriptionId
output applicationResourceGroupName string = applicationResourceGroup.name
