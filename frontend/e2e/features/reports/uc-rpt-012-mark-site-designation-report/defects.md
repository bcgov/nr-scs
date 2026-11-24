# Defects — UC-RPT-012 Generate Mark Site Designation Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

One divergence is unique to this screen (#3, the paired date windows — now fixed on BOTH the screen and the
API). Two coverage gaps and the suite-wide environment blocker.

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
### #3 Paired date windows not enforced — **FIXED 2026-09-08** (QA-reported)

- **Reported by.** QA, 2026-09-08, against the Mark Site Designation **Report** screen.
- **What was wrong.** Legacy made each date window ALL-OR-NOTHING: enter a From with no To (or a To with no
  From) and the report was refused. The new screen had no such rule, so a half-filled window generated the
  report — an unbounded query the user did not ask for. Repro: enter Effective Date (From) only, Send →
  report generated.
- **Legacy evidence.** `MarkSiteDesignationReportBo.validateDates` (lines 477-500) raises
  `errors.mark_site_eff_date_both` / `errors.mark_site_exp_date_both` on the XOR of each pair, in both
  directions. `MarkSiteDesignationReportForm.validate` calls it on every submit.
- **Why it was missed.** The 2026-08-11 date-validation sweep closed the ORDERING rule across all eight report
  screens via the shared `utils/reportDateRange` helper, and this UC's date row was cross-referenced to the
  archetype's defects on that basis. But pairing is **not** an archetype rule — it is the one date rule legacy
  applied to this screen alone, so it fell outside the sweep and outside the single-repro-on-the-archetype
  convention that hid the row from per-UC review.
- **Second miss — the API (found in review, not by the suite).** The first fix was screen-only, so the
  endpoint still answered 200 for the identical payload: a caller POSTing to
  `/api/reports/mark-site-designation` by hand got the unbounded report the screen now refuses. Legacy did
  not have that hole, because its validation lived on the SERVER (`MarkSiteDesignationReportBo` is a
  business object behind the Struts action, not a script in the page) — so "the screen blocks it" was never
  parity. **The general lesson for this suite:** every rule recovered from a legacy `*Bo.validate*` method
  is a SERVER rule first. Porting it to the React screen alone reproduces the message, not the enforcement,
  and the e2e suite cannot see the difference — its report scenarios assert through the browser, where the
  screen's own guard fires before any request is made.
- **Fix, screen.** A third opt-in tier on the shared helper, `pairedRequired`, alongside the existing
  `required` and `maxYears`. Default OFF: the other eight screens accept a half-open window on purpose, and
  legacy agreed. Wired on this screen only, via the module-level `EFFECTIVE_WINDOW` / `EXPIRY_WINDOW`
  constants in `pages/Reports/MarkSiteDesignation/index.tsx`, so the change-mode and submit-mode call sites
  cannot drift.
- **Fix, API** (added on review of PR 292 — see "Second miss" below). `ReportService`
  `validateMarkSiteDesignationReportRequest`, called at the TOP of
  `fetchMarkSiteDesignationReportResponse`, before the preview/async branch — placing it any deeper would
  miss the `preview=false` path, which answers 202 and renders on a background thread where a throw can no
  longer reach the caller. It throws `FieldValidationException` (400 + per-field messages) rather than the
  `BadRequestException` its District Performance sibling uses, because legacy accumulated BOTH windows into
  `ActionErrors` and only the per-field shape can report both at once under field names matching the
  request body and the screen. Ordering is deliberately NOT added there: legacy's `isDate`/from-to block on
  this screen is commented out, so the screen's ordering rule comes from the shared frontend helper, not
  from this report's spec.
- **Two deliberate behaviours worth knowing.**
  - **The message lands on the FROM field in both directions**, even when it is the To date that is missing.
    That is what legacy did (`Constants.MARK_SITE_DESIGNATION_REPORT_EFF_FROM_DATE` for both arms) and it
    matches the screenshot on the QA ticket. It reads slightly oddly next to a filled, valid From input; it is
    parity, not an oversight.
  - **The rule gates SENDING, not typing.** Half-filled is the normal state between the two dates, so nothing
    goes red until Send — same treatment the `required` tier already gets.
