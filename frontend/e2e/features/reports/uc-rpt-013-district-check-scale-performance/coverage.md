# Coverage — UC-RPT-013 Generate District Check Scale Performance Report

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-013-S*.feature` + `UC-RPT-013-slices.md`, against the new app's District
Check Scale Performance screen (route `/reports/district-check-scale-performance` →
`pages/Reports/DistrictCheckScalePerformance` → shared `ReportPage`; generate =
`POST /api/reports/district-check-scale-performance` → `ReportController` → `ReportService`
`fetchDistrictPerformanceResponse` → Jasper).

**This is one of only TWO report screens that validate their date window**, and the only place in the Reports tab
where From/To are **required**. That validation is the substantial behaviour of this UC and gets its own file,
`date-validation.feature`; `report.feature` covers render, payload mapping and the shared output-option rules.

**Why this UC matters beyond itself.** These are exactly the rules the other six parameter screens OMIT. The green
scenarios here are the counterpart that proves the rules are still wanted in the new app — which is what makes the
omission elsewhere a **divergence** rather than an accepted simplification. See
[`../uc-rpt-010-scaler-register/defects.md`](../uc-rpt-010-scaler-register/defects.md) #1/#2.

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

**Backend double-enforcement (deliberately NOT covered here).** `ReportService.fetchDistrictPerformanceResponse`
throws 400 for a null request, missing dates, from-after-to, and a range over one year. The client blocks all four
first, so those backend branches are **unreachable from the browser** — asserting them here would require
bypassing the UI, which an E2E suite should not do. They are covered at the unit level in
`backend/src/test/java/.../service/ReportServiceTest.java` instead. Noted so the apparent "gap" is understood as a
deliberate layer split.

**Re-groundings.** Legacy Struts route + forward → SPA route + rendered `<h1>`. Legacy server-side date +
email validation → client-side (`validateDates` and `ReportPage.handleSend`) before dispatch, so every negative
also proves 0 requests fired. Legacy ERR "The Email Recipient is not in a valid format." → "Email Recipient must
be a valid email address." Cross-field date messages are rendered **on the To Date field only** (the shared helper
mirrors `rangeError` onto `toError`), so they are asserted through the same field step as the required messages —
there is no form-level banner.

**Dates here are literal, on purpose** — the one place in this suite that departs from the today-relative
(`daysAgo`) convention. Every rule on this screen is **span-based** (ordering, plus a cap measured From→To), so a
fixed pair cannot age: one year apart today is one year apart next year. Literals are also the only way to state
the cap boundary exactly — `2024-01-01` → `2025-01-01` is precisely one year, which a `daysAgo` pair cannot
express (365 vs 366 days flips it across a leap year).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Parameter form renders full control set | slices.md controls | route → `DistrictCheckScalePerformancePage` | `report.feature` `@p1` (3 params + output options) | covered (re-grounded) | — |
| From Date required | slices.md required-field catalog | `validateDates` mode `submit` → "From Date is required." | `date-validation.feature` `@p1 @ERR-from-required` (+ 0 calls) | covered | — |
| To Date required | slices.md required-field catalog | `validateDates` mode `submit` → "To Date is required." | `date-validation.feature` `@p1 @ERR-to-required` (only-From case; + 0 calls) | covered | — |
| From Date must precede To Date | legacy `errors.from_to` | `validateDates` (change AND submit) → "To Date must be on or after From Date." | `date-validation.feature` `@p1 @ERR-date-order` (To-field message + 0 calls) | covered (re-grounded) | — |
| Date range capped at one year | slices.md range rule | `validateDates` → "Search date range cannot be more than 1 year(s)." | `date-validation.feature` `@p1 @ERR-date-range` (over cap) + `@p2` (exactly one year accepted) | covered | — |
| Date errors clear on correction | slices.md (re-submit arms) | `validateDates` mode `change` | `date-validation.feature` `@p2 @ERR-date-order` (clears, then request fires) | covered | — |
| Submit builds the report parameter set | submit slice; slices.md | `payload` useMemo → `POST /reports/district-check-scale-performance` | `report.feature` `@p1` (defaults with required dates supplied) | covered (re-grounded) | — |
| Org unit filter | slices.md controls | `regDist || 'ALL'` | `report.feature` `@p1` ×2 (default ALL; DCC) | covered | — |
| File format PDF / MS Excel | slices.md (LOV `repOutout`) | `outputFormatMap` → `PDF`/`XLS` | `report.feature` `@p1` (XLS) + defaults (PDF) | covered | — |
| Email delivery instead of preview | S02-equivalent | `preview:false` + recipient | `report.feature` `@p1` | covered | — |
| ERR email required when Preview=No | S06-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `report.feature` `@p1` | covered | — |
| ERR invalid email format | S07-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `report.feature` `@p1` (asserted with dates ALSO missing — documents that the shared email rule runs FIRST) | covered (re-grounded) | — |
| Reset clears parameters and date errors | slices.md control catalog | `onReset` (also nulls the two date errors) | `report.feature` `@p2` (3 controls + error cleared + 0 calls) | covered | — |
| Backend 400s on a bad window | slices.md server rules | `ReportService.fetchDistrictPerformanceResponse` | — (unreachable via UI; unit-tested) | covered (unit layer) | — |
| **Report actually renders (`SCS_REP025`)** | legacy happy-path delivery slice | `POST /reports/...` -> Jasper -> real document | `generation.feature` `@p1 @generation` (real PDF) + `@p2` (empty window still renders) | **covered (real)** | was `../uc-rpt-010-scaler-register/defects.md` #3, now CLOSED |
| Delivery / download / submit error | delivery slices | shared `ReportPage` + `useReportDownload` | — (authored on the archetype) | covered (archetype) | — |
| Role-gated Reports menu visibility | S08-equivalent | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |

**Symmetry check.** All four date rules are covered on BOTH sides of their boundary: required (missing and
supplied), ordering (inverted and corrected), and the cap (over one year AND *exactly* one year accepted — the
boundary case that a "> 1 year" vs ">= 1 year" off-by-one would flip). Each negative proves 0 requests fired.
The precedence between the two validation layers (shared email rules run before the screen's date rules) is
asserted explicitly rather than left implicit.

**Role / permission coverage:** **blocked by single-role mock auth** — mock auth grants only `SCS_SYS_ADMIN`.

**Coverage gate (over coverage-eligible items, excluding `blocked` and the rows covered at another layer):** 13
of 13 covered. **P0 n/a · P1 100%.**

**Status values:** `covered` · **`covered (real)`** (rendered end-to-end through JasperServer, downloaded
bytes asserted) · `covered (re-grounded)` · `covered (archetype)` (shared behaviour asserted in
UC-RPT-010) · `covered (unit layer)` (unreachable from the UI by design) · `blocked` (auth: mock role).

**How to run.** The `@generation` scenarios are slow and contend for render slots — run them with limited
parallelism (`npm run test:generation`, which pins one worker); CI already runs the whole suite serially.
See `../uc-rpt-010-scaler-register/defects.md` #4.
