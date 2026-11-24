# Defects — UC-RPT-011 Generate Scale Site Register Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

---

## Bugs / Regressions

### #1 — Reset changed the report's sort order instead of restoring it — **FIXED 2026-08-11**

- **What was wrong.** The form opened with **Primary sort = "Scale Site Number"**, but pressing **Reset** set it
  to **"Scale Site Name"** — a different value from the one the form loaded with. Reset therefore did not undo
  the user's edits; it left the report sorted differently from a freshly-opened form, and a user who reset and
  submitted got a differently-ordered report (payload `primarySort` 1 → 2). Everything else Reset did was
  correct.
- **Why (technical).** Two different literals for the same default in one file:
  `useState('Scale Site Number')` for the initial render vs `setPrimarySort('Scale Site Name')` in `onReset`.
  A rename that missed one of the two call sites.
- **THE FIX — root cause, not symptom.** The default is now a single `DEFAULT_PRIMARY_SORT` constant that BOTH
  the initial state and `onReset` read, so the two cannot drift apart again. The same hardening was applied to
  the other two sortable report screens (Scaler Register, Scaling Exception): they happened to agree, but each
  repeated its default in two places exactly as this one did, so they were one rename away from the same bug.
- **Status: CLOSED.** **Tests:** `reset.feature` (renamed from `reset-bug.feature`, `@discovered-bug` removed) —
  `@p2` asserts the loaded value and the post-Reset value agree, and a second `@p2` scenario asserts a report
  submitted after Reset requests `primarySort: 1`, which is what the bug actually corrupted. Both green.
### #2 — An unknown Scale Site # produced an empty report instead of an error — **FIXED 2026-09-04**

- **What was wrong.** Typing a Scale Site # that matches no site (QA's repro: `TEST`) and pressing
  **Send / View Report** generated the report. Legacy blocked the submit and re-rendered the form with
  `A Scale Site could not be found for TEST.` (UC-RPT-011-S03, resource key `errors.mark_site_scale`). The
  damage is that the run SUCCEEDS: the filter matches nothing, so the user gets a document with no rows and
  no way to tell "this site has nothing to report" from "there is no such site" — the silent-empty-result
  failure mode, which is worse than an error.
- **Why (technical).** `pages/Reports/ScaleSiteRegister/index.tsx` passed `scaleSiteNumber` straight into the
  payload. `handleSend` validated the date window and nothing else; legacy's existence check
  (`ScaleSiteReportBo.validateScaleSiteRep` → `ScaleSiteDelegate.findBySiteId`) had no counterpart anywhere
  in the new screen, and the backend does not validate report parameters either — `P_SCALE_SITE_NMBR` goes to
  Jasper verbatim.
- **THE FIX.** `handleSend` now resolves a non-blank Scale Site # through `GET /api/scale-sites/search`
  BEFORE dispatching — the same lookup Create/Edit Mark Site Designation and Create/Edit Scaler Authorization
  already use for their own site fields — and blocks with the legacy message on the field itself when nothing
  matches. Two things fall out of doing it at submit time rather than as a pass-through: the entered value is
  trimmed and uppercased once and the RESOLVED value is what the report request carries (a lowercase entry
  used to clear straight through and then match nothing), and a lookup that FAILS blocks too — an unverified
  filter is not a verified one.
- **Status: CLOSED.** **Tests:** `validation.feature` — `@p1` asserts the message on the `site-number` field
  and 0 report requests, `@p2` asserts the error clears when the number is corrected and the resubmit sends
  `scaleSiteNumber "520"`. Component-level (mocked search, no stack): 7 assertions in
  `frontend/src/pages/Reports/index.browser.test.tsx` › `ScaleSiteRegisterPage scale site filter`, including
  the blank-filter case (no lookup, report still runs) and the failed-lookup case. Verified 6 of the 7 fail
  against the pre-fix screen.
### #3 — Scale Site # was case-sensitive and unbounded in length — **FIXED 2026-09-10**

- **What was wrong.** QA-DEV, two rules on one field. (a) `019v` did not match site `019V`. Note the shape of
  the failure: `GET /api/scale-sites/search` is **already** case-insensitive (probed 2026-09-10:
  `?scaleSiteIdNmbr=019v` returns `019V`), so a lowercase entry was never *rejected* — it cleared every
  check and then matched nothing in the report, producing an **empty document**. This is defect #2's
  silent-empty-result failure mode reappearing through the case path, which is why the fix has to land on the
  report parameter and not on the lookup. (b) The field accepted an entry of any length, though a
  `SCALE_SITE_ID_NMBR` is 4 characters — so anything longer could only ever be rejected, after spending a
  lookup to find that out.