- **Message re-grounding.** Legacy: "If a value is entered in either The Effective From date field or the
  Effective To date field, then a value must be entered in both." New: the same sentence with the new app's
  field labels — "If a value is entered in either Effective Date (From) or Effective Date (To), then a value
  must be entered in both." (The legacy labels no longer exist on the screen.)
- **Coverage added.** `validation.feature` — four scenarios: each window From-only and To-only, each proving
  the other window is not implicated, plus both-half-filled at once. Unit: 8 cases on the helper in
  `utils/reportDateRange.unit.test.ts`. Browser: 5 in `pages/Reports/index.browser.test.tsx`. Verified as a
  genuine regression guard — 4 of the browser tests and all 4 e2e scenarios fail with the fix reverted.
- **Coverage added, API.** 9 cases in `ReportServiceTest` (backend) under the "paired date windows" block:
  each window From-only and To-only, both-half-filled reported together, the `preview=false` async path, a
  null request, and the two ACCEPT cases — a fully populated window and an entirely empty one. That last
  one is the pairing-vs-`required` distinction, and is the case a validator written as "both are required"
  would break while satisfying every rejection case. Each rejection asserts the report was never RENDERED
  (`verifyNoInteractions(client)`), not merely that a throw happened — no document produced is the actual
  bug. Verified as genuine regression guards: 7 of the 9 fail with the guard removed, and the two that do
  not are the ACCEPT cases, which are expected to pass either way. Full backend suite green (1753).
- **Not covered at e2e level.** The API rule has no `.feature` scenario. The `@rpt` suite drives the
  browser and stubs `**/api/reports/**` at the page, so an HTTP-level assertion would need the security
  suite's `ApiAccessProbe` machinery, which no non-security feature currently uses. The backend tests above
  carry it instead; adding an rpt-level API probe is a suite-shape decision, not a gap in this fix.
- **Status: CLOSED.**

---

### #4 A real timber mark is refused as "does not exist" — **FIXED 2026-10-01** (found 2026-09-30)

- **What's wrong.** Since #289, pressing Send first checks that every Specific Timber Mark / Scale Site # really
  exists. The check looks marks up in a different place than legacy did, and it misses marks legacy accepted —
  so a user entering a valid mark is told it doesn't exist and can't run the report.
- **Expected vs actual.** Enter `ES20R4` → legacy runs the report. The new screen shows "A Site nor Timbermark
  for ES20R4 exist in the system." and sends nothing.
