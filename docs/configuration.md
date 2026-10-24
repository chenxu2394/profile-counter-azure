# Configuration

## Azure deployment values

Edit [`../infra/deployment.config.json`](../infra/deployment.config.json) before
deployment:

| Value | Default | Purpose |
| --- | --- | --- |
| `location` | `westeurope` | Azure region for Cosmos DB and Static Web Apps |
| `namePrefix` | `profile-counter` | Prefix for resource groups, the identity, and the Static Web App |
| `counterIds` | `["default"]` | Publicly accepted counter IDs |

Resource names derived from the Azure subscription and resource group remain stable
across repeat deployments.

## Counter IDs

Public callers cannot create arbitrary Cosmos DB documents. The Function accepts
only IDs listed in `counterIds`. An unknown ID renders a `?` badge without accessing
Cosmos DB.

The default badge does not need a query parameter:

```text
/api/views
```

For multiple independent badges, add their IDs to `counterIds`, redeploy, and select
one in the request:

```text
/api/views?id=project-a
```

## Badge options

| Parameter | Default | Description |
| --- | --- | --- |
| `id` | `default` | Configured counter ID |
| `label` | `Profile views` | Label, limited to 40 characters and XML-escaped |
| `leftColor` | `#555` | Three/six-digit hex or supported named color |
| `rightColor` | `#4c1` | Three/six-digit hex or supported named color |
| `style` | `flat` | `flat` or `flat-square` |

Examples:

```markdown
![Views](https://YOUR_STATIC_WEB_APP.azurestaticapps.net/api/views)
![Views](https://YOUR_STATIC_WEB_APP.azurestaticapps.net/api/views?rightColor=blueviolet)
![Views](https://YOUR_STATIC_WEB_APP.azurestaticapps.net/api/views?style=flat-square&rightColor=blue)
```

![flat default](preview/flat-default.svg)
![flat blueviolet](preview/flat-blueviolet.svg)
![flat square](preview/flat-square-blue.svg)

## Data model

Each counter is one small Cosmos DB document whose `id` is also its partition key:

```json
{
  "id": "default",
  "count": 1
}
```

Existing documents use one server-side Patch `incr` operation. On the first request,
the Function creates the document. If concurrent first requests race, the loser
retries the atomic increment after the Cosmos DB conflict response.

## Inspect or set a counter

This local administration command is optional. Copy the environment template and
insert the Cosmos endpoint and primary key from the Azure portal:

```bash
cp .env.example .env
npm run seed -- --get
npm run seed -- 100
```

Select a non-default counter with `--id`:

```bash
npm run seed -- --id project-a --get
npm run seed -- --id project-a 100
```

Never commit `.env` or `api/local.settings.json`.
