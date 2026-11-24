# SCS E2E (BDD — Gherkin + Playwright via playwright-bdd)

Browser-automation end-to-end tests for the modernized SCS app, driven against a **running local
stack** (Vite frontend → Spring backend → Docker Oracle DB).

**Where this lives.** `nr-scs/frontend/e2e/`. The suite has no `package.json` of its own — its two
dependencies (`@playwright/test`, `playwright-bdd`) and every `test:e2e*` script live in
`nr-scs/frontend/package.json`, so **one `npm install` in `frontend/` sets up both the app and this
suite**. Run everything from `nr-scs/frontend/`; each script passes `--config e2e/playwright.config.ts`,
and both Playwright and playwright-bdd resolve relative paths against that config's directory, so all
generated output still lands under `e2e/`.

This is a **BDD suite**: `.feature` files are the executable spec, `playwright-bdd` (`bddgen test`)
compiles them into native Playwright tests, and a reusable step layer implements the Gherkin against
page objects. The scenarios are re-grounded from the use-case **Gherkin**
(the UC-CHK use-case Gherkin — the planning
repo, a **separate** checkout from this one): that Gherkin defines
*what* each screen must do (authored from the legacy app); here the routes, fields, and input values are
pinned to the *new* app and the *seeded* DB.

## Layout — organized by domain, then use case

Every artifact lives under its **domain** (3-letter subject code: `chk`, `ins`, `msd`, …) and then its
**use case**, so the suite stays navigable as it grows to hundreds of scenarios. The Playwright globs are
recursive, so adding a domain or UC needs no config change.

```
nr-scs/frontend/         # ← the npm package root: package.json holds the e2e deps + test:e2e* scripts
  e2e/
  playwright.config.ts   # testDir = defineBddConfig({ features, steps }); baseURL :3000; HTML+JUnit
  features/<domain>/<uc-id-slug>/
    <concern>.feature    # e.g. features/chk/uc-chk-005-create/validation.feature
    coverage.md          # per-UC coverage matrix: source item -> app enforcement -> scenario -> status -> gap
                         #   (how to read one: coverage-guide.md at the e2e root)
    defects.md           # per-UC defect log: findings by register (divergence/bug/coverage-gap/spec-gap/verified)
                         #   (how it works: defects-guide.md at the e2e root)
  coverage-guide.md      # plain-language legend for the coverage.md files (columns, status flags) — BA/QA
  defects-guide.md       # plain-language legend for the defects.md files (registers, tags, how-to-read) — BA/QA
  steps/
    fixtures.ts          # single composition root: createBdd(test) -> Given/When/Then; page objects +
                         #   cleanup registry + create spy + world
    common/*.steps.ts    # cross-domain REUSABLE steps (generic asserts) — no domain vocabulary
    chk/*.steps.ts       # domain steps, split by concern (navigation/form/verify); NO DOM selectors
  pages/<domain>/*.ts    # Page Objects (selectors + interactions) — called BY steps
  fixtures/<domain>/*-test-data.ts   # known-good test data pinned from the seeded DB (with provenance)
  preflight/anchors.setup.ts   # `setup` project the chromium project depends on: asserts anchors +
                         #   applied-seed presence resolve BEFORE any scenario (fail fast, one clear message)
  scripts/               # apply-patches.sh / teardown-patches.sh (seed patches, auto-discovered);
                         #   docker-sqlplus.sh (run sqlplus inside the DB container when no local client)
  scs-real-test-data-patches/   # minimal per-domain seed patches (<name>.sql + <name>.teardown.sql) the
                         #   real extract can't supply — applied via scripts/ (see that folder's README)
  .features-gen/         # generated Playwright tests (git-ignored, disposable — never edit/commit)
  test-results/          # traces/screenshots on failure (git-ignored)
  playwright-report/     # HTML report (git-ignored) — `npm run e2e:report`
```

Everything below `e2e/` is indented one level under `frontend/` in reality; the tree is flattened so the
suite's own layout stays readable.

Naming: UC folder = `uc-<domain>-<nnn>-<verb>` (matches the source `UC-<DOMAIN>-<NNN>`), one `.feature`
per concern within it. A step belongs to `steps/<domain>/` if only that domain uses it, or `steps/common/`
if it is genuinely domain-agnostic.

