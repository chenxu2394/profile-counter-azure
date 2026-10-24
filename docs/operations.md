# Operations

## What the badge counts

The counter increments once per request that reaches Azure. A badge embedded on
GitHub does not measure every human profile visit because GitHub serves external
images through its Camo privacy proxy. A reader normally requests GitHub's anonymized
image URL; Camo requests the Azure badge URL when it needs a fresh copy and can serve
that copy to multiple readers. Multiple visits can therefore share one origin request.

Direct requests to the Azure endpoint increment immediately. Exact human profile-view
measurement is not possible from a GitHub README image.

## Health checks and warm-up probes

`GET /api/health` performs a read-only Cosmos DB point lookup. It never creates or
increments a counter.

- Healthy: `204 No Content` and `X-Health-Status: ok`.
- Cosmos unavailable: `503 Service Unavailable`.

An always-on device can request this endpoint every 10–15 minutes
as a best-effort warm-up probe:

```bash
curl --fail --silent --show-error --output /dev/null \
  "https://YOUR_STATIC_WEB_APP.azurestaticapps.net/api/health"
```

This often reduces cold starts, but the Static Web Apps managed Function runs on a
Consumption-style service and Azure may still recycle it. Requesting the static
homepage does not warm the Function.

## Cost controls

The Bicep template deliberately uses:

- Static Web Apps Free.
- Cosmos DB provisioned throughput with `enableFreeTier: true`.
- One region.
- Fixed 400 RU/s database throughput.
- A 1,000 RU/s account-level throughput limit.
- An allow-list that prevents arbitrary counter-document creation.

Cosmos DB permits only one Free Tier account per Azure subscription, and the discount
must be selected when the account is created. Storage beyond the free allowance can
still be billed. Azure budgets and billing alerts are advisable, but they notify
rather than stop consumption.

## Reinitializing or republishing the repository

Removing the local `.git` directory does not change Azure or GitHub. The Bicep
deployments are idempotent when you keep the same Azure subscription, application
resource group, and `namePrefix`.

After attaching the files to a GitHub repository again, rerun:

```bash
./scripts/bootstrap-azure.sh
```

This is required when the GitHub repository is new or was deleted and recreated,
even if its owner and name are unchanged. GitHub assigns it a new immutable repository
ID, so the Azure federated credential must be updated. The bootstrap also writes the
workflow settings to the current repository. Updating the credential invalidates the
old repository's Azure trust.

## Troubleshooting

### The workflow is skipped

Run `./scripts/bootstrap-azure.sh`. It sets `AZURE_BOOTSTRAPPED=true` only after the
OIDC identity and GitHub settings are ready. Also check that the workflow is running
on the branch stored in the `AZURE_DEPLOYMENT_BRANCH` repository variable.

### Azure login reports no matching federated credential

Rerun the bootstrap from a checkout connected to the intended GitHub repository. It
uses the immutable GitHub owner and repository IDs and the configured branch to build
the exact OIDC subject.

### The badge shows `?`

Inspect the `X-Counter-Status` response header:

- `unknown-id`: add the ID to `infra/deployment.config.json` and redeploy.
- `storage-error`: inspect managed Function logs and verify the Cosmos settings.

### The direct URL increments but GitHub does not change

This is normally GitHub's Camo image cache. The Azure origin cannot force one request
per profile visit.

### Bicep says Free Tier is already in use

Only one Cosmos DB Free Tier account is allowed per Azure subscription. Reuse or
remove the existing free-tier account, or choose another subscription. Do not disable
`enableFreeTier` if the goal is a zero-cost deployment.
