# Deployment

This guide creates the Azure resources and connects GitHub Actions to Azure without
a long-lived client secret.

## Prerequisites

- An Azure subscription eligible for the Cosmos DB Free Tier discount.
- Azure CLI with Bicep support.
- GitHub CLI.
- Node.js 22.
- Permission to create Azure resource groups, managed identities, and role assignments.
- Azure Functions Core Tools 4 only if you plan to run the API locally.

## 1. Review the Azure defaults

The reusable values are in [`../infra/deployment.config.json`](../infra/deployment.config.json):

```json
{
  "location": "eastus2",
  "bootstrapLocation": "westeurope",
  "namePrefix": "profile-counter",
  "counterIds": ["default"]
}
```

Choose the application location before the first deployment. Keep
`bootstrapLocation` unchanged after bootstrap because it records the location of
the resource groups and deployment identity. See [Configuration](configuration.md)
for the meaning of each value.

## 2. Check the repository locally

```bash
npm install
npm install --prefix api
npm test
npm run test:render
npm run validate:bicep
```

Unit tests and badge rendering do not need Azure credentials. Bicep validation
requires the Azure CLI but does not deploy resources.

## 3. Push to GitHub

The deployment workflow is guarded, so the first push cannot deploy before the
bootstrap has completed.

```bash
git add .
git commit -m "Initial Azure profile counter"
gh repo create YOUR_REPOSITORY --private --source=. --remote=origin --push
```

The repository can be private or public. The bootstrap uses its current GitHub
identity rather than a username hard-coded in this project.

## 4. Bootstrap GitHub access to Azure

Authenticate locally:

```bash
az login
gh auth login
```

Select the intended subscription if needed:

```bash
az account set --subscription "YOUR_SUBSCRIPTION_ID_OR_NAME"
```

Then run:

```bash
./scripts/bootstrap-azure.sh
```

With the default prefix, the script idempotently creates:

- `profile-counter-bootstrap-rg`, containing the GitHub deployment identity.
- `profile-counter-rg`, containing the application resources.
- A federated credential restricted to the detected repository and its default
  branch (normally `main`).
- A `Contributor` assignment scoped only to the application resource group.
- The GitHub secrets and variables required by the workflow.

The GitHub secrets contain Azure identity identifiers, not a client secret. At
deployment time, GitHub exchanges its OIDC token for a short-lived Azure token.

## 5. Deploy

```bash
gh workflow run deploy-azure.yml
gh run watch
```

Later pushes to the configured deployment branch deploy automatically only when they
change `api/`, `public/`, or the application infrastructure in `infra/`. Changes to
the bootstrap templates in `infra/bootstrap/` do not deploy the application. The
workflow can always be started manually when needed. It:

1. Installs dependencies and runs the tests.
2. Authenticates to Azure through OIDC.
3. Previews the Bicep changes with `what-if`.
4. Deploys the infrastructure in `infra/main.bicep`.
5. Reads the Static Web Apps deployment token at runtime.
6. Deploys `public/` and the managed Function API in `api/`.

The first Cosmos DB deployment can take several minutes.

## 6. Verify

Find the generated hostname in the workflow output or Azure portal, then request
the badge several times:

```bash
curl -i "https://YOUR_STATIC_WEB_APP.azurestaticapps.net/api/views"
```

A successful response includes:

```text
HTTP/2 200
content-type: image/svg+xml; charset=utf-8
x-counter-status: ok
cache-control: no-store, no-cache, must-revalidate, max-age=0
```

The SVG's `aria-label` value should increase on each direct request.

Check the Function host and Cosmos DB without changing the counter:

```bash
curl --fail --silent --show-error --output /dev/null \
  "https://YOUR_STATIC_WEB_APP.azurestaticapps.net/api/health"
```

The healthy response is `204 No Content` with `X-Health-Status: ok`.

## 7. Add the badge

```markdown
![Profile views](https://YOUR_STATIC_WEB_APP.azurestaticapps.net/api/views)
```

GitHub may show a cached value until its Camo proxy refreshes the image.
