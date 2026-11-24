# Coverage — UC-RPT-015 Generate Scaling Administration Report

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-015-S*.feature` + `UC-RPT-015-slices.md`, against the new app's Scaling
Administration Report screen (route `/reports/scaling-administration` → `pages/Reports/ScalingAdministration` →
shared `ReportPage`; generate = `POST /api/reports/scaling-administration` → Jasper). The report shows counts of
authorizations, appointments and MSDs in an org unit.

All of this UC's coverage is in a single `report.feature`: this is the SIMPLEST screen in the tab — three
parameters (Reg / Dist + a date window), no sort block — so splitting render / mapping / validation across three
files would produce three near-empty ones.

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

**Re-groundings.** Legacy Struts route + forward → SPA route + rendered `<h1>`. Legacy server-side email
validation → client-side `ReportPage.handleSend` before dispatch (so each negative proves 0 requests fired).
Legacy ERR "The Email Recipient is not in a valid format." → "Email Recipient must be a valid email address."

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Parameter form renders full control set | slices.md controls | route → `ScalingAdministrationPage` + `ReportPage` | `report.feature` `@p1` (3 params + output options) | covered (re-grounded) | — |
| Submit builds the report parameter set | submit slice; slices.md | `payload` useMemo → `POST /reports/scaling-administration` | `report.feature` `@p1` (defaults: regDist ALL, PDF, preview, dates absent) | covered (re-grounded) | — |
| Org unit filter | slices.md controls | `regDist || 'ALL'` | `report.feature` `@p1` ×2 (default ALL; DCC) | covered | — |
| Date window | slices.md date catalog | `fromDate`/`toDate`, omitted when blank | `report.feature` `@p1` (both carried) + defaults (absent) | covered | — |
| File format PDF / MS Excel | slices.md (LOV `repOutout`) | `outputFormatMap` → `PDF`/`XLS` | `report.feature` `@p1` (XLS) + defaults (PDF) | covered | — |
| Email delivery instead of preview | S02-equivalent | `preview:false` + recipient | `report.feature` `@p1` | covered | — |
| ERR email required when Preview=No | S06-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `report.feature` `@p1` | covered | — |
| ERR invalid email format | S07-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `report.feature` `@p1` | covered (re-grounded) | — |
| Reset returns parameters to defaults | slices.md control catalog | `onReset` | `report.feature` `@p2` (4 controls + 0 calls) | covered | — |
| From/To date validation | legacy `errors.from_to`, `isDate()` | **absent** on this screen | — (single repro on the archetype) | **divergence (RED elsewhere)** | `../uc-rpt-010-scaler-register/defects.md` #1, #2 |
| **Report actually renders (`SCS_REP015`)** | legacy happy-path delivery slice | `POST /reports/...` -> Jasper -> real document | `generation.feature` `@p1 @generation` (real PDF for a district + date window) | **covered (real)** | was `../uc-rpt-010-scaler-register/defects.md` #3, now CLOSED |
| Delivery / download / submit error | delivery slices | shared `ReportPage` + `useReportDownload` | — (authored on the archetype) | covered (archetype) | — |
| Role-gated Reports menu visibility | S08-equivalent | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |

**Symmetry check.** Both delivery modes, both file formats, and both email-validation arms are covered, each
negative with the prove-the-negative. The Reg/Dist default and a chosen value are both asserted, as are the
date fields present and absent.

**Role / permission coverage:** **blocked by single-role mock auth** — mock auth grants only `SCS_SYS_ADMIN`.

**Coverage gate (over coverage-eligible items, excluding `blocked` and the archetype-covered row):** 9 of 9
covered. The date-validation divergences are filed against the archetype (single repro by design).
**P0 n/a · P1 100%.**

**Status values:** `covered` · **`covered (real)`** (rendered end-to-end through JasperServer, downloaded
bytes asserted) · `covered (re-grounded)` · `covered (archetype)` · `divergence (RED elsewhere)` ·
`blocked` (auth: mock role).

**How to run.** The `@generation` scenarios are slow and contend for render slots — run them with limited
parallelism (`npm run test:generation`, which pins one worker); CI already runs the whole suite serially.
See `../uc-rpt-010-scaler-register/defects.md` #4.
