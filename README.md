[![Merge](https://github.com/bcgov/nr-scs/actions/workflows/merge.yml/badge.svg)](https://github.com/bcgov/nr-scs/actions/workflows/merge.yml)
[![Analysis](https://github.com/bcgov/nr-scs/actions/workflows/analysis.yml/badge.svg)](https://github.com/bcgov/nr-scs/actions/workflows/analysis.yml)

# Scale Administration and Control System (SCS)

SCS supports the ministry's administrative and data control requirements for scale sites, scalers,
and mark/site designations. This is the modernized application (React frontend, Spring Boot
backend), deployed to OpenShift with the BC Gov [quickstart-openshift](https://github.com/bcgov/quickstart-openshift)
pipeline. It was moved here from `bcgov-c/nr-scs`, where it was a single WAR deployed to on-prem
Tomcat by the Polaris pipeline.

## Architecture

- **Frontend** (`frontend/`): React 19 + TypeScript SPA built with Vite, served by Caddy with the
  Coraza WAF. Caddy also proxies `/api` to the backend, so the browser talks to one origin.
- **Backend** (`backend/`): Java 21 Spring Boot REST API. OpenAPI-first: the spec in
  `backend/src/main/resources/openapi/` generates the API interfaces and models. Data access is
  `JdbcTemplate` calls to Oracle PL/SQL packages.
- **Database**: the shared ministry Oracle database (no database is deployed by this repo),
  reached over TCPS.
- **Integrations**: JasperReports Server (reports), CHES (email), FAM/Cognito (sign-in; moving to
  BC Gov SSO Keycloak).
- **End-to-end tests** (`frontend/e2e/`): a BDD browser suite (Gherkin + Playwright) that drives a
  running stack against a seeded Oracle.

See [AGENTS.md](./AGENTS.md) for the technical overview: routing, security model, OpenAPI workflow
and conventions.

## Local development

Prerequisites: Java 21+, Maven 3.9+, Node.js 22+, and access to an Oracle database (the seeded
Oracle container described in [frontend/e2e/README.md](./frontend/e2e/README.md) works).

### Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL / DATABASE_USER / DATABASE_PASSWORD
set -a; . ./.env; set +a
mvn clean install             # generates the OpenAPI code, builds, runs the tests
mvn spring-boot:run           # http://localhost:8080
```

`.env.example` runs mock auth (`SECURITY_JWT_ENABLED=false`, `APP_ENVIRONMENT=LOCAL`). The backend
refuses to start in mock mode under any other environment value.

### Frontend

```bash
cd frontend
npm install
npm start                     # http://localhost:3000, proxies /api to :8080
```

Set `VITE_MOCK_USER=true` in `frontend/.env.local` to use the mock user (see `.env.example`).

### Containers

`docker compose up --build` builds and runs both images, the same ones OpenShift runs. Oracle stays
external; configure it in `backend/.env`.

## Testing

| Suite | Where | Command |
|---|---|---|
| Backend (JUnit + MockMvc) | `backend/src/test/java/**` | `mvn test` (from `backend/`) |
| Frontend unit (Vitest, node) | `frontend/src/**/*.unit.test.{ts,tsx}` | `npm run test:unit` (from `frontend/`) |
| Frontend component (Vitest, browser) | `frontend/src/**/*.browser.test.{ts,tsx}` | `npm run test:browser` |
| End-to-end (Gherkin + Playwright) | `frontend/e2e/` | `npm run test:e2e`; read [frontend/e2e/README.md](./frontend/e2e/README.md) first |

## Deployment

GitHub Actions deploys every pull request to its own preview in the DEV namespace
(`nr-scs-<PR>.apps.gold.devops.gov.bc.ca`, OpenShift Gold), then on merge to TEST and, after the TEST smoke
tests pass, to PROD. Workflows are in `.github/workflows/` and described in the
[quickstart-openshift README](https://github.com/bcgov/quickstart-openshift#workflows).

### Secrets and variables

Set per GitHub environment (`dev`, `test`, `prod`). How to create `oc_token` and the other generic
values is in the [quickstart-openshift README](https://github.com/bcgov/quickstart-openshift#secrets-and-variables).

| Secret | Purpose |
|---|---|
| `oc_namespace`, `oc_token` | OpenShift namespace and deployer token |
| `database_host`, `database_service_name` | Oracle listener (TCPS, port 1543) |
| `database_user`, `database_password` | Oracle proxy account |
| `keystore_secret` | Passphrase for the Oracle TCPS trust store built at pod start |
| `jasper_server_username`, `jasper_server_password` | JasperReports Server account |
| `ches_client_id`, `ches_client_secret` | CHES service client (only when `MAIL_ENABLED=true`) |
| `sonar_token_backend`, `sonar_token_frontend` | SonarCloud (optional) |

| Variable | Purpose |
|---|---|
| `oc_server` | OpenShift API server |
| `COGNITO_USER_POOL_ID`, `COGNITO_USER_POOL_CLIENT_ID`, `COGNITO_OAUTH_DOMAIN`, `COGNITO_REGION` | FAM/Cognito sign-in. The backend validates tokens against the same pool and client id. Temporary: being replaced by Keycloak |
| `JASPER_SERVER_LOGIN_URL`, `JASPER_SERVER_FETCH_URL` | JasperReports Server REST endpoints |
| `MAIL_ENABLED`, `CHES_EMAIL_URL`, `CHES_TOKEN_URL`, `CHES_FROM_EMAIL` | Email delivery (off unless `MAIL_ENABLED=true`) |
| `SONAR_PROJECT_KEY_BACKEND`, `SONAR_PROJECT_KEY_FRONTEND` | SonarCloud project keys (optional) |
| `ROUTE_HOST` | PROD vanity hostname (optional, repository variable). `cert-keeper.yml` issues and renews its Let's Encrypt certificate |

## License

Copyright 2026 Province of British Columbia

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in
compliance with the License. You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is
distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing permissions and limitations under the
License.