## Prerequisites — bring up the full stack

1. **Seeded Oracle DB — pre-built Docker image + seed patches.** The suite runs against a Docker image
   that already contains the extracted test data — no repo checkout, `docker compose`, or manual
   load step is needed. The image lives in the team's private registry; ask a maintainer for its name and
   substitute it for `<seeded-scs-db-image>` below.

   **Step 1 — pull and run the image** (map the Oracle listener to host port **1525**):
   ```bash
   docker run -d --name real-data-seeded-scs-db -p 1525:1521 \
     <seeded-scs-db-image>:latest
   ```
   - **Oracle service** `DBDOCK_01`  ·  **user / password** `THE` / `default`
   - **JDBC URL** `jdbc:oracle:thin:@//localhost:1525/DBDOCK_01`
   - The image tag and container name may change over time. If your container is named something other
     than `real-data-seeded-scs-db`, set `SCS_DB_CONTAINER` for the sqlplus wrapper (see [`.env.example`](.env.example)).

   **Step 2 — apply the seed patches** (once per fresh container; the image does **not** include them).
   These are the minimal seed rows the real extract can't supply (see
   [`scs-real-test-data-patches/`](scs-real-test-data-patches)) — today just the MSD create mark. From
   **WSL** or a **Git Bash** terminal:
   ```bash
   # from nr-scs/frontend/
   ./e2e/scripts/apply-patches.sh        # tear down again with ./e2e/scripts/teardown-patches.sh
   ```
   - **Default** — uses `sqlplus` at DSN `THE/default@localhost:1525/DBDOCK_01`.
   - **No Oracle client on your host?** Run sqlplus *inside* the DB container instead:
     `SQLPLUS=e2e/scripts/docker-sqlplus.sh ./e2e/scripts/apply-patches.sh` (set `SCS_DB_CONTAINER` if your
     container name differs). Override `ORACLE_DSN` / `SQLPLUS` as needed.
   - **Applying to an already-running backend?** Evict the LOV cache afterward
     (`POST /api/api/internal/cache/evict`) or restart it.
   - Skip this and the MSD create scenarios **fail fast in preflight**, with a message telling you to run it.

   **Fixtures & anchors.** The fixtures pin real anchors from this data (CHK scalers `7443/7444`, timber
   mark `L44804`, site `28E`, check-scale ids `145988/145849`; INS sites `520/525/561/540` + an inspector GUID
   (local-only, see `fixtures/common/seededValues.ts`); CCQ LOV codes) — re-verify them if the image is rebuilt from a fresh extract, since real
   data is non-deterministic. *(The older synthetic `scs-seed-mock-data` seed and the `nr-mof-db-no-git`
   compose repo are superseded and no longer used; the extract tooling stays in-repo under
   `…/test-data/scs-data-extract/` for rebuilds.)*