- **How we caught it.** `parameters.feature` "A timber mark legacy accepts is not refused as unknown"
  (stays RED; split out of the fan-out scenario on 2026-09-30 so the fan-out itself stays tested). Read-only DB check, 2026-09-30:

  | Mark | `HAULING_AUTHORITY` (legacy's source) | `HAULING_MARK_AUTHORIZATION` (behind the new check) |
  |---|---|---|
  | L44804 | 1 | 2 |
  | ES20R4 | **1** | **0** |

  `GET /api/haul-mark-authorizations/search?timberMark=ES20R4` → `[]`. ES20R4's `HAULING_AUTHORITY` row is real
  extract data (see `fixtures/msd/msd-test-data.ts`), not a suite seed.
- **Test mark changed to `AB6633` (2026-09-30), and what that showed.** `ES20R4` made the test flaky: MSD create
  inserts a `HAULING_MARK_AUTHORIZATION` row, and the suite designates `ES20R4` (MSD-001/002, RPT-009 letter
  seeds, the workbench seed), so while any of those seeds existed `ES20R4` passed the new check and the scenario
  went green. That also sharpens the root cause: the new check effectively asks "does this mark have a
  designation / hauling-mark authorization?", where legacy asked "is it a hauling authority?". `AB6633` is in
  `HAULING_AUTHORITY`, has no `HAULING_MARK_AUTHORIZATION` row, is not a scale site, and no scenario touches it,
  so the reproduction no longer depends on what else is running. The `ES20R4` evidence above stands as recorded.
- **Why (technical).** Legacy `MarkSiteDesignationReportBo.validateSitesAndMarks` →
  `HaulingMarkAuthorityDelegate.findByTimberMark` → `HaulingAuthorityDb.search` → `scs_hauling_authority_pkg`
  (the `HAULING_AUTHORITY` table). The new `pages/Reports/MarkSiteDesignation/index.tsx` calls
  `API.haulMarkAuthorization.searchHaulMarkAuthorizations`, backed by `scs_haul_mark_auth_srch_vw_pkg` — a
  narrower view. The site half of the check is unaffected. The same fault is on UC-RPT-005 (its defects.md #3);
  one fix (point both screens at a `HAULING_AUTHORITY` lookup) closes both.
- **Also affected:** `generation.feature` submits `L44804, ES20R4` and will fail the same way (unless an
  `ES20R4` designation happens to exist at that moment) in the
  `@generation` pass. Not re-tagged here — that pass was not part of the 2026-09-30 baseline.
- **Recommended fix — documented, NOT implemented (decision 2026-09-30: document and leave).** Needs BA/QA to
  confirm this is a bug and not an intended narrowing; it changes application code, so it belongs on its own
  branch/PR. Estimated about a day with tests. One fix closes this entry, UC-RPT-005 #3, and UC-CHK-005 #1.
  1. **Backend — add the lookup legacy used.** A repository method calling the existing
     `THE.SCS_HAULING_AUTHORITY_PKG.SEARCH_RECS(P_TIMBER_MARK, P_FOREST_FILE_ID, P_MARKING_METHOD_CODE,
     P_MARKING_INSTRUMENT_CODE, P_UPDATE_USERID, P_ENTRY_USERID)` (ref-cursor return; `buildSearchRecsCall(pkg,
     6)`) with only the mark set; "exists" = any row, exactly legacy `HaulingAuthorityDb.search`. No DB change.
  2. **Backend — repoint `HaulMarkAuthorizationService.timberMarkExists()`** at it. Its javadoc already claims to
     mirror legacy's hauling-authority search; only the source is wrong. This also fixes the summary check
     scale check (UC-CHK-005 #1), which is safe because `CHECK_SCALE.TIMBER_MARK`'s FK (`CKSC_HAA_FK`)
     references `HAULING_AUTHORITY` — the same table.
  3. **Backend — enforce the report rule server-side.** Legacy validated in `MarkSiteDesignationReportBo` /
     `ReportValidator`, on the server; today only the screen checks, so a direct API call skips it (the
     lesson from #3 above). `ReportService` validates each value — here, exact scale-site match first, else
     `timberMarkExists` — and answers 400 with one field error per value, worded as the screen's messages.
  4. **Frontend — switch the pre-check** in `pages/Reports/MarkSiteDesignation/index.tsx` and
     `pages/Reports/DesignatedMarkException/index.tsx` off `searchHaulMarkAuthorizations`. Preferred: a small
     endpoint backed by step 1 (e.g. `GET /api/timber-marks/{mark}/exists`), keeping instant per-value messages
     with step 3 as the enforcement. It needs an OpenAPI path and a `@RequiresPermission` that report users
     and check-scale roles both hold. Simpler alternative: drop the pre-check and map the 400's field errors.
  5. **Tests.** Backend unit tests for the repository call, `timberMarkExists` (a hauling-authority-only mark
     returns true) and the report validation. The two "legacy accepts" e2e scenarios then go green: drop
     `@discovered-divergence` and close this entry and #3. Add a check-scale scenario accepting `AB6633`.
  - **Match semantics:** `SEARCH_RECS` may match partially, as legacy's "any row is a hit" did. Mirroring
    legacy means accepting that; an exact-match rule would be stricter than legacy.
- **FIXED 2026-10-01** (branch `bugfix/mark-sight-designation-report-bugs`), restoring legacy behaviour as
  planned above:
  - `HaulingAuthorityRepository.timberMarkExists` calls `scs_hauling_authority_pkg.search_recs` with the mark
    only (legacy `HaulingAuthorityDb.search`). The rule moved out of `HaulMarkAuthorizationService` (which now only
    searches authorizations) into a new `TimberMarkService.timberMarkExists` that uses it, so
    the shared rule reads `HAULING_AUTHORITY` (this also fixes UC-CHK-005 #1).
  - Server-side: `ReportReferenceValidator` runs from `ReportService.validateMarkSiteDesignationReportRequest`
    before the preview/async branch — each `siteMarkN` must be a scale site or a timber mark, legacy wording,
    one field error per value (joined with the paired-date errors, as legacy's single `ActionErrors` was).
  - The screen's pre-check calls the new `GET /api/timber-marks/exists` (`REPORT_READ`) instead of the
    haul-mark search. The site half is unchanged.
  - Matching stays exact (both the old view search and `SEARCH_RECS` use `LIKE` without added wildcards —
    verified: fragments such as `GE54` match nothing in either).
- **Action / Status / Test.** **Status: FIXED** (pending BA/QA close-out). Tests: `parameters.feature` "A timber
  mark legacy accepts is not refused as unknown" (tag removed; now a regression guard) and the new "A value that
  is neither a scale site nor a timber mark is refused" (`A12345`); backend `ReportReferenceValidatorTest`,
  `ReportServiceTest`, `TimberMarkServiceTest`, `HaulingAuthorityRepositoryTest`,
  `TimberMarkControllerTest`; frontend `MarkSiteDesignation/index.*.test.tsx`.

---

## Coverage gaps

### #1 — Role-gated Reports menu is not automatable

- **What's missing.** The legacy role-gated-menu slice needs a user **without** the report permission.
- **Why.** The new app recognizes a single authority (`SCS_SYS_ADMIN`) and mock auth grants it to every session;
  gating is at the route level (`ProtectedRoute`), not the menu. Same blocker across every RPT UC.
- **Status: OPEN** (test author, once finer-grained roles land — the mock auth is single-role).

### #2 — No scenario selects a real Mark Exceptions value

- **What's missing.** The Mark Exceptions dropdown is asserted to *render*, and `markExemption` is asserted to be
  *omitted when left blank*, but nothing selects an actual exemption code and asserts it reaches the payload.
- **Why.** The options are built at runtime from the live static LOV, filtered to
  `tableKey === 'EXEMPT_MARK_METHOD_CODE'` (`pages/Reports/MarkSiteDesignation/index.tsx`). This suite pins real
  data anchors and guards them in `preflight/anchors.setup.ts`; no exemption code is pinned today, and
  hard-coding one without a preflight guard would rot silently on a DB re-extract — the failure mode the
  preflight exists to prevent.
- **How to close it.** Pin a code in `fixtures/rpt/report-test-data.ts` (discover with
  `GET /api/static-lov` filtered to `EXEMPT_MARK_METHOD_CODE`), add a preflight assertion that it still
  resolves, then extend `parameters.feature` with a `markExemption` row. Low effort, deferred rather than
  skipped.
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

### The six discrete legacy inputs became one pill field

Legacy offered six separate "specific mark / site" text inputs; the new screen offers a single
`MultiValueInput` capped at six. This looked like a contract change at first, but the **API contract is
unchanged** — the payload still spreads the values onto flat `siteMark1..siteMark6` keys, and unfilled slots are
omitted rather than sent empty (asserted in `parameters.feature`). Deliberate UI modernization, not a defect.
Recorded so nobody re-investigates it.

### The cap is enforced by disabling the field, not by truncating the payload

Adding a seventh value is impossible: `MultiValueInput` renders its input `disabled` once `maxItems` pills are
committed (discovered 2026-08-11 when an attempted 7th entry timed out on the disabled input). The payload's own
`.slice(0, 6)` is therefore unreachable defence-in-depth, not dead code. The test asserts the cap where it
actually lives. Not a defect.
