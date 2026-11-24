# Coverage — UC-RPT-012 Generate Mark Site Designation Report

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-012-S*.feature` + `UC-RPT-012-slices.md`, against the new app's Mark Site
Designation **Report** screen (route `/reports/mark-site-designation` → `pages/Reports/MarkSiteDesignation` →
shared `ReportPage`; generate = `POST /api/reports/mark-site-designation` → Jasper).

**Not to be confused with UC-RPT-009**, the per-record MSD **letter** (route
`/mark-site-designations/{id}/letter`), covered under
[`../../mark-site-designation/uc-rpt-009-msd-letter/`](../../mark-site-designation/uc-rpt-009-msd-letter/). This UC
is the LIST report over designations.

**Shared behaviour is authored once on the archetype** — the delivery split, download filename rules, and
submit-error branch live in
[`../uc-rpt-010-scaler-register/delivery.feature`](../uc-rpt-010-scaler-register/delivery.feature) because all
nine screens are the same `ReportPage` tree. Report GENERATION, by contrast, IS authored per-UC: each report is
a different Jasper template that can break on its own. Authored per-UC here: render, the per-screen parameter mapping,
and the output-option validation.

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
validation → client-side `ReportPage.handleSend` before dispatch (so each negative proves 0 requests). Legacy
ERR "The Email Recipient is not in a valid format." → "Email Recipient must be a valid email address."
**The structural re-grounding on this screen:** the legacy form's SIX discrete "specific mark / site" inputs
become ONE `MultiValueInput` pill field capped at six, which the payload spreads back onto the flat
`siteMark1..siteMark6` contract the API still expects. The six-slot API contract is unchanged; only the control
is. Also note the spelling difference the payload preserves: the control is "Mark Exceptions", the payload field
is `markExemption`.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Parameter form renders full control set | slices.md controls | route → `MarkSiteDesignationPage` + `ReportPage` | `navigation.feature` `@p1` (8 params + output options) | covered (re-grounded) | — |
| Submit builds the report parameter set | submit slice; slices.md | `payload` useMemo → `POST /reports/mark-site-designation` | `parameters.feature` `@p1` (defaults, incl. `markOrSite` MARK) | covered (re-grounded) | — |
| Six specific mark inputs | slices.md (6 discrete fields) | `MultiValueInput` → `siteMark1..6`, unfilled slots OMITTED | `parameters.feature` `@p1` (3 marks fan out; slots 4–6 absent) | covered (re-grounded) | — |
| Six-value cap | slices.md (6 fields max) | `MultiValueInput` disables its input at `maxItems`; payload `.slice(0,6)` | `parameters.feature` `@p2` (field goes read-only at six; all six slots sent) | covered (re-grounded) | — |
| Remove a specific value | slices.md (clearable fields) | pill "Remove {value}" → re-indexes the slots | `parameters.feature` `@p2` (removed value drops out; slot 2 absent) | covered | — |
| Timber Mark vs Scale Site mode | slices.md mode selector | `markOrSite` MARK/SITE + the field RELABELS | `parameters.feature` `@p1` (label switch + `markOrSite: SITE`) | covered | — |
| Mark Exceptions filter | slices.md (LOV `EXEMPT_MARK_METHOD_CODE`) | control `mark-exceptions` → payload `markExemption`, omitted when blank | `navigation.feature` (present) + `parameters.feature` `@p1` (absent by default) | covered (partial — see Coverage gap #2) | defects.md #2 |
| Effective + expiry windows | slices.md date catalog | `effectiveFrom/To`, `expiryFrom/To` | `parameters.feature` `@p2` (all four carried) | covered | — |
| Reg / Dist filter | slices.md controls | `regDist || 'ALL'` | `parameters.feature` `@p1` (default ALL) + `@p2` (DCC) | covered | — |
| ERR email required when Preview=No | S06-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `validation.feature` `@p1` | covered | — |
| ERR invalid email format | S07-equivalent | `ReportPage.handleSend` → inline error; **no** POST | `validation.feature` `@p1` | covered (re-grounded) | — |
| Reset returns parameters to defaults | slices.md control catalog | `onReset` (incl. clearing committed pills) | `validation.feature` `@p2` (4 controls + both pills + 0 calls) | covered | — |
| From/To date ORDERING validation | legacy `errors.from_to`, `isDate()` | shared `utils/reportDateRange` (both windows) | — (single repro on the archetype) | covered (fixed 2026-08-11) | `../uc-rpt-010-scaler-register/defects.md` #1, #2 (closed) |
| **Paired date windows (enter both or neither)** — screen | legacy `MarkSiteDesignationReportBo.validateDates`; `errors.mark_site_eff_date_both` / `..._exp_date_both` | `EFFECTIVE_WINDOW`/`EXPIRY_WINDOW` `pairedRequired` → shared `utils/reportDateRange` | `validation.feature` `@p1 @ERR-eff-date-both` ×2, `@p1 @ERR-exp-date-both`, `@p2` (both windows at once) | covered (fixed 2026-09-08) | defects.md #3 (closed) |
| **Paired date windows — API** | same legacy rule, enforced where legacy enforced it (server-side `*Bo`) | `ReportService.validateMarkSiteDesignationReportRequest` → 400 `FieldValidationException` | backend `ReportServiceTest` ×9 (no `.feature` — see note) | covered (fixed 2026-09-09) | defects.md #3 (closed) |
| **Report actually renders (`SCS_REP010`)** | legacy happy-path delivery slice | `POST /reports/...` -> Jasper -> real document | `generation.feature` `@p1 @generation` (real PDF with the six-slot mark filter populated) | **covered (real)** | was `../uc-rpt-010-scaler-register/defects.md` #3, now CLOSED |
| Delivery / download / submit error | delivery slices | shared `ReportPage` + `useReportDownload` | — (authored on the archetype) | covered (archetype) | — |
| Role-gated Reports menu visibility | S08-equivalent | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |

**Symmetry check — paired windows.** Each window is asserted in BOTH directions (From-only and To-only),
each is asserted NOT to implicate the other, and both-at-once is asserted so one failure cannot mask the
other. That an EMPTY window still submits — the distinction between pairing and `required` — is carried by
the default-parameter scenario in `parameters.feature`, which submits this report with no dates at all.
The API row repeats that same shape in `ReportServiceTest`, and adds the case the browser cannot reach: the
`preview=false` path, which answers 202 and renders on a background thread, so a guard placed any deeper
than the top of the response method would never reach the caller.

**Why the API row is separate.** The screen's guard and the server's are two different enforcements of one
legacy rule, and only the second is the one legacy actually had — `MarkSiteDesignationReportBo` sits behind
the Struts action, not in the page. A browser-driven scenario cannot tell them apart, because the screen
refuses before any request is made; that is how the API half was missed on the first pass and caught in
review of PR 292. Read the two rows as one rule with two call sites, and change neither alone.

**Symmetry check.** The multi-value fan-out is asserted in all three directions — filling *some* slots (rest
absent), filling *all* six (cap reached), and *removing* one (re-index) — which is what would catch an
off-by-one in the slot mapping. Both `markOrSite` modes are asserted, including the label switch that is the
only visible difference between them. Both email arms covered with the prove-the-negative.

**Role / permission coverage:** **blocked by single-role mock auth** — mock auth grants only `SCS_SYS_ADMIN`.

**Coverage gaps.**
1. Role gating (blocked by mock auth) — see defects.md #1.
2. Mark Exceptions is asserted as *present* and as *omitted when blank*, but no scenario selects a real
   exemption code, because the options come from the live static LOV (`EXEMPT_MARK_METHOD_CODE`) and no code is
   pinned/preflight-guarded for this suite — see defects.md #2.

**Coverage gate (over coverage-eligible items, excluding `blocked` and the archetype-covered row):** 14 of 14
covered (1 partial). The date-ORDERING divergences were filed against the archetype (single repro by design)
and are closed; the PAIRING rule is this screen's own and is asserted here at both call sites — the screen
in `validation.feature`, the endpoint in the backend suite.
**P0 n/a · P1 100%** covered or filed.

**Status values:** `covered` · **`covered (real)`** (rendered end-to-end through JasperServer, downloaded
bytes asserted) · `covered (re-grounded)` · `covered (partial)` · `covered (archetype)` ·
`divergence (RED elsewhere)` · `blocked` (auth: mock role).

**How to run.** The `@generation` scenarios are slow and contend for render slots — run them with limited
parallelism (`npm run test:generation`, which pins one worker); CI already runs the whole suite serially.
See `../uc-rpt-010-scaler-register/defects.md` #4.