2. **Backend** (`nr-scs/backend`) on `:8080` with local mock auth:
   `SECURITY_JWT_ENABLED=false`, `APP_ENVIRONMENT=LOCAL`,
   `DATABASE_URL=jdbc:oracle:thin:@//localhost:1525/DBDOCK_01` (see `backend/.env.example`; run with
   `mvn spring-boot:run`).
   **After loading data into an already-running backend, evict the LOV cache**
   (`POST /api/api/internal/cache/evict`) or restart it — otherwise a startup-warmed cache serves stale
   code LOVs and create calls 500. (Also: start the DB *before* the backend — the backend's Spring
   context fails to initialize if the Oracle listener isn't up yet, and then every `/api` route 404s.)
3. **Frontend** (`nr-scs/frontend`) on `:3000` with `VITE_MOCK_USER=true` (`npm start`).
   Mock auth auto-logs-in an `SCS_SYS_ADMIN` user — no Cognito/login flow needed.

## Seeded database image — how it's built and refreshed

The DB you run in step 1 is a **pre-built Oracle image preloaded with real data extracted from a dev/test
system** (not a synthetic seed). Developers just pull and run it; a maintainer rebuilds it periodically.
The process:

1. **Extract** real data from a dev/test source DB with your app's extract tooling. The extract is
   typically **one FK hop**, so some referential gaps are expected (a child row whose parent wasn't
   pulled) — a live `INSERT` still enforces FKs, so a create can fail on a *data gap*, not a bug.
   *(SCS extracts via `scs-data-extract` / `toad_extract`.)*
2. **Load** the extract into a base Oracle Free container running locally (the SCS image publishes service
   `DBDOCK_01`, user/password `THE`/`default`).
3. **Snapshot** the loaded container into a tagged image and **push** it to the team packages registry
   **(run the `docker` commands one at a time)**:
   ```bash
   SEEDED_NAME=<your-seeded-local-container-name>
   DEST_IMAGE=<seeded-scs-db-image>

   docker stop -t 120 "$SEEDED_NAME"                          # clean checkpoint BEFORE commit (avoids a fuzzy snapshot)
   docker commit "$SEEDED_NAME" "$DEST_IMAGE:latest"          # may take a few minutes
   docker tag "$DEST_IMAGE:latest" "$DEST_IMAGE:$(date +%F)"  # dated tag pins this known-good snapshot
   docker push "$DEST_IMAGE:latest"
   docker push "$DEST_IMAGE:$(date +%F)"
   ```
   Restart the local container afterward (`docker start "$SEEDED_NAME"`) if you still need it running.
4. **Consume**: developers `docker run -p 1525:1521 <image>` (step 1) and apply the seed patches
   per-container (step 2). Patches are **not** baked into the image — re-apply them on each fresh
   container, or re-snapshot *with* them to bake them in.

**After any re-extract the real data changes**, so **re-verify the pinned fixtures and any seed patches** —
treat a re-extract as a re-ground event (sweep `fixtures/**` and any hardcoded ids in the ledgers). The
`preflight/` setup fails fast if a pinned anchor no longer resolves.

**Windows/WSL note:** building or loading a large Oracle image inflates the WSL virtual disk (`.vhdx`).
Set your disks to sparse, so `wsl --shutdown` can reclaim the space back to your `C:` drive.

## Install & run

```bash
cd nr-scs/frontend        # NOT e2e/ — frontend/ is the npm package root for this suite
npm install               # installs the app AND the e2e deps; there is no second install

npm run test:e2e             # installs chromium if missing + regenerates from features, then runs headless
npm run test:e2e:generation  # the report-generation scenarios ONLY — run in sequence (see below)
npm run test:e2e:all         # test:e2e, then test:e2e:generation
npm run test:e2e:headed      # watch it drive the browser (recommended first run)
npm run test:e2e:ui          # Playwright UI mode
npm run e2e:browsers         # just install chromium
npm run e2e:bddgen           # just regenerate e2e/.features-gen/ from features + steps
npm run typecheck:e2e        # tsc --noEmit over steps/, pages/, fixtures/, preflight/ (see below)
npm run e2e:report           # open the HTML report
npm run e2e:codegen          # Playwright codegen against http://localhost:3000
```

Each `test:e2e*` script runs `e2e:prepare` (`e2e:browsers` + `e2e:bddgen`) as its pre-hook, so a fresh
clone needs no browser step of its own; the install is a silent ~3s no-op once cached, and only Chromium
is fetched because the config declares no other browser project. It is deliberately **not** a
`postinstall` hook — the frontend image build (`frontend/Dockerfile`) runs `npm ci`, and that release
path must not pull a ~115 MB browser it will never run.

`test:e2e:all` is the exception: it calls `e2e:prepare` **once** itself and then invokes the runner twice,
rather than chaining `test:e2e && test:e2e:generation` and paying for a second `bddgen` over every feature
file. Keep it that way if you add a third pass.

These are the **only** entry points — `e2e/` holds no `package.json`, so `npm test` inside `e2e/` does
nothing. In `frontend/`, `npm test` / `npm run test:unit` / `npm run test:browser` remain the app's own
Vitest suites and are untouched by the e2e scripts.

To drive Playwright directly, pass the config: `npx playwright test --config e2e/playwright.config.ts …`.

### `npm run typecheck:e2e` — the static gate

**Playwright never type-checks.** It transpiles each `.ts` with esbuild, which *strips* types without
looking at them, so nothing in a normal run validates a type. A cross-file refactor — a shared type in
`fixtures/` used by `pages/` and `steps/` — is otherwise only as validated as the scenarios that happen to
execute the changed line, and a step file no scenario reaches is not validated at all. `npm run typecheck:e2e`
is what closes that: it is fast (no browser, no stack) and is the right thing to run before a PR.

It is a real gate, not a decorative one — when first added it caught a broken import path, a `ScsWorld`
field that was written but never declared, and a `getByRole('row', { has })` that Playwright had been
silently ignoring.

**If you change `tsconfig.json`, prove the gate still bites.** A *fatal option* diagnostic (`TS5101` on a
deprecated option, `TS2688` on an unresolvable `types` entry) makes `tsc` exit **before checking any file**
— it reports one or two lines and looks like a near-pass while validating nothing. That is not
hypothetical: it is exactly the state the app's own frontend `tsc` is in
(the deferred-work log), and this
config hit `TS2688` on its first run. Verify by planting `const x: string = 123;` in a step file and
confirming the run fails.

**`npm run test:e2e` deliberately excludes `@generation`.** Those are the only scenarios that make the backend
actually render a report, and real renders are the suite's scarcest resource: 2–16s each (province-wide can
exceed 120s), with `ReportService` allowing only **three** concurrently — a fourth caller waits 20s and then
gets a 503. Run in parallel they starve each other and everything around them. So:

- `npm run test:e2e` → everything else, 6 workers, **zero real renders**. The report screens' requests are stubbed by
  default (`steps/fixtures/rpt.ts`), which is fine because those scenarios assert the *request payload*, never
  the response. They also no longer need the report engine to be up at all.
- `npm run test:e2e:generation` → the **12** `@generation` scenarios at `--workers=1`, so they can only ever run
  **in sequence**. One real render per Jasper template, always district-filtered, each carrying that report's
  distinctive parameter shape. This is where "does SCS_REP0xx still render?" is actually proven.

  **These scenarios depend on the report engine actually being up**, which in this environment it
  intermittently is not (see `features/rpt/uc-rpt-010-scaler-register/defects.md` #3/#4). When it is down,
  every report POST returns HTTP 500 and no download ever arrives. The download step watches the *response*
  alongside the download, so that fails in seconds with
  `Report generation returned HTTP 500 … check that JasperServer is up` rather than sitting for the 150s
  download timeout and reporting a cause-free "Timeout exceeded". A 503 is called out separately as the
  engine being at capacity. **A red here means "check the engine", not "the report is broken"** — confirm with
  a direct probe before treating it as a product defect:

  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/api/reports/scaling-administration \
    -H 'Content-Type: application/json' -d '{"regDist":"DCC","outputFormat":"PDF","preview":true}'
  ```

- `npm run test:e2e:ui` also excludes `@generation`, for the same reason plus one more: in UI mode a render that
  the engine cannot serve looks like a hang. To drive one interactively, run
  `npx playwright test --config e2e/playwright.config.ts --grep @generation --ui` with the engine confirmed up.

**Consequence to state plainly: `npm run test:e2e` proves no Jasper template renders.** The `@generation` set is the
*only* coverage that does, so a green `npm run test:e2e` says nothing about whether a report still produces a document.
**`npm run test:e2e:all` is the gate** — that is what to run before merging a change to the Reports tab, and what
CI should run (nightly, serially) once CI exists. See "Not covered / known limits" below.

If you add a scenario that must render for real, use the `I submit the report and download the generated file`
step (it opts into the real engine) and tag the scenario `@generation` — that tag is what keeps it out of the
parallel run and gives it a longer timeout.

Override the base URL if your ports differ: `BASE_URL=http://localhost:3001 npm run test:e2e`. Edit `features/`
and `steps/` only — `.features-gen/` is regenerated on every `npm run test:e2e`. An unbound step fails `bddgen`
(before Playwright runs) and names the exact `.feature` line.

### Scenario tags

Every scenario carries two kinds of tag:

- **Priority** — how important the scenario is, used to pick what to run when you can't run the whole suite:

  | Tag | Meaning | Examples |
  |---|---|---|
  | `@p0` | **Critical** — the core happy path must work; if it's red the feature is broken. Runs in every smoke check. | create a record and confirm it persisted |
  | `@p1` | **Important** — key validation, error handling, and required-field rules. | required-field errors, numeric-format errors, server-error handling |
  | `@p2` | **Secondary** — UI niceties and lower-risk branches. | field enable/disable gating, Back-button behavior |

- **Traceability** — `@UC-<DOMAIN>-<NNN>` (the use case) and `@S<NN>` (the source slice), so a scenario
  maps straight back to its Gherkin/spec and to the `coverage.md` matrix.

  The role/permission suites use `@sec` plus `@SEC-<NN>` for their own stories. **`sec` is the suite's
  identifier and is deliberately unchanged**, even though the directory was renamed `features/sec/` →
  `features/security/`: the tags (`@sec`, `@SEC-8`…`@SEC-11`) are traceability references to the SEC
  stories, and the `[sec]` prefix on the suites' thrown error messages matches them on purpose. It is a
  stable grep token — `grep -rn "\[sec\]"` finds every guard those suites raise. Renaming the messages
  to `[security]` would put them out of step with the tags; renaming the tags would break traceability.
  So: directory `security/`, tag and message prefix `sec`. Intentional, not leftover.

- **Special handling** — a few tags mark scenarios that aren't a normal pass:

  | Tag | Meaning |
  |---|---|
  | `@discovered-divergence` | **Deliberately RED** — reproduces a divergence (app ≠ legacy spec, suspected defect). Never forced green; logged in the UC's `defects.md` for BA/QA → Jira; flips to green when the app is fixed. |
  | `@discovered-bug` | **Deliberately RED** — reproduces a confirmed bug/regression awaiting a fix (has a Jira ticket). |
  | `@skip` | Genuinely can't be automated yet (e.g. blocked by the single mock `SCS_SYS_ADMIN` role) — never used to hide a failure. |
  | `@generation` | Makes the backend **actually render a report** (2–16s each; only 3 may run concurrently). **Excluded from `npm run test:e2e`** and run in sequence via `npm run test:e2e:generation` — see "Running the suite" above. Not a failure state; just a rationed resource. |

  **Never force green:** a suspected-defect divergence / confirmed bug is a genuinely-failing tagged test, never masked with `@skip`, xfail, or a weakened assertion. A failing test does not stop the others (Playwright isolates them). Run a **clean "fresh failures only" pass** — everything except the known reds — with:

  ```bash
  npx playwright test --config e2e/playwright.config.ts --grep-invert "@discovered-divergence|@discovered-bug"
  ```

Filter with Playwright's `--grep` (args after `--` pass through; `pretest:e2e` still regenerates first):

```bash
npm run test:e2e -- --grep @p0           # smoke: core happy paths only
npm run test:e2e -- --grep "@p0|@p1"     # smoke + key validation/error handling
npm run test:e2e -- --grep @UC-CHK-005   # one use case
npm run test:e2e -- --grep @chk          # one domain
```

At scale you can also filter at *generation* time so only matching scenarios compile:
`npm run e2e:bddgen -- --tags @p0` then `npx playwright test --config e2e/playwright.config.ts`.

## Notes

- **Self-cleaning (fails loud):** a step that creates a record registers its id and the shared fixture
  deletes it on teardown, so each scenario leaves the seeded DB as it found it. Two cleanup paths by
  flow, both fail-loud (residue throws rather than silently polluting the shared seed):
  - **Summary** check scales → `createdCheckScaleIds` → `DELETE /api/summary-check-scales/{id}` (cascades
    the SPG rows); a `404` is treated as already-gone.
  - **Detail** check scales have **no DELETE endpoint**, so `createdDetailCheckScaleIds` deletes the row
    directly at the DB via `sqlplus` (`steps/chk/checkScaleDbCleanup.ts`; DSN + binary env-overridable),
    then reads back through the API to prove it's gone.
- **Reusable steps:** add a `Given/When/Then` only when no existing phrase fits; repeated behavior is a
  `Scenario Outline` (see the SPG numeric matrix in `summary-check-scale-validation.feature`). Selectors
  live in the page object, never in steps.
- **Tags & coverage:** every scenario is tagged by priority + UC/slice (see *Scenario tags* above), and
  each UC folder carries a `coverage.md` matrix mapping every source item to the scenario that covers it
  (or a logged gap) — the durable audit trail behind a green run.
- **Role scoping is testable now** (this supersedes the old "mock auth grants only `SCS_SYS_ADMIN`"
  limitation that several `coverage.md` files and the `@skip` note above still cite). The role model
  shipped, and `pages/security/RoleSessionPage` seeds any role + forest client into `localStorage` before the
  app boots, so a scenario can run as any of the eleven `SCS_` roles.

  `features/security/` holds **two shapes of suite**, and they answer different questions:

  1. **Per-role suites** (`*-role/`, `*-roles/`) — one folder per column of the permission matrix, each
     following the same pattern: one `.feature` per level — **GUI** (what the app offers), **URL** (what
     a deep link reaches), **API** (what the server refuses) — plus a fourth for the role's data-scoping
     axis. All eleven roles are covered; `SCS_SYS_ADMIN` appears only as the contrast every denial is
     paired against. Run one with `npx playwright test --config e2e/playwright.config.ts --grep "@IND"` / `"@OWN"` / `"@CHK"` …
  2. **Cross-cutting suites** (all tagged `@cross-cutting`) — the transpose. Each takes one property
     that belongs to no single role, so no per-role suite can see it, and sweeps it across columns,
     endpoints or screens: `cross-cutting-record-scope/` (the client-scoping seam, the invariant that
     scoping follows the *client header* rather than the role, and `active-client.feature` — which of a
     multi-client external user's clients a request acts as), `chrome-boundaries/` (where a refused,
     lost, shut-out or *failing* user actually lands), `maintenance-controls/` (§J's Add/Edit/Delete),
     `write-verb-boundaries/` (write verbs no single-role suite could probe), `audit-affordance/`
     (`@audit` — the Who Did It popup, a component on eleven screens) and `welcome/` (`@welcome` — the
     page every authorized user lands on, including the Current News sanitizer). They deliberately do
     **not** carry all four levels — each asserts at the level its property is enforced at, and says so
     in its `coverage.md`. Run them with `--grep "@cross-cutting"`.

     Most carry `@SEC-11`; `audit-affordance/` and `welcome/` carry `@SEC-5` and `@SEC-1`, the Epic SEC
     stories they actually implement. **[`features/security/epic-sec-coverage.md`](features/security/epic-sec-coverage.md)
     maps all seven Epic SEC stories to the suite that covers each**, and is the file to read when the
     question is "is Epic SEC done" rather than "is this screen tested".

  **Re-run `npm run e2e:bddgen` after editing a
  `.feature`** — `npx playwright test --config e2e/playwright.config.ts` alone reuses the stale generated spec (only `npm run test:e2e` triggers the
  `pretest:e2e` hook). Existing `blocked`/`@skip` permission rows should be revisited against these (tracked as
  Coverage gap #4 in the industry-scaler `defects.md`).

  **Writes need a body AND a contrast — read this before adding a write probe.** All three suites record
  the same ordering fact: body binding and bean validation run BEFORE `@RequiresPermission`, so a write
  probe cannot assume its refusal came from authorization. Measured in the check-scaler suite (`defects.md`
  V2): a bodyless `POST` answers `500` for an administrator, for a role that holds the permission, and for
  a welcome-only role *alike*, so any assertion built on one is vacuous. The owner suite's older answer was
  to probe bodyless mutations only; **prefer the current one** — send a body that (1) binds, (2) passes bean
  validation, and (3) fails a *service-side* rule, then pair it with a contrasting role. Tell (2) from (3)
  at the wire: bean validation answers `VALIDATION_ERROR` with `fieldErrors`, service rules answer
  `BAD_REQUEST`/`NOT_FOUND`/`UNPROCESSABLE_ENTITY` with a prose `message`.

  Two more traps worth the read: proving a write is **allowed** needs a role that is *refused* the same
  call (a welcome-only role like `SCS_CLERICAL` — a shared status with an administrator proves nothing,
  check-scaler V3); and a seeded entitlement has to assert both directions inside a single scenario to
  survive `fullyParallel`. The check-scaler suite is the one to copy for an **internal** role (no forest
  client) or any role with **write** permissions; the other two are the client-scoped pattern.
- No CI wiring yet (the app + DB aren't containerized for CI here). When it lands, the intended shape is two
  jobs, not one: **`npm run test:e2e` per PR** (fast, parallel, zero real renders) and **`npm run test:e2e:generation`
  nightly, serially, with the report engine up** — because report generation is rationed to three concurrent
  renders and depends on an engine that is not always available, so it cannot gate a PR. Until then the
  `@generation` set is run locally, and `npm run test:e2e:all` is the pre-merge gate for Reports-tab changes.
