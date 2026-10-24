# Development

## Install and test

```bash
npm install
npm install --prefix api
npm test
npm run test:render
npm run validate:bicep
```

- `npm test` runs the API, data-store, health-check, and SVG-renderer unit tests.
- `npm run test:render` regenerates the SVG examples in `docs/preview/`.
- `npm run validate:bicep` compiles `infra/main.bicep` without deploying it.

The unit tests and preview renderer do not require Azure credentials.

## Run the Function API locally

Copy the local Functions settings template and supply Cosmos credentials:

```bash
cp api/local.settings.json.example api/local.settings.json
npm run dev:api
```

Azure Functions Core Tools normally serves:

- `http://localhost:7071/api/views`
- `http://localhost:7071/api/health`

The local settings file is ignored by Git and must not be committed.

## View the static page locally

The page has no build step and makes no counter request. Serve `public/` with any
static file server, for example:

```bash
python3 -m http.server 8000 --directory public
```

Then open `http://localhost:8000`. The API paths shown on the page work only when the
static page and Functions API are served together by Azure Static Web Apps or a local
proxy configured for both.

## Repository layout

```text
api/                         Azure Functions API and Cosmos adapter
docs/                        Focused project documentation and badge previews
infra/deployment.config.json Reusable deployment settings
infra/main.bicep             Application infrastructure
infra/main.bicepparam        Loads the reusable deployment settings
infra/bootstrap/             GitHub OIDC identity and scoped RBAC
public/                      Minimal Static Web App page and routing config
scripts/bootstrap-azure.sh   One-time local trust bootstrap
scripts/render-preview.js    Documentation badge preview generator
scripts/seed.js              Optional counter administration
test/                        Unit tests
```
