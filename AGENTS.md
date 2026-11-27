# AGENTS.md

Repository facts for automated coding assistants. Teams may edit or remove this file.

## Layout
- `backend/` (Java 21, Spring Boot, Maven; Oracle via PL/SQL packages), `frontend/` (Vite, React, Caddy); E2E suite in `frontend/e2e/`
- OpenShift templates (not Helm): `backend/openshift.deploy.yml`, `frontend/openshift.deploy.yml`. No database template: SCS uses the shared Oracle.
- Workflows: `.github/workflows/` (PR deploys via `reusable-deploy.yml`, smoke tests via `reusable-tests.yml`)

## Build, test, run
- Backend (`cd backend`): `mvn clean install` (regenerates OpenAPI code), `mvn test`, `mvn spring-boot:run` (env from `backend/.env.example`)
- Frontend (`cd frontend`): `npm ci`, `npm start` (Vite on :3000, proxies `/api` to :8080), `npm run build`, `npm run lint`, `npm run test:unit`
- E2E (`cd frontend`): `npm run test:e2e` against a running local stack and seeded Oracle; see `frontend/e2e/README.md`
- Containers: `docker compose up` builds and runs both images (Oracle is external)
- Deploys to OpenShift run from GitHub Actions (PR open, merge), not from a workstation

## Shared actions
- Uses bcgov shared actions and workflows (`bcgov/action-*`, `bcgov/actions/*`, `bcgov/actions-openshift/*`, `bcgov/quickstart-openshift-helpers`). Use them as provided; don't copy or fork them.
- Never pin `@main`. Pin bcgov shared actions to a published release SHA with a `# vX.Y.Z` comment.

