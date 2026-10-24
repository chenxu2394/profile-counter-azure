#!/usr/bin/env bash
set -euo pipefail

# One-time bootstrap for secretless GitHub Actions -> Azure authentication.
# Run this only after the repository exists on GitHub and has a local remote.

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIRECTORY}/.." && pwd)"
DEPLOYMENT_CONFIG="${DEPLOYMENT_CONFIG:-${REPOSITORY_ROOT}/infra/deployment.config.json}"

for command_name in az gh node; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}" >&2
    exit 1
  fi
done

if ! az account show >/dev/null 2>&1; then
  echo "Sign in to Azure first with: az login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Sign in to GitHub first with: gh auth login" >&2
  exit 1
fi

if [[ ! -f "${DEPLOYMENT_CONFIG}" ]]; then
  echo "Deployment configuration not found: ${DEPLOYMENT_CONFIG}" >&2
  exit 1
fi

read_config_string() {
  node --input-type=commonjs -e '
    const fs = require("node:fs");
    const [path, key] = process.argv.slice(1);
    const value = JSON.parse(fs.readFileSync(path, "utf8"))[key];
    if (typeof value !== "string" || value.length === 0) process.exit(1);
    process.stdout.write(value);
  ' "${DEPLOYMENT_CONFIG}" "$1"
}

if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
  REPOSITORY="${GITHUB_REPOSITORY}"
else
  if ! REPOSITORY="$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null)"; then
    echo "Could not detect the GitHub repository from the current Git remote." >&2
    echo "Add the GitHub remote or set GITHUB_REPOSITORY=owner/repository." >&2
    exit 1
  fi
fi

if [[ ! "${REPOSITORY}" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "GITHUB_REPOSITORY must have the form owner/repository: ${REPOSITORY}" >&2
  exit 1
fi

GITHUB_OWNER="${REPOSITORY%%/*}"
GITHUB_REPOSITORY_NAME="${REPOSITORY#*/}"

if [[ -n "${GITHUB_BRANCH:-}" ]]; then
  DEPLOYMENT_BRANCH="${GITHUB_BRANCH}"
else
  DEPLOYMENT_BRANCH="$(gh repo view "${REPOSITORY}" --json defaultBranchRef --jq '.defaultBranchRef.name')"
fi

AZURE_LOCATION="${AZURE_LOCATION:-$(read_config_string bootstrapLocation)}"
AZURE_NAME_PREFIX="${AZURE_NAME_PREFIX:-$(read_config_string namePrefix)}"
BOOTSTRAP_RESOURCE_GROUP="${BOOTSTRAP_RESOURCE_GROUP:-${AZURE_NAME_PREFIX}-bootstrap-rg}"
APPLICATION_RESOURCE_GROUP="${APPLICATION_RESOURCE_GROUP:-${AZURE_NAME_PREFIX}-rg}"
IDENTITY_NAME="${IDENTITY_NAME:-${AZURE_NAME_PREFIX}-github}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-${AZURE_NAME_PREFIX}-bootstrap}"

if ! gh api "repos/${REPOSITORY}" >/dev/null 2>&1; then
  echo "GitHub repository ${REPOSITORY} does not exist or is not accessible." >&2
  echo "Create and push the repository before running this bootstrap." >&2
  exit 1
fi

OWNER_ID="$(gh api "repos/${REPOSITORY}" --jq '.owner.id')"
REPOSITORY_ID="$(gh api "repos/${REPOSITORY}" --jq '.id')"
GITHUB_SUBJECT="repo:${GITHUB_OWNER}@${OWNER_ID}/${GITHUB_REPOSITORY_NAME}@${REPOSITORY_ID}:ref:refs/heads/${DEPLOYMENT_BRANCH}"

for provider in Microsoft.Web Microsoft.DocumentDB Microsoft.ManagedIdentity; do
  echo "Registering ${provider}..."
  az provider register --namespace "${provider}" --wait
done

echo "Creating Azure/GitHub OIDC trust for ${GITHUB_SUBJECT}..."
az deployment sub create \
  --name "${DEPLOYMENT_NAME}" \
  --location "${AZURE_LOCATION}" \
  --template-file "${REPOSITORY_ROOT}/infra/bootstrap/main.bicep" \
  --parameters \
    location="${AZURE_LOCATION}" \
    bootstrapResourceGroupName="${BOOTSTRAP_RESOURCE_GROUP}" \
    applicationResourceGroupName="${APPLICATION_RESOURCE_GROUP}" \
    identityName="${IDENTITY_NAME}" \
    githubSubject="${GITHUB_SUBJECT}" \
  --only-show-errors \
  --output none

CLIENT_ID="$(az deployment sub show --name "${DEPLOYMENT_NAME}" --query properties.outputs.clientId.value -o tsv)"
TENANT_ID="$(az deployment sub show --name "${DEPLOYMENT_NAME}" --query properties.outputs.tenantId.value -o tsv)"
SUBSCRIPTION_ID="$(az deployment sub show --name "${DEPLOYMENT_NAME}" --query properties.outputs.subscriptionId.value -o tsv)"

printf '%s' "${CLIENT_ID}" | gh secret set AZURE_CLIENT_ID --repo "${REPOSITORY}"
printf '%s' "${TENANT_ID}" | gh secret set AZURE_TENANT_ID --repo "${REPOSITORY}"
printf '%s' "${SUBSCRIPTION_ID}" | gh secret set AZURE_SUBSCRIPTION_ID --repo "${REPOSITORY}"
gh variable set AZURE_RESOURCE_GROUP --body "${APPLICATION_RESOURCE_GROUP}" --repo "${REPOSITORY}"
gh variable set AZURE_DEPLOYMENT_BRANCH --body "${DEPLOYMENT_BRANCH}" --repo "${REPOSITORY}"
gh variable set AZURE_BOOTSTRAPPED --body "true" --repo "${REPOSITORY}"

echo "Bootstrap complete for ${REPOSITORY}:${DEPLOYMENT_BRANCH}."
echo "Run the deployment with: gh workflow run deploy-azure.yml --repo ${REPOSITORY}"
