# Coverage — UC-RPT-010 Generate Scaler Register Report

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-010-S01..S08.feature` + `UC-RPT-010-slices.md`, against the new app's
Scaler Register Report screen (route `/reports/scaler-register` → `pages/Reports/ScalerRegister` → shared
`components/core/ReportPage` / `SortOptions` / `ReportOutputOptions`; generate =
`POST /api/reports/scaler-register` → `ReportController.fetchScalerRegisterReport` → Jasper `SCS_REP005`).

**This UC is the ARCHETYPE for the Reports tab.** All nine report screens are the same `ReportPage` tree
with different parameter children, so the shared behaviours (email/preview validation, the delivery split,
the download filename rules, the submit-error branch) are authored **once here** and cross-referenced from
the other eight UCs rather than duplicated eight times. The per-screen parameter MAPPING is authored in
every UC, because that is the part that actually differs.

**Environment note — the Jasper blocker is RESOLVED (2026-08-11).** Report generation previously returned
**HTTP 500** on every `POST /api/reports/*`, which forced the generation slices to be logged as env-blocked.
The local report engine now works: `POST /api/reports/scaler-register` filtered to one district returns
**200 · application/pdf · ~149KB in ~16s**, with `Content-Disposition: inline; filename="<uuid>.pdf"`.
Coverage was upgraded accordingly:

- **`generation.feature` (new)** — REAL end-to-end generation, nothing stubbed: Jasper renders `SCS_REP005`,
  the browser downloads the file, and the **saved bytes** are asserted (`%PDF-` / OLE2 magic, non-trivial
  size) along with the `<uuid>.<ext>` filename contract. Also the real XLS format switch and the real
  202-ack email path. These are the rows that used to read `blocked`.
- **`parameters.feature`** unchanged and still valuable: it asserts what legacy S01 actually asserted — the
  outbound **parameter set** ("the report Crystal parameters include `promptex-P_ORG_UNIT_CODE`,
  `promptex-P_LICENSE_STATUS`, `promptex-P_SITE_AUTH_STATUS`, `promptex-P_PRIMARY_SORT`") — captured in
  flight and asserted per field, which a rendered PDF cannot show.
- **`delivery.feature`** now covers only what real generation *cannot* reach: the `useReportDownload`
  **fallback** filename (the real backend always sends `Content-Disposition`, so the fallback branch is
  unreachable without suppressing it) and a non-UUID server filename proving the header is honoured verbatim.
  Its submit-error scenario now **injects** a 500 — that branch used to come free from the environment.

**Performance caveat (why generation scenarios filter).** Province-wide (Reg / Dist = All) exceeds **120s** on
this report; filtered to `DCC` it renders in ~16s, still the slowest of the nine. `ReportService` also caps
concurrent renders at **3** and makes a fourth caller queue up to 20s before a 503, so generation scenarios
are tagged `@generation` and given a longer per-test budget (`steps/fixtures/rpt.ts`).

**Re-groundings.** Legacy route `/scalerRegisterReport.do` + Struts forward `.scalerRegisterReport` (page
code R005) → SPA route `/reports/scaler-register` + rendered `<h1>`. Legacy ERR "The Email Recipient is not
in a valid format." → the new app's "Email Recipient must be a valid email address."; the
Preview=No-requires-email message is **verbatim**. Legacy S02's "no on-screen confirmation of email dispatch
is rendered" → the new app **does** confirm ("Report request submitted") — a deliberate improvement, not a
defect. Legacy server-side validation (`ReportBo.validateEmail()`, re-rendered JSP `<html:errors>`) → the new
app validates **client-side** in `ReportPage.handleSend` before dispatch, so each negative also proves 0
requests fired (the new-app equivalent of "no report is dispatched to JCRS").

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 parameter form renders full control set | S01 scenario 1 | route → `ScalerRegisterPage` + `ReportPage` | `navigation.feature` `@S01 @p1` (all 6 params + sort + output options) | covered (re-grounded) | — |
| S01 submit builds the report parameter set | S01 scenario 2; slices.md | `payload` useMemo → `POST /reports/scaler-register` | `parameters.feature` `@S01 @p1` ×2 (defaults; chosen filters/sort/format) | covered (re-grounded) | — |
| **S01 report actually renders (`SCS_REP005`)** | S01 (`HttpDelivery`) | `POST /reports/scaler-register` → Jasper → real PDF | `generation.feature` `@S01 @p1 @generation` (real download; `%PDF-` bytes; `<uuid>.pdf`) | **covered (real)** | was defects.md #3, now CLOSED |
| **S01 renders as MS Excel** | S01 (LOV `repOutout`) | `outputFormat:XLS` → `application/vnd.ms-excel` | `generation.feature` `@S01 @p1 @generation` (real download; OLE2 bytes; `<uuid>.xls`) | **covered (real)** | — |
| S01 preview delivered to the browser | S01 (`HttpDelivery`) | `handleSend` → `useReportDownload` + "Report Generated" | `generation.feature` (real) + `delivery.feature` `@S01 @p1`/`@p2` ×2 (verbatim server filename; PDF/XLS **fallback**, unreachable for real) | covered (real + stub for the fallback arm) | — |
| S02 email delivery instead of preview | S02 (`EmailDelivery`) | `preview:false` + recipient → 202 ack → "Report request submitted", no download | `generation.feature` `@S02 @p1 @generation` (real 202 + confirm + no download) + `parameters.feature` `@S02 @p1` (payload) | **covered (real)** | — |
| S06 + ERR email required when Preview=No | S06; slices.md | `ReportPage.handleSend` preview/email rule → inline error; **no** POST | `validation.feature` `@S06 @p1` (error + 0 calls) | covered | — |
| S07 + ERR invalid email format | S07; slices.md | `ReportPage.handleSend` email regex → inline error; **no** POST | `validation.feature` `@S07 @p1` + `@p2` (error + 0 calls; error clears) | covered (re-grounded) | — |
| S05 From Date after To Date blocked | S05 (`errors.from_to`) | `utils/reportDateRange` → error + `handleSend` returns before dispatch | `date-validation.feature` `@S05 @p1` (error + 0 calls) + `@S05 @p2` (clears on correction, then sends) | **covered (fixed 2026-08-11, re-grounded message)** | defects.md #1 CLOSED |
| S03/S04 unparseable From/To Date blocked | S03; S04 (`OAValidator.isDate()`) | Carbon DatePicker discards unparseable text, so no bad date can reach the report | `date-validation.feature` `@S03 @S04 @p2` (entry discarded; payload carries no `fromDate`) | **covered (accepted re-grounding)** | defects.md #2 CLOSED |
| Reset returns parameters to defaults | slices.md control catalog | `onReset` | `parameters.feature` `@S01 @p2` (6 controls + 0 calls) | covered | — |
| Report engine failure surfaces on screen | not in legacy (JSP had no such branch) | `handleSend` catch → "Unable to submit report" | `delivery.feature` `@p1 @error-branch` (**injected** 500) | covered (new-app behaviour) | — |
| S08 role-gated Reports menu visibility | S08 (`MenuUtils.getDistScaleManMenus()`) | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |
| Date window carried on the request | S03/S04 field catalog | `payload` useMemo passes both dates | `parameters.feature` `@S03 @S04 @p2` | covered | — |

**Symmetry check.** Both email-validation arms are covered (invalid-format and required-when-Preview-No),
each with the prove-the-negative. Both delivery arms are covered for real (preview→download,
email→202+confirm+no download), and both output formats are covered for real with format-specific magic-byte
assertions (`%PDF-` / OLE2) — so a response carrying one format's bytes under the other's extension would
fail. Both filename sources are covered (the real `<uuid>.<ext>` header, and the client-side fallback that
only a suppressed header can reach). Both date-validation arms are now green (one fixed, one accepted). The one uncovered arm is
role gating (S08), blocked by single-role mock auth.

**Role / permission coverage:** **blocked by single-role mock auth** (S08 needs a user *without* the
Reports menu / report permission); mock auth grants only `SCS_SYS_ADMIN` and the new app gates at the route
level.

**Coverage gate (over coverage-eligible items, excluding `blocked`):** **14 of 14 covered.** Nothing is
env-blocked and nothing is deliberately red any more — the two date-validation divergences were closed on
2026-08-11 (#1 fixed in the app, #2 accepted with the protective behaviour pinned green). **P0 n/a · P1 100%.**

**Status values:** `covered` · `covered (re-grounded)` · **`covered (real)`** (rendered end-to-end through
JasperServer, downloaded bytes asserted) · `covered (real + stub …)` (real path covered; a stub only for the
arm real generation cannot reach — see `delivery.feature` header) · `blocked` (auth: mock role).

**How to run.** The `@generation` scenarios are slow and contend for render slots — run them with limited
parallelism (`npm run test:generation`, which pins one worker); CI already runs the whole suite serially. See
defects.md #4.
