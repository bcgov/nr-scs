# Coverage — UC-RPT-005 Generate Designated Marks Exception Report

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-005-S*.feature` + `UC-RPT-005-slices.md`, against the new app's Designated
Marks Exception Report screen (route `/reports/designated-mark-exception` →
`pages/Reports/DesignatedMarkException` → shared `ReportPage`; generate =
`POST /api/reports/designated-marks-exception` → Jasper). The report lists non-designated timber marks appearing
at scale sites.

**Route/endpoint asymmetry (asserted deliberately).** The SPA route is **singular**
(`/reports/designated-mark-exception`) while the API path is **plural**
(`/api/reports/designated-marks-exception`). Both are exercised — the route by opening the screen, the endpoint by
the payload scenarios — so a future "tidy-up" of either cannot pass silently.

**Shared behaviour is authored once on the archetype** — delivery split, download filename rules, and
submit-error branch live in
[`../uc-rpt-010-scaler-register/delivery.feature`](../uc-rpt-010-scaler-register/delivery.feature). Report
GENERATION, by contrast, IS authored per-UC: each report is a different Jasper template that can break on its
own. Authored per-UC here: real generation, render, the per-screen parameter mapping, and the output-option validation.

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
validation → client-side `ReportPage.handleSend` before dispatch. Legacy ERR "The Email Recipient is not in a
valid format." → "Email Recipient must be a valid email address." **Structural:** the legacy form's six mark
inputs and six site inputs become TWO `MultiValueInput` pill fields, each capped at six, spread back onto the
unchanged flat `mark1..mark6` / `site1..site6` API contract.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Parameter form renders full control set | slices.md controls | route → `DesignatedMarkExceptionPage` + `ReportPage` | `navigation.feature` `@p1` (6 params + output options) | covered (re-grounded) | — |
| Submit builds the report parameter set | submit slice; slices.md | `payload` useMemo → `POST /reports/designated-marks-exception` | `parameters.feature` `@p1` (defaults: both reg/dists ALL, slots absent) | covered (re-grounded) | — |
| Six designated-mark inputs | slices.md (6 discrete fields) | `MultiValueInput` → `mark1..6`, unfilled slots OMITTED | `parameters.feature` `@p1` (3 marks; slot 4 absent) | covered (re-grounded) | — |
| Six scale-site inputs | slices.md (6 discrete fields) | `MultiValueInput` → `site1..6`, unfilled slots OMITTED | `parameters.feature` `@p1` (2 sites; slot 3 absent) | covered (re-grounded) | — |
| Mark Reg / Dist filter | slices.md controls | `markRegDist || 'ALL'` | `parameters.feature` `@p1` ×2 (default ALL; DCC) | covered | — |
| Scale Site Reg / Dist filter | slices.md controls | `siteRegDist || 'ALL'` | `parameters.feature` `@p1` (asserted ALL while mark side is DCC) | covered | — |
| Date window | slices.md date catalog | `fromDate`/`toDate`, omitted when blank | `parameters.feature` `@p2` + defaults (absent) | covered | — |
| Email delivery instead of preview | S02-equivalent | `preview:false` + recipient | `parameters.feature` `@p1` | covered | — |
| ERR email required when Preview=No | S06-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `validation.feature` `@p1` | covered | — |
| ERR invalid email format | S07-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `validation.feature` `@p1` | covered (re-grounded) | — |
| From/To date validation | legacy `errors.from_to`, `isDate()` | **absent** on this screen | — (single repro on the archetype) | **divergence (RED elsewhere)** | `../uc-rpt-010-scaler-register/defects.md` #1, #2 |
| **Report actually renders (`SCS_REP002`)** | legacy happy-path delivery slice | `POST /reports/...` -> Jasper -> real document | `generation.feature` `@p1 @generation` (real PDF with BOTH org units and both slot families populated) | **covered (real)** | was `../uc-rpt-010-scaler-register/defects.md` #3, now CLOSED |
| Delivery / download / submit error | delivery slices | shared `ReportPage` + `useReportDownload` | — (authored on the archetype) | covered (archetype) | — |
| Role-gated Reports menu visibility | S08-equivalent | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |
| Reset returns parameters to defaults | slices.md control catalog | `onReset` | — | deferred | Coverage gap #2 |

**Symmetry check.** The two multi-value sides are filled **asymmetrically** (3 marks, 2 sites) and the two
Reg/Dist controls are set **independently** (mark side = DCC, site side left ALL) — both on purpose: a
copy-paste bug crossing one side's values or org unit onto the other's fields would fail here, where a symmetric
fixture could not tell the two apart. Both email arms covered with the prove-the-negative.

**Role / permission coverage:** **blocked by single-role mock auth** — mock auth grants only `SCS_SYS_ADMIN`.

**Coverage gaps.**
1. Role gating (blocked by mock auth) — see defects.md #1.
2. Reset is not asserted on this screen (it is covered on four other report screens, incl. the archetype, and
   this screen's `onReset` follows the same shape) — see defects.md #2.

**Coverage gate (over coverage-eligible items, excluding `blocked` and the archetype-covered row):** 10 of 11
covered; the 1 uncovered is the deferred Reset assertion. The date-validation divergences are filed against the
archetype (single repro by design). **P0 n/a · P1 100%** covered.

**Status values:** `covered` · **`covered (real)`** (rendered end-to-end through JasperServer, downloaded
bytes asserted) · `covered (re-grounded)` · `covered (archetype)` · `deferred` (see Coverage gaps) ·
`divergence (RED elsewhere)` · `blocked` (auth: mock role).

**How to run.** The `@generation` scenarios are slow and contend for render slots — run them with limited
parallelism (`npm run test:generation`, which pins one worker); CI already runs the whole suite serially.
See `../uc-rpt-010-scaler-register/defects.md` #4.
