# Coverage — UC-RPT-004 Generate Scale Site Compliance Report

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-004-S*.feature` + `UC-RPT-004-slices.md`, against the new app's Scale Site
Compliance Report screen (route `/reports/scale-site-compliance/:inspectionId` →
`pages/Reports/ScaleSiteCompliance` → shared `ReportPage`; generate =
`POST /api/reports/scale-site-compliance` → `ReportController.fetchScaleSiteComplianceReport` → Jasper).

**This is the only report in the tab launched IN CONTEXT.** It takes no parameters of its own: the subject (a site
inspection) arrives in the **route**, and the form shows output options only (the screen passes
`showParametersHeading={false}` accordingly). So the two behaviours that matter are (a) the route parameter
reaching the payload as a **number**, and (b) the guard that refuses a non-numeric route id.

**Test data.** The inspection is pinned to a REAL legacy record — `complianceInspectionId` = **322429** (site 520,
Regular, 2010-01-26), discovered via `GET /api/scale-sites/520/inspections` and recorded with provenance in
`fixtures/rpt/report-test-data.ts`. Deliberately **not** the seeded inspection 97, whose id the INS suites create
and delete (a volatile anchor). The screen never fetches the inspection — it only forwards the id — but pinning a
real one keeps the suite's real-data discipline, and it is what lets `generation.feature` render THIS
inspection's compliance report for real.

**Shared behaviour is authored once on the archetype** — delivery split, download filename rules, and
submit-error branch live in
[`../uc-rpt-010-scaler-register/delivery.feature`](../uc-rpt-010-scaler-register/delivery.feature).

**Environment note — the Jasper blocker is RESOLVED (2026-08-11).** Report generation previously returned
**HTTP 500** on every `POST /api/reports/*`, so the generation slice had to be logged as env-blocked. The local
report engine now works, and this report was re-probed rendering for real. Coverage was upgraded: a new
**`generation.feature`** renders the report end-to-end through JasperServer (nothing stubbed) and asserts the
**downloaded bytes** — `%PDF-` for PDF — plus the `<uuid>.<ext>` filename contract
`ReportService` produces. `parameters.feature` remains valuable and unchanged: it asserts the outbound
**parameter set** the legacy slice actually asserted, which a rendered document cannot show. Full detail and
the closed blocker: `../uc-rpt-010-scaler-register/defects.md` #3.

**Performance caveat — why there is exactly ONE render here.** A real render takes 2-16s (province-wide can
exceed 120s) and `ReportService` allows only THREE concurrently, so real generation is the suite's scarcest
resource. Each report therefore gets **one** real render, always district-filtered, and it is made to carry the
report's distinctive parameter shape rather than submitting an empty form. XLS is not re-tested per report —
the format switch is shared code, proven once on the archetype (UC-RPT-010). The `@generation` set runs
**in sequence** (`npm run test:generation`, workers=1) and is excluded from the default `npm test`, which
performs no real renders at all. See `../uc-rpt-010-scaler-register/defects.md` #4.

**This UC gained the most from the engine being fixed.** It is the only in-context report — its whole subject is
one site inspection carried in the route — so while generation was blocked, "does asking for inspection 322429
actually produce that inspection's compliance assessment?" was unassertable at every layer (the screen has no
parameters to check beyond the id). `generation.feature` now renders it for real. `SCS_REP014` additionally
resolves SUB-REPORTS from the deployed definition, which no request-level assertion can reach — a missing or
renamed sub-report shows up only on a real render.

**Existing frontend coverage (not duplicated here).** This is the one report screen that already had a component
test — `nr-scs/frontend/src/pages/Reports/ScaleSiteCompliance/index.browser.test.tsx` covers the invalid-id guard
(AC-7), the numeric-id submit (AC-1) and the email-required rule (AC-4) at the unit level. The E2E scenarios below
are complementary rather than redundant: they exercise the **real route → real HTTP request** path (the component
test mocks the service), and add the output-format, delivery-mode and Reset-preserves-context arms.

**Re-groundings.** Legacy Struts route + forward → SPA route `/reports/scale-site-compliance/{inspectionId}` +
rendered `<h1>`. Legacy server-side email validation → client-side `ReportPage.handleSend` before dispatch, so
each negative also proves 0 requests fired. Legacy ERR "The Email Recipient is not in a valid format." → "Email
Recipient must be a valid email address."

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Report opens in context for an inspection | S01; slices.md | route param → `ScaleSiteCompliancePage` + `ReportPage` | `report.feature` `@p1` (title + output options, no parameter block) | covered (re-grounded) | — |
| Inspection id sent as a numeric parameter | S01; slices.md | `numericInspectionId` → `payload.inspectionId` | `report.feature` `@p1` (`inspectionId: 322429` as a NUMBER) | covered (re-grounded) | — |
| Invalid / missing inspection refused | S0x exception slice | `/^\d+$/` guard → error notification INSTEAD of the form | `report.feature` `@p1` (no form + "A valid site inspection is required…" + 0 calls) | covered (re-grounded) | — |
| File format PDF / MS Excel | slices.md (LOV `repOutout`) | `outputFormatMap` → `PDF`/`XLS` | `report.feature` `@p2` (XLS) + `@p1` defaults (PDF) | covered | — |
| Email delivery instead of preview | S02-equivalent | `preview:false` + recipient | `report.feature` `@p1` (asserts the id survives too) | covered | — |
| ERR email required when Preview=No | S06-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `report.feature` `@p1` | covered | — |
| ERR invalid email format | S07-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `report.feature` `@p1` | covered (re-grounded) | — |
| Reset clears options but keeps the routed inspection | screen comment ("the inspection context is carried by the route and preserved") | `onReset` (leaves the route param untouched) | `report.feature` `@p2` (options cleared, then id re-asserted on submit) | covered | — |
| **Report actually renders (`SCS_REP014`)** | legacy happy-path delivery slice | `POST /reports/...` -> Jasper -> real document | `generation.feature` `@p1 @generation` (real PDF for inspection 322429; `%PDF-` bytes) | **covered (real)** | was `../uc-rpt-010-scaler-register/defects.md` #3, now CLOSED |
| Delivery / download / submit error | delivery slices | shared `ReportPage` + `useReportDownload` | — (authored on the archetype) | covered (archetype) | — |
| **Report content renders for the routed inspection** | S01 report body | `SCS_REP014` + its sub-reports, resolved from the deployed definition | `generation.feature` `@p1 @generation` (real render for inspection 322429) | **covered (real)** | was `../uc-rpt-010-scaler-register/defects.md` #3, now CLOSED |
| Launch from the site-inspection screen | slices.md navigation | in-context link on the inspection view | — | deferred | Coverage gap #2 |
| Role-gated Reports menu visibility | S08-equivalent | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |

**Symmetry check.** The route-id guard is covered on both sides — a valid numeric id (reaches the payload as a
number) and a non-numeric id (no form at all). Both delivery modes are covered, and both assert the inspection id
survives, which is the one parameter this screen cannot afford to lose. Reset is asserted to clear the options
**without** disturbing the routed context — the asymmetry that makes this screen's Reset different from every
other report screen's.

**Role / permission coverage:** **blocked by single-role mock auth** — mock auth grants only `SCS_SYS_ADMIN`.

**Coverage gaps.**
1. Role gating (blocked by mock auth) — see defects.md #1.
2. Reaching this report by clicking through from the site-inspection screen is not covered; the scenarios navigate
   to the route directly — see defects.md #2.

**Coverage gate (over coverage-eligible items, excluding `blocked` and the archetype-covered row):** 10 of 11
covered; the 1 uncovered is the deferred in-context launch. **P0 n/a · P1 100%.**

**Status values:** `covered` · **`covered (real)`** (rendered end-to-end through JasperServer, downloaded
bytes asserted) · `covered (re-grounded)` · `covered (archetype)` · `deferred` (see Coverage gaps) ·
`blocked` (auth: mock role).

**How to run.** The `@generation` scenarios are slow and contend for render slots — run them with limited
parallelism (`npm run test:generation`, which pins one worker); CI already runs the whole suite serially.
See `../uc-rpt-010-scaler-register/defects.md` #4.
