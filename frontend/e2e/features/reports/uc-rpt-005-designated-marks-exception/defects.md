# Defects — UC-RPT-005 Generate Designated Marks Exception Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

No bugs or divergences are unique to this screen. Two coverage gaps and the suite-wide environment blocker.

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

### #3 A real timber mark is refused as "does not exist" — **FIXED 2026-10-01** (found 2026-09-30)

- **What's wrong.** Pressing Send first checks that every Designated Mark really exists. The check looks marks up
  in a different place than legacy did and misses marks legacy accepted, so a valid mark blocks the report.
- **Expected vs actual.** Enter `ES20R4` → legacy runs the report. The new screen shows "A Timbermark for
  ES20R4 does not exist in the system." and sends nothing.
- **How we caught it.** `parameters.feature` "A timber mark legacy accepts is not refused as unknown" (stays RED; split out of
  the fan-out scenario on 2026-09-30 so the fan-out itself stays tested). ES20R4 is in `HAULING_AUTHORITY` (1 row) but not in `HAULING_MARK_AUTHORIZATION`
  (0 rows); `GET /api/haul-mark-authorizations/search?timberMark=ES20R4` → `[]`. Full evidence table on
  UC-RPT-012 defects.md #4.
- **Test mark changed to `AB6633` (2026-09-30), and what that showed.** `ES20R4` made the test flaky: MSD create
  inserts a `HAULING_MARK_AUTHORIZATION` row, and the suite designates `ES20R4` (MSD-001/002, RPT-009 letter
  seeds, the workbench seed), so while any of those seeds existed `ES20R4` passed the new check and the scenario
  went green. That also sharpens the root cause: the new check effectively asks "does this mark have a
  designation / hauling-mark authorization?", where legacy asked "is it a hauling authority?". `AB6633` is in
  `HAULING_AUTHORITY`, has no `HAULING_MARK_AUTHORIZATION` row, is not a scale site, and no scenario touches it,
  so the reproduction no longer depends on what else is running. The `ES20R4` evidence above stands as recorded.
- **Why (technical).** Legacy `ReportValidator` → `HaulingMarkAuthorityDelegate.findByTimberMark` →
  `scs_hauling_authority_pkg` (`HAULING_AUTHORITY`). The new `pages/Reports/DesignatedMarkException/index.tsx`
  calls `searchHaulMarkAuthorizations` (`scs_haul_mark_auth_srch_vw_pkg`, a narrower view). Same root cause
  and same fix as UC-RPT-012 #4.
- **Also affected:** `generation.feature` submits `L44804, ES20R4` and will fail the same way (unless an
  `ES20R4` designation happens to exist at that moment) in the
  `@generation` pass (not part of the 2026-09-30 baseline).
- **Recommended fix — documented, NOT implemented (2026-09-30).** Same fix as UC-RPT-012 #4, which has the
  full plan: add a `SCS_HAULING_AUTHORITY_PKG.SEARCH_RECS` lookup, repoint `timberMarkExists()` at it, validate
  server-side in `ReportService`, and switch this screen's pre-check off `searchHaulMarkAuthorizations`.
- **FIXED 2026-10-01** with UC-RPT-012 #4 (same root cause, same change — details there): the shared rule reads
  `HAULING_AUTHORITY`, the endpoint validates each `markN` server-side (`ReportReferenceValidator`, legacy
  wording), and this screen's pre-check calls `GET /api/timber-marks/exists`.
- **Action / Status / Test.** **Status: FIXED** (pending BA/QA close-out). Tests: `parameters.feature` "A timber
  mark legacy accepts is not refused as unknown" (tag removed; now a regression guard) and the new "An unknown
  timber mark is refused against the marks field"; frontend `DesignatedMarkException/index.browser.test.tsx`.

### #4 Designated Sites were never checked — **FIXED 2026-10-01** (found while fixing #3)

- **What was wrong.** Legacy refused an unknown Designated Site on Send ("A Scale Site for {0} does not exist in
  the system."); the new screen checked marks only, so a mistyped site silently produced a report filtered on a
  site that does not exist.
- **Legacy evidence.** `DesignatedMarksExceptionReportForm.validate` → `validateDesignatedSite` →
  `ReportValidator.doesSiteExist` (`ScaleSiteDelegate.findBySiteId`, an exact read), key `errors.site.exist`.
- **Fix.** The screen checks each site with an exact site-number match (the search endpoint matches partially,
  so `52` must not pass on site `520`) and flags it on the Scale Sites field; `ReportReferenceValidator` checks
  each `siteN` on the server (`ScaleSiteService.scaleSiteExists`). Mark and site results are shown together.
- **Status: FIXED** (pending BA/QA close-out). Tests: `parameters.feature` "An unknown scale site is refused
  against the sites field" (`ZZZ9`); backend `ReportReferenceValidatorTest`; frontend
  `DesignatedMarkException/index.browser.test.tsx` (unknown site, partial match refused, mark + site together).

---

## Coverage gaps

### #1 — Role-gated Reports menu is not automatable

- **What's missing.** The legacy role-gated-menu slice needs a user **without** the report permission.
- **Why.** The new app recognizes a single authority (`SCS_SYS_ADMIN`) and mock auth grants it to every session;
  gating is at the route level (`ProtectedRoute`), not the menu. Same blocker across every RPT UC.
- **Status: OPEN** (test author, once finer-grained roles land — the mock auth is single-role).

### #2 — Reset is not asserted on this screen

- **What's missing.** No scenario presses **Reset** and checks the parameters return to their defaults.
- **Why deferred rather than a gap worth a red.** Reset IS asserted on four other report screens (the archetype
  UC-RPT-010, plus UC-RPT-011, UC-RPT-012, UC-RPT-015 and UC-RPT-006), and this screen's `onReset` follows the
  same shape as those. The one screen where Reset actually misbehaves was found that way (UC-RPT-011 Bug #1), so
  the pattern is known to be worth checking — this screen simply has not had it added yet.
- **How to close it.** Add a Reset scenario to `validation.feature` covering both Reg/Dist controls, both pill
  fields, both dates, and the output options — note this screen has the most state to clear of any report screen,
  which is exactly why it is worth doing.
- **Status: OPEN** (test author).

---

## Environment blockers — **RESOLVED 2026-08-11**

Jasper report generation used to return HTTP 500 on the running stack, so no report rendered end-to-end. The
local report engine now works and this report was verified rendering for real — see
[`../uc-rpt-010-scaler-register/defects.md`](../uc-rpt-010-scaler-register/defects.md) **#3** (closed) for the
detail, and **#4** for the render-time/concurrency limits that replaced it as the live constraint.
**Status: CLOSED** (environment; no ticket needed). Generation is now covered by this UC's
`generation.feature`.

---

## Verified — not a defect

### The route is singular but the API path is plural

`/reports/designated-mark-exception` (screen) vs `/api/reports/designated-marks-exception` (endpoint). This looks
like a typo on one side, but both spellings are intentional in the current code and consistent between the
screen and `services/reports.service.ts`. Flagged here so nobody "fixes" one side alone and breaks the screen —
the tests exercise both spellings, so such a change would fail fast. Not a defect.