## Settings
- Automated agents must not change repository or organization settings. Settings changes are made by a person on the team (team-run setup scripts: see #2858).

## Technical overview

The rest of this file is the technical overview carried over from `bcgov-c/nr-scs` (the Polaris/WAR repo), updated for Spring Boot on OpenShift.

### Big picture
- SCS is a split app: a Java 21 Spring Boot backend in `backend/` and a React 19 + Vite frontend in `frontend/`, deployed as two containers.
- This repo is a modernization of the legacy Struts/Java/JSP SCS application; the original code is in `nr-scs-original/nr-scs-main/`.
- Backend is **Spring Boot (jar, embedded Undertow)**. Entry point: `backend/src/main/java/ca/bc/gov/nrs/scs/backend/ScsApiApplication.java`. Everything is one application context (the WAR's root/servlet split is gone).
- API requests live under `/api/*`. In deployed zones the frontend's Caddy serves the SPA (falling back to `index.html` for client routes) and proxies `/api` to the backend; the backend's own SPA forwarding (`WebConfig`, `GlobalApiExceptionHandler`) is now only a fallback.

### Legacy modernization context
- legacy code is git ignored but should be saved locally by the developer under nr-scs-original/ for analysis and comparison while developing
- The legacy app is Struts 1 + Tiles + JSP: `nr-scs-original/nr-scs-main/src/main/webapp/WEB-INF/web.xml` maps `org.apache.struts.action.ActionServlet` to `*.do`, with flows defined in `WEB-INF/struts-config.xml` and `WEB-INF/tiles-defs.xml`.
- When recreating old behavior, trace the legacy chain `ui/action/` -> `ui/form/` -> `domain/bo/` -> `webapp/jsp/`; a representative example is `ui/action/reports/ScalerRegisterAction.java`, `ui/form/reports/ScalerRegisterForm.java`, `domain/bo/ScalerRegisterReportBo.java`, and `jsp/body/reports/scalerRegister.jsp`.
- Use `nr-scs-original/nr-scs-main/src/main/webapp/jsp/common/scsMenu.jsp` to recover original menu labels and grouping when modern navigation looks incomplete.
- Use `nr-scs-original/nr-scs-main/src/main/webapp/WEB-INF/tiles-defs.xml` to understand legacy scaler/scale-site tabs and record subviews.
- Legacy “create” screens may live under `jsp/body/maintain/` rather than a `create/` folder; for example `createScaler.jsp` and `updateScaler.jsp` are both there.

### Backend patterns
- Treat `backend/src/main/resources/openapi/root.yaml` plus `openapi/paths/*.yaml` and `openapi/schemas/*.yaml` as the source of truth.
- Controllers typically implement generated interfaces, e.g. `backend/src/main/java/.../controller/ScalerController.java` implements `ScalerApi`.
- Normal backend flow is controller -> service -> repository -> Oracle PL/SQL package calls; see `ScalerController.java`, `ScalerService.java`, `ScalerRepository.java`.
- Repositories use `JdbcTemplate` + `CallableStatement` against Oracle packages/functions; do not introduce JPA-style data access.
- DB writes commonly pass the authenticated user from `SecurityContextHolder`; see `ScalerRepository.currentUserId()`.
- Keep API errors in the OpenAPI shape `{ code, message }` via `backend/src/main/java/.../exception/GlobalApiExceptionHandler.java`.
- `backend/generated/` is disposable generator output and should not be committed; if you promote a generated class into `src/main/java`, add it to `backend/generated/.openapi-generator-ignore`.
- Declare any `BeanPostProcessor` `@Bean` method `static` (see `WebConfig.methodValidationPostProcessor`). A non-static one instantiates its config class early, and whatever that class injects is created before the auto-proxy creators exist, losing `@Transactional` and method-security proxies. Startup logs `BeanPostProcessorChecker` warnings when this happens; there should be none.

### Backend workflow
- Backend config is `backend/src/main/resources/application.yml`; every deploy-time value is an environment variable (documented in `backend/.env.example`). Local credentials go in a gitignored `application-local.yml` or `backend/.env`, never in `application.yml`.
- The DB is a HikariCP pool (`config/DataSourceConfig.java`, bean `scsDataSource`) built from `spring.datasource.*`: Oracle over TCPS in deployed zones (trust store from the init container in `backend/openshift.deploy.yml`), or `DATABASE_URL` for a plain-TCP local/E2E database.
- Local auth is controlled by `SECURITY_JWT_ENABLED` (`security.jwt.enabled`). Mock auth is refused at startup unless `APP_ENVIRONMENT` is `LOCAL` or `DEV`; never set those on OpenShift.
- From `backend/`, use `mvn clean install` to regenerate/build OpenAPI-backed code, `mvn test` for tests, and `mvn spring-boot:run` to run locally.

### Frontend patterns
- Routes are declared in `frontend/src/routes/routePaths.tsx`
- If a React page’s behavior is unclear, inspect the matching legacy JSP/action first; current page titles, field labels, and sort options often mirror those screens closely.
- Protected pages are wrapped in `frontend/src/routes/ProtectedRoute.tsx`; sign-in goes through `frontend/src/services/keycloak.ts` (oidc-client-ts).
- App-wide providers are composed in `frontend/src/main.tsx` (React Query, preferences, theme, notifications, page title, auth); add cross-cutting state there.
- Service calls are centralized in `frontend/src/services/`; `frontend/src/services/APIs.ts` derives the API base path from `frontend/src/utils/appBasePath.ts` (`/api` in Vite dev mode, context-relative in bundled mode).
- Preserve the offline/PWA request flow in `frontend/src/config/pwa/` rather than bypassing it for cached or queued requests.
- Reports are a full-stack pattern: pages build payloads, call a service, then preview a Blob or queue email; see `frontend/src/pages/Reports/ScalerRegister/index.tsx`, `frontend/src/services/reports.service.ts`, and `backend/src/main/java/.../service/ReportService.java`.
- Runtime routing/base-path behavior is driven by `frontend/src/utils/appBasePath.ts`; the app is served from `/` in every zone, with API calls to `/api` (Vite's `BASE_URL` is the fallback).

### Frontend workflow
- Dev server is on port 3000 and proxies `/api` to `http://localhost:8080`.
- From `frontend/`, common commands are `npm install`, `npm start`, `npm run build`, `npm run lint`, `npm run test:unit`, `npm run test:browser`, and `npm run test:e2e`.
- One `npm install` in `frontend/` covers the app *and* the Playwright E2E suite in `frontend/e2e/` — that suite has no `package.json` of its own (see "End-to-end (E2E) suite" below).
- Use the `@` alias for `./src`; import ordering is enforced by `frontend/eslint.config.js`.

### End-to-end (E2E) suite (`frontend/e2e/`)
- A **BDD** suite: `.feature` files under `frontend/e2e/features/` are the executable spec; `playwright-bdd` (`bddgen`) compiles them into native Playwright tests against the step layer in `frontend/e2e/steps/`. Read `frontend/e2e/README.md` before touching it — it carries the stack start-up order, the seeded Oracle Docker image, and the seed patches.
- **It is not a separate npm package.** Its two deps (`@playwright/test`, `playwright-bdd`) and all its scripts live in `frontend/package.json`; run everything from `frontend/`. Each script passes `--config e2e/playwright.config.ts`, and both Playwright and playwright-bdd resolve relative paths against that config's directory, so generated output stays under `e2e/`.
- Commands (all from `frontend/`): `npm run test:e2e` (everything except `@generation`), `npm run test:e2e:generation` (real Jasper renders, `--workers=1`, **must** stay serial), `npm run test:e2e:all` (both), `npm run test:e2e:headed` / `:ui`, `npm run e2e:bddgen`, `npm run typecheck:e2e`, `npm run e2e:report`.
- It runs against an **already-running** stack — it starts no servers. Bring up the Docker Oracle DB, then the backend on `:8080`, then the frontend on `:3000` with `VITE_MOCK_USER=true`, in that order.
- **Playwright never type-checks** (esbuild strips types). `npm run typecheck:e2e` is the only static gate over `steps/`, `pages/`, `fixtures/`, `preflight/` — run it before a PR.
- Edit `features/` and `steps/`; `e2e/.features-gen/` is regenerated output and is git-ignored. After editing a `.feature`, re-run `npm run e2e:bddgen` — a bare `npx playwright test` reuses the stale generated spec.
- `eslint.config.js` deliberately ignores `e2e/`: it is Node-side test code with its own tsconfig and conventions, gated by `typecheck:e2e` instead.
- Per-UC coverage and defects are tracked **inside each UC folder** (`features/<domain>/<uc>/coverage.md` + `defects.md`), not in a central list — that keeps parallel authoring conflict-free. Legends: `e2e/coverage-guide.md`, `e2e/defects-guide.md`.
- The use-case Gherkin these scenarios are grounded in lives in the team's private planning repository; the suite cites use cases and slices by ID (e.g. `UC-RSK-006-S05`).

### Testing gotchas
- Backend controller tests use standalone MockMvc and must mirror `WebConfig`’s `ObjectMapper` modules (`JsonNullableModule`, `JavaTimeModule`); see `backend/src/test/java/ca/bc/gov/nrs/scs/backend/controller/ScalerControllerTest.java`.
- Generated backend models use `JsonNullable`; forgetting that in tests or manual serialization is a common failure.
- Frontend tests are split between node and browser Vitest projects; browser tests rely on DOM shims in `frontend/src/config/tests/setup-browser.ts`.

### Repository Structure

- **`frontend/`**: React + TypeScript SPA. Uses **Vite** for build and development.
- **`frontend/e2e/`**: Playwright + BDD end-to-end suite (not a separate npm package — see above).
- **`backend/`**: Spring Boot REST API (`scs-backend` jar, container built from `backend/Dockerfile`).
- **`backend/openshift.deploy.yml`, `frontend/openshift.deploy.yml`**: OpenShift templates applied by `.github/workflows/reusable-deploy.yml`.

### Authentication and Authorization (BC Gov SSO / Keycloak, roles from FAM)

Migrated from FAM/Cognito following nr-cbr's pattern.

### Frontend Integration
- **oidc-client-ts**: `frontend/src/services/keycloak.ts` runs Authorization Code + PKCE against the realm (`VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_CLIENT_ID`), with `kc_idp_hint` `azureidir` (IDIR) / `bceidbusiness`. The redirect is `<origin>/authCallback`, handled by `pages/AuthCallback`; every zone's exact URL must be registered on the CSS integration. The API gets the **access** token.
- **Runtime Config**: `config.js` (`window.config`), merged over `import.meta.env` by `src/env.ts`. Written at container start by `frontend/docker-entrypoint.sh` from the Deployment's env vars; locally the values come from `.env.local`.
- **Mock Auth**: Enabled via `VITE_MOCK_USER=true` in `.env.development`.

### Backend Security
- **JWT Validation**: `JWTService` validates the Keycloak access token: signature against `<KEYCLOAK_ISSUER_URI>/protocol/openid-connect/certs`, issuer, and `azp` == `KEYCLOAK_CLIENT_ID` (the realm is shared, so issuer + signature alone do not prove the token was minted for SCS). Identity: `idir_user_guid` / `bceid_user_guid` (principal), `idir_username` / `bceid_username` (audit user id, never a GUID). The CSS integration must map these into the access token.
- **Roles**: Authorities are extracted from `client_roles` (plus `resource_access.<client-id>.roles`, minus FAM `FAM:` bookkeeping entries) and matched against the eleven `SCS_` roles in `constants/Roles.java`. FAM delivers the two external roles client-scoped (`SCS_INDUSTRY_SCALER_<clientNumber>`); the base role becomes the authority and the client number becomes data scope.
- **Permissions**: each role is expanded into functional permissions (`constants/Permissions.java`) by `security/RolePermissions.java`, in the two authentication filters. Permissions are granted as additional authorities alongside the roles.
- **Enforcement, two layers**:
  1. `SecurityConfig.java` gates `/api/**` on holding *any* recognized role — a coarse gate only.
  2. `@RequiresPermission(Permissions.X)` on **every** controller handler decides what that role may do. `ControllerAuthorizationConventionTest` fails the build if a handler is un-annotated, names an unknown permission, or gates a write on a read permission — which is what makes the coarse gate safe.
- **Data scoping** is separate from all of the above: `security/ClientScopeInterceptor` refuses a client-restricted (external) caller any record outside their forest client, on every endpoint taking `scalerLicenceNo`/`scaleSiteIdNmbr`.
- **Frontend**: `context/auth/permissions.ts` mirrors the same matrix; `ProtectedRoute` takes a required permission, `routes/navigation.ts` entries carry one, and `components/PermissionGate` hides in-page controls.
- **Enabled roles**: **all eleven.** The roll-out is complete — there is no longer a "recognized but welcome-only" state, and a role reaching only the welcome page is now a bug rather than a waiting state (`RolePermissionsTest.RollOutComplete` asserts it). `SCS_SYS_ADMIN` is not a hand-authored column at all — it maps straight to `ALL_PERMISSIONS`. The other ten take one of three shapes:
  1. **its own list** — `SCS_INDUSTRY_SCALER`, `SCS_OWNER`, `SCS_CHECK_SCALER`, `SCS_CE_TECHNICIAN`;
  2. **a shared list** — `readOnlyInternalColumn()` for `SCS_CLERICAL` / `SCS_BRANCH_SYS_SUPPORT` / `SCS_REGIONAL_MANAGER`, and `scalingManagerColumn()` for `SCS_DIST_SCALING_MANAGER` / `SCS_REGIONAL_SCALING_MANAGER`, because §3 gives each group identical cells (the `(dist)` / `(rgn)` / `(ltd)` qualifiers that differ are org-unit *breadth*, not permissions);
  3. **a shared list plus one** — `SCS_DIST_MANAGER` is the read-only list ∪ `SCALER_LICENCE_CANCEL`, which §4 gives it and the others not.
- **Where the reasoning lives**: `security/RolePermissions.java`. Every column has a javadoc recording its §3 cells, the §3-vs-§4 conflicts it resolves, and the legacy evidence used — `MenuUtils` role→menu maps and the `webade:ifUserCanPerformAction` gates in `scsMenu.jsp` decided several of them. Read the column before changing it.
- **Risk assessment follows the record it hangs off**, not §3 — the matrix has one risk row and no scaler-subject row at all, so an assessment is treated as another tab and takes the level the role holds on that record's other tabs (full read → query/read; any tab create/update/delete → create/update). **Withheld from the two external roles**: the assessment search and read-by-id are keyed on `riskQuestionnaireId`, so `ClientScopeInterceptor` cannot scope them and an external caller could read any client's assessment by id. `ClientScopeInterceptorTest` fails the build on exactly that, and the class javadoc lists the four endpoints and the scoping work needed to lift the restriction.

### Key Technical Components

- **Startup Warmup**: `WarmUpService.java` primes the database connection pool.
- **JWKS Warmup**: `JWTService.java` eagerly fetches and caches the realm's public keys on startup.
- **Logging**: Spring Boot default logging; levels in `application.yml` (`APP_LOG_LEVEL` for `ca.bc.gov.nrs.scs`).

### OpenAPI + AI Workflow (Backend)

This project uses OpenAPI as the contract and OpenAPI Generator to produce Java API interfaces and model classes.

### Utility and helper reuse guidelines

- Before adding any new utility/helper function, first search `backend/src/main/java` (especially `util/`, `service/`, and `repository/`) for an existing implementation with the same or near-identical behavior.
- Small shared backend helper functions should generally go into `backend/src/main/java/ca/bc/gov/nrs/scs/backend/util/SCSUtils.java` first (for example: blank checks, trim/uppercase normalization, `JsonNullable` unwraps, and date-order validation).
- Prefer reusing or extending an existing shared helper when the logic is an exact or low-level primitive match before introducing any new helper name.
- Do **not** create a new helper with slightly different naming if the behavior already exists; align on the existing shared primitive instead.
- Do **not** create a new utility class for every new concern. Split helpers out of `SCSUtils` only after a persistent, cohesive pattern emerges and the extracted class clearly improves discoverability.
- If you promote a repeated local helper into a shared utility, update the existing call sites in the same slice when practical so duplication does not remain half-migrated.
- Goal: avoid helper proliferation and semantic drift so the codebase does not accumulate duplicate normalization/validation utilities that later require cleanup refactors.

### 1. Goals
- Keep the OpenAPI spec (`root.yaml` + split YAML files) as the **source of truth**.
- Generate stubs/models locally via Maven (`backend/generated/`).
- Only "promote" generated files to hand-maintained source in `backend/src/main/java` when necessary.
- Avoid duplicate class errors by using `backend/generated/.openapi-generator-ignore` for promoted files.

### 2. Standard Workflow
1.  **Draft**: Create new `paths/*.yaml` or `schemas/*.yaml` files based on PL/SQL or business requirements.
2.  **Integrate**: Reference the new files in `backend/src/main/resources/openapi/root.yaml`.
3.  **Generate**: Run `mvn clean install` in the `backend` folder.
4.  **Promote (Optional)**: If custom annotations or complex manual changes are needed, move files from `backend/generated/src/main/java/...` to `backend/src/main/java/...`.
5.  **Ignore**: If promoted, add the file path to `backend/generated/.openapi-generator-ignore` (relative to the `generated` folder).
6.  **Implement**: Create a controller that implements the generated interface and adds the service/repository logic.

### 3. Commit Rules
- **Commit**: YAML spec files, promoted Java code, controller/service implementations.
- **Do NOT Commit**: Anything under `backend/generated/` (these are ignored by Git).

### Troubleshooting

- **Blank Screen**: Ensure `getAppBasePath()` is returning `/` (the app is served from the root in every zone).
- **401 Unauthorized**: the backend's `KEYCLOAK_ISSUER_URI` / `KEYCLOAK_CLIENT_ID` must equal the frontend's `VITE_KEYCLOAK_URL` / `VITE_KEYCLOAK_CLIENT_ID` (the backend logs the `azp` it rejected).
- **404 on Refresh**: Caddy falls back to `index.html` for any path that is not a file and not under `/api` (`frontend/Caddyfile`).
