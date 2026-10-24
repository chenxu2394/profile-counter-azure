using './main.bicep'

var config = loadJsonContent('deployment.config.json')

param location = config.location
param namePrefix = config.namePrefix
param counterIds = config.counterIds