- **Why (technical).** Two separate omissions, only one of them new:
  - **Case.** The screen-level fold (`normalizeSiteNumber`, trim + uppercase applied to both the lookup and
    the payload) landed on **2026-09-09** with defect #2's fix, one day before QA filed this — so (a) was
    reported against a DEV build that predates it, and the browser path was already correct when the ticket
    arrived. On that older build there was no existence check and no fold, so `019v` went to the report
    engine verbatim. The **server** side was still wrong either way: `ScaleSiteRegisterReportRequest.buildParameters` passed
    `scaleSiteNumber` through `normalizeForJasper`, which trims and maps `"ALL"` to blank but does **not**
    uppercase. It was the only site-number report request that skipped `upperOrNull` — both
    `MarkSiteDesignationReportRequest` and `DesignatedMarksExceptionReportRequest` already used it for their
    site and mark numbers. `P_SCALE_SITE_NMBR` reaches the report engine verbatim, so the case guarantee
    rested entirely on one client remembering to uppercase.
  - **Length.** No `maxLength` on the `site-number` TextInput. Legacy `scaleSiteRegister.jsp` declared
    `<html:text size="4" maxlength="4">`, and every legacy validator declared
    `MAXLENGTH_SCALE_SITE_ID_NMBR = 4`; Create/Edit Scale Site Authorization already carry `maxLength={4}` on
    their own Scale Site # fields. This screen simply never got it.
- **THE FIX.** `ScaleSiteRegisterReportRequest` now builds `P_SCALE_SITE_NMBR` as
  `normalizeForJasper(upperOrNull(scaleSiteNumber))` — legacy's setter behaviour, moved to the layer every
  caller passes through, so the fold no longer depends on the browser. `maxLength={4}` added to the
  `site-number` TextInput. Deliberately **not** added: a `@Size(max = 4)` bean-validation constraint on the
  request. No report request in this codebase length-validates a parameter, an over-long value is harmless
  once the screen blocks it, and rejecting it server-side would turn a filter typo into an API error.
- **Status: CLOSED.** **Tests:** `validation.feature` — `@p1 @VAL-scale-site-case-insensitive` submits `019v`
  and asserts the payload carries `019V` with no field error; `@p2 @VAL-scale-site-max-length` types `019VXX`
  and asserts the field holds `019V` (typed keystroke by keystroke via the new
  `I type ... character by character ...` step — `fill()` assigns the value directly and would bypass the cap
  entirely). Site `019V` is QA's own repro value and a confirmed seeded site. Below the browser:
  `ReportRequestParametersTest` → `ScaleSiteRegister` gains `scaleSiteNumber_isUppercasedForTheReportEngine`
  (`019v` → `019V`) and `scaleSiteNumber_isTrimmedAndBlankStaysBlank` (54 tests green); component-level,
  `Reports/index.browser.test.tsx` gains a `maxlength` assertion on the field (83 green).
  **Not yet run end-to-end:** the two `validation.feature` scenarios are authored, generate cleanly and
  typecheck, but the frontend dev server was down on this machine, so they have not been executed against a
  live stack — and the backend fix needs a rebuilt WAR before the server-side half is exercised.

---

## Divergences

### Date-window validation — **FIXED 2026-08-11** (was cross-referenced to the archetype)

This screen had neither the From-after-To check nor the unparseable-date check that legacy enforced. Both were
filed against the archetype (single repro by design) and **both are now closed**:

- **Divergence #1** (inverted window accepted) — **FIXED**. The ordering rule is now enforced here too, via the
  shared `utils/reportDateRange.validateReportDateRange` helper that all eight report screens use; the submit
  is blocked before dispatch. Message: "To Date must be on or after From Date." (the new app's own wording —
  a deliberate re-grounding, see the archetype entry).
- **Divergence #2** (mistyped date silently dropped) — **CLOSED as accepted**: the Carbon DatePicker discards
  unparseable text before it reaches the screen, so no bad date can reach the report; reporting an error would
  mean changing a component 39 files depend on.
- Detail, rationale and the closing evidence:
  [`../uc-rpt-010-scaler-register/defects.md`](../uc-rpt-010-scaler-register/defects.md) #1 and #2.
- **Status: CLOSED** (no ticket needed).
---

## Coverage gaps

### #1 — Role-gated Reports menu is not automatable

- **What's missing.** The legacy role-gated-menu slice needs a user **without** the report permission to be
  meaningful.
- **Why.** The new app recognizes a single authority (`SCS_SYS_ADMIN`) and mock auth grants it to every
  session; gating is at the route level (`ProtectedRoute`), not the menu. Same blocker across every RPT UC.
- **Status: OPEN** (test author, once finer-grained roles land — the mock auth is single-role).

---

## Environment blockers — **RESOLVED 2026-08-11**

Jasper report generation used to return HTTP 500 on the running stack, so no report rendered end-to-end. The
local report engine now works and this report was verified rendering for real — see
[`../uc-rpt-010-scaler-register/defects.md`](../uc-rpt-010-scaler-register/defects.md) **#3** (closed) for the
detail, and **#4** for the render-time/concurrency limits that replaced it as the live constraint.
**Status: CLOSED** (environment; no ticket needed). Generation is now covered by this UC's
`generation.feature`.
