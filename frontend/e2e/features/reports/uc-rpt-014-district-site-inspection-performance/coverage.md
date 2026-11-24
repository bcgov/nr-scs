# Coverage — UC-RPT-014 Generate District Site Inspection Performance Report

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-014-S*.feature` + `UC-RPT-014-slices.md`, against the new app's District Site
Inspection Performance screen (route `/reports/district-site-inspection-performance` →
`pages/Reports/DistrictSiteInspectionPerformance` → shared `ReportPage`; generate =
`POST /api/reports/district-site-inspection-performance` → `ReportService.fetchDistrictPerformanceResponse` →
Jasper).

**This screen is the structural TWIN of UC-RPT-013's District Check Scale Performance**: same three parameters,
same `validateDates` implementation (required From/To, ordering, one-year cap), same messages — different
endpoint and Jasper report.

**Why the date rules are re-asserted here rather than cross-referenced.** Originally because the two screens
carried **duplicated** validation logic that could drift. Since 2026-08-11 both call one shared helper
(`utils/reportDateRange`), so the reason has shifted rather than disappeared: each screen still passes its own
options (`required`, `maxYears`) and renders its own fields, so a screen that stopped calling the helper — or
called it with the wrong options — would break silently, and only a per-screen assertion would catch it. (Contrast the shared `ReportPage` behaviours, which
live in ONE component and are therefore authored once on the archetype.)

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

**Backend double-enforcement (deliberately NOT covered here).** This endpoint shares
`ReportService.fetchDistrictPerformanceResponse` with UC-RPT-013, which 400s on a null request, missing dates,
from-after-to, and an over-one-year range. The client blocks all four first, so those branches are unreachable
from the browser and are covered in `ReportServiceTest` instead — a deliberate layer split.

**Re-groundings.** Legacy Struts route + forward → SPA route + rendered `<h1>`. Legacy server-side date + email
validation → client-side before dispatch, so every negative also proves 0 requests fired. Legacy ERR "The Email
Recipient is not in a valid format." → "Email Recipient must be a valid email address."

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Parameter form renders full control set | slices.md controls | route → `DistrictSiteInspectionPerformancePage` | `report.feature` `@p1` (3 params + output options) | covered (re-grounded) | — |
| From + To Date required | slices.md required-field catalog | `validateDates` mode `submit` → "From Date is required." / "To Date is required." | `report.feature` `@p1 @ERR-from-required` (both messages + 0 calls) | covered | — |
| From Date must precede To Date | legacy `errors.from_to` | `validateDates` → "To Date must be on or after From Date." | `report.feature` `@p1 @ERR-date-order` (+ 0 calls) | covered (re-grounded) | — |
| Date range capped at one year | slices.md range rule | `validateDates` → "Search date range cannot be more than 1 year(s)." | `report.feature` `@p1 @ERR-date-range` (+ 0 calls) | covered | — |
| Submit builds the report parameter set | submit slice; slices.md | `payload` useMemo → `POST /reports/district-site-inspection-performance` | `report.feature` `@p1` (defaults with required dates supplied) | covered (re-grounded) | — |
| Org unit filter | slices.md controls | `regDist \|\| 'ALL'` | `report.feature` `@p1` ×2 (default ALL; DCC) | covered | — |
| File format PDF / MS Excel | slices.md (LOV `repOutout`) | `outputFormatMap` → `PDF`/`XLS` | `report.feature` `@p1` (XLS) + defaults (PDF) | covered | — |
| Email delivery instead of preview | S02-equivalent | `preview:false` + recipient | `report.feature` `@p1` | covered | — |
| ERR email required when Preview=No | S06-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `report.feature` `@p1` | covered | — |
| ERR invalid email format | S07-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `report.feature` `@p1` | covered (re-grounded) | — |
| Backend 400s on a bad window | slices.md server rules | `ReportService.fetchDistrictPerformanceResponse` | — (unreachable via UI; unit-tested) | covered (unit layer) | — |
| **Report actually renders (`SCS_REP026`)** | legacy happy-path delivery slice | `POST /reports/...` -> Jasper -> real document | `generation.feature` `@p1 @generation` (real PDF, proving SCS_REP026 not SCS_REP025 renders) | **covered (real)** | was `../uc-rpt-010-scaler-register/defects.md` #3, now CLOSED |
| Delivery / download / submit error | delivery slices | shared `ReportPage` + `useReportDownload` | — (authored on the archetype) | covered (archetype) | — |
| Reset clears parameters and date errors | slices.md control catalog | `onReset` | — | deferred | Coverage gap #2 |
| Date errors clear on correction | slices.md (re-submit arms) | `validateDates` mode `change` | — | deferred | Coverage gap #2 |
| Role-gated Reports menu visibility | S08-equivalent | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |

**Symmetry check.** All three enforced date rules are covered with the prove-the-negative, and both the default
and a chosen value are asserted for Reg/Dist and file format. Two arms that UC-RPT-013 covers (error-clears-on-
correction, and the exactly-one-year boundary) are deferred here rather than duplicated — see Coverage gap #2 for
the reasoning and the trade-off.

**Role / permission coverage:** **blocked by single-role mock auth** — mock auth grants only `SCS_SYS_ADMIN`.

**Coverage gaps.**
1. Role gating (blocked by mock auth) — see defects.md #1.
2. Reset, the error-clears-on-correction arm, and the exactly-one-year boundary are asserted on the twin screen
   (UC-RPT-013) but not here — see defects.md #2.

**Coverage gate (over coverage-eligible items, excluding `blocked` and the rows covered at another layer):** 10
of 12 covered; the 2 uncovered are deferred (gap #2), not failing. **P0 n/a · P1 100%** of the enforced rules.

**Status values:** `covered` · **`covered (real)`** (rendered end-to-end through JasperServer, downloaded
bytes asserted) · `covered (re-grounded)` · `covered (archetype)` · `covered (unit layer)` ·
`deferred` (see Coverage gaps) · `blocked` (auth: mock role).

**How to run.** The `@generation` scenarios are slow and contend for render slots — run them with limited
parallelism (`npm run test:generation`, which pins one worker); CI already runs the whole suite serially.
See `../uc-rpt-010-scaler-register/defects.md` #4.
