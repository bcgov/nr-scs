# Coverage — UC-RPT-011 Generate Scale Site Register Report

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-011-S*.feature` + `UC-RPT-011-slices.md`, against the new app's Scale Site
Register Report screen (route `/reports/scale-site-register` → `pages/Reports/ScaleSiteRegister` → shared
`components/core/ReportPage` / `SortOptions` / `ReportOutputOptions`; generate =
`POST /api/reports/scale-site-register` → `ReportController.fetchScaleSiteRegisterReport` → Jasper).

**Cross-repo dependency (2026-09-10).** The two Scale Site # input rules below (case-insensitive match,
4-character cap) are fixed in the **`nr-scs`** repo on branch **`bugfix/ssr-rep-ss-case-insensitive`**
(`dea6dcf`), not on `nr-scs` main. `@VAL-scale-site-max-length` is therefore **expected RED against main**
and that is not a test defect; `@VAL-scale-site-case-insensitive` is expected green on main already, because
the screen-level fold it asserts shipped with nr-scs #290 the day before the defect was filed. The
server-side half of the fix is not observable from a browser at all and is pinned by a unit test instead.
Which scenario needs what, and why: `validation.feature`'s header block + defects.md #3.

**Shared behaviour is authored once on the archetype.** All nine Reports-tab screens are the same `ReportPage`
tree, so the delivery split (preview→download / email→confirm), the `Content-Disposition` vs fallback download
filename rules, and the submit-error branch are covered in
[`../uc-rpt-010-scaler-register/delivery.feature`](../uc-rpt-010-scaler-register/delivery.feature) and are **not**
duplicated here. Report GENERATION, by contrast, IS authored per-UC: each report is a different Jasper
template that can break on its own. What IS authored per-UC: the render, the per-screen parameter MAPPING (the part that actually
differs), and the output-option validation (each screen wires its own `onValidationError` on its own route).

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

**Re-groundings.** Legacy Struts route + forward → SPA route `/reports/scale-site-register` + rendered `<h1>`.
Legacy server-side `ReportBo.validateEmail()` (JSP `<html:errors>` re-render) → client-side
`ReportPage.handleSend` before dispatch, so each negative also proves 0 requests fired. Legacy ERR "The Email
Recipient is not in a valid format." → "Email Recipient must be a valid email address."
Legacy ERR-001 `errors.mark_site_scale` is carried over VERBATIM ("A Scale Site could not be found for {0}.")
but re-grounded from a form-level `<html:errors>` banner onto the Scale Site # field's own inline message, and
from a server-side BO check to a pre-dispatch lookup on `GET /api/scale-sites/search` — the one validation on
this screen that is not purely client-side.
**Field rename worth noting:** the Auth Status control is `authorization-status` but the payload field is
`siteStatus`; and `authorizedScalersOnly` is sent hardcoded `false` with no control exposing it — both asserted
so a future change cannot alter the contract silently.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Parameter form renders full control set | S01-equivalent; slices.md controls | route → `ScaleSiteRegisterPage` + `ReportPage` | `navigation.feature` `@p1` (6 params + sort + output) | covered (re-grounded) | — |
| Submit builds the report parameter set | submit slice; slices.md | `payload` useMemo → `POST /reports/scale-site-register` | `parameters.feature` `@p1` ×2 (defaults; chosen filters/sort/format) | covered (re-grounded) | — |
| Scale Site # filter | slices.md controls | `scaleSiteNumber`, omitted when blank; trimmed + uppercased | `parameters.feature` `@p1` (defaults assert absent; chosen asserts `"520"`) | covered | — |
| **Scale Site # is matched case-insensitively** | `ScaleSiteReportBo.setScaleSiteNumber()` folds the case in the setter | screen uppercases before the lookup AND the payload; `ScaleSiteRegisterReportRequest` now routes `P_SCALE_SITE_NMBR` through `upperOrNull` so the fold does not depend on the client | `validation.feature` `@p1` (`019v` → no error, 1 call, payload `019V`) | **covered (fixed 2026-09-10)** | defects.md #3 CLOSED |
| **Scale Site # capped at 4 characters** | `scaleSiteRegister.jsp` `size="4" maxlength="4"`; `MAXLENGTH_SCALE_SITE_ID_NMBR = 4` | `maxLength={4}` on the `site-number` TextInput | `validation.feature` `@p2` (types `019VXX`, field holds `019V`) | **covered (fixed 2026-09-10)** | defects.md #3 CLOSED |
| **ERR-001 unknown Scale Site # blocks the run** | S03; `ScaleSiteReportBo.validateScaleSiteRep` (`errors.mark_site_scale`) | `handleSend` resolves the number via `GET /scale-sites/search` before dispatch → inline field error; **no** POST | `validation.feature` `@p1` (error on `site-number` + 0 calls) | **covered (fixed 2026-09-04)** | defects.md #2 CLOSED |
| Corrected Scale Site # clears the error and runs | S03 second scenario | `onChange` clears the field error; resubmit dispatches | `validation.feature` `@p2` (error → cleared → 1 call with `scaleSiteNumber "520"`) | **covered (fixed 2026-09-04)** | defects.md #2 CLOSED |
| Auth Status filter | slices.md controls | control `authorization-status` → payload `siteStatus` | `parameters.feature` `@p1` ×2 | covered (re-grounded) | — |
| Sort order (5 options) | slices.md sort catalog | `primarySortMap` 1–5; no secondary = 0 | `parameters.feature` `@p1` (Client Name=4, Scale Type=5) | covered | — |
| Email delivery instead of preview | S02-equivalent | `preview:false` + recipient | `parameters.feature` `@p1` | covered | — |
| Date window carried on the request | date slices | `payload` passes both dates | `parameters.feature` `@p2` | covered | — |
| ERR email required when Preview=No | S06-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `validation.feature` `@p1` (error + 0 calls) | covered | — |
| ERR invalid email format | S07-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `validation.feature` `@p1` (error + 0 calls) | covered (re-grounded) | — |
| Reset returns parameters to defaults | slices.md control catalog | `onReset` (single `DEFAULT_PRIMARY_SORT` constant shared with the initial state) | `reset.feature` `@p2` ×2 (loaded value == post-Reset value; post-Reset submit sends `primarySort: 1`) | **covered (fixed 2026-08-11)** | defects.md #1 CLOSED |
| From Date after To Date blocked | legacy `errors.from_to` | `utils/reportDateRange` → error + submit blocked | — (repro on the archetype; rule now shared by all 8 screens) | **covered (fixed 2026-08-11)** | `../uc-rpt-010-scaler-register/defects.md` #1 CLOSED |
| Unparseable date blocked | legacy `OAValidator.isDate()` | Carbon DatePicker discards unparseable text | — (accepted; pinned green on the archetype) | **covered (accepted re-grounding)** | `../uc-rpt-010-scaler-register/defects.md` #2 CLOSED |
| **Report actually renders (`SCS_REP007`)** | legacy happy-path delivery slice | `POST /reports/...` -> Jasper -> real document | `generation.feature` `@p1 @generation` (real PDF; `%PDF-` bytes) | **covered (real)** | was `../uc-rpt-010-scaler-register/defects.md` #3, now CLOSED |
| Delivery / download / submit error | S01/S02 delivery | shared `ReportPage` + `useReportDownload` | — (authored on the archetype) | covered (archetype) | — |
| Role-gated Reports menu visibility | S08-equivalent | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |

**Symmetry check.** Both email-validation arms covered, each with the prove-the-negative. Both delivery arms
covered (on the archetype). Sort mapping is asserted with a NON-default primary AND a secondary, so a
swapped-argument bug would fail. The Reg/Dist default (`ALL`) and a chosen value are both asserted.

**Role / permission coverage:** **blocked by single-role mock auth** — mock auth grants only `SCS_SYS_ADMIN`.

**Coverage gate (over coverage-eligible items, excluding `blocked` and the archetype-covered row):** **12 of 12
covered.** Nothing is deliberately red any more — the Reset bug was fixed 2026-08-11, the two
date-validation divergences were closed (one fixed, one accepted), and the unknown-Scale-Site-# bug was fixed
2026-09-04. **P0 n/a · P1 100%.**

**Status values:** `covered` · **`covered (real)`** (rendered end-to-end through JasperServer, downloaded
bytes asserted) · `covered (re-grounded)` · `covered (archetype)` (shared behaviour asserted in
UC-RPT-010) · `blocked` (auth: mock role).

**How to run.** The `@generation` scenarios are slow and contend for render slots — run them with limited
parallelism (`npm run test:generation`, which pins one worker); CI already runs the whole suite serially.
See `../uc-rpt-010-scaler-register/defects.md` #4.
