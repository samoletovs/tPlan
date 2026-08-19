// ──────────────────────────────────────────────────────────────────────
// tPlan — Infrastructure
//
// Resources:
//   - Azure Static Web App (Free tier)
//   - Azure Storage Account (Table Storage for data)
//   - Application Insights + Log Analytics
//
// Deploy:
//   az deployment group create \
//     --resource-group tplan-rg \
//     --template-file infrastructure/main.bicep
// ──────────────────────────────────────────────────────────────────────

targetScope = 'resourceGroup'

@description('Azure region')
param location string = 'northeurope'

@description('Environment name')
param environment string = 'production'

var projectName = 'tplan'
var tags = {
  project: projectName
  environment: environment
  managedBy: 'bicep'
}

// ── Static Web App ────────────────────────────────────────────────
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${projectName}-swa'
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
  }
}

// ── Storage Account (Table Storage) ───────────────────────────────
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${projectName}storage'
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

// ── Tables ────────────────────────────────────────────────────────
// Declared so the account can be rebuilt from scratch. Until now the tables existed
// only because someone created them by hand, which meant a fresh deployment came up
// with an API that fails on first write.
resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource tables 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = [
  for tableName in [
    'tplanUsers'
    'tplanLogs'
    'tplanWorkouts'
    'tplanPrograms'
    'tplanSchedules'
    'tplanMemory'
  ]: {
    parent: tableService
    name: tableName
  }
]

// ── Monitoring ────────────────────────────────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${projectName}-law'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: json('0.1') }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${projectName}-ai'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ── Outputs ───────────────────────────────────────────────────────
output swaDefaultHostname string = staticWebApp.properties.defaultHostname
output swaName string = staticWebApp.name
output storageAccountName string = storageAccount.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
