# Coverage — UC-CHK-008 View Site Check-Scale List

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-CHK-008-S01..S06.feature` + `UC-CHK-008-slices.md` (control/message
matrix) + `UC-CHK-008-technical.md` (STA-001..004, CNT-001), against the new app's read path:
`pages/View/ScaleSite/components/tabs/CheckScalesTab.tsx` (filter + summary table + empty state — **no
statistics section**, unlike the scaler tab), the shared `components/core/CheckScaleSummaryTable`
(14-column table), and `services/checkScales.service.ts` →
`GET /api/scale-sites/{scaleSiteIdNmbr}/check-scales?checkScaleTypeCode=` (backed by
`scs_cs_site_summry_vw_pkg.search_recs`).

**Re-grounding — legacy standalone screen → Scale Site view tab; sibling of UC-CHK-007.** Legacy
`.scaleSiteCheckScales` (P057) is a standalone Struts screen driven by a session *tombstone*; the new app
renders the list as the **Check Scales tab** inside the Scale Site view
(`/scale-sites/view/{site}?tab=check-scales`). It shares the exact `CheckScaleSummaryTable` with the
scaler tab (UC-CHK-007), so the 14 columns, the Check Scale # link, and the Add button behave identically
— the difference is (a) the filter is by **check-scale type code** (`checkScaleTypeCode`: FST/SEC/…), not
licence role, and (b) there is **no statistics section**. The legacy select+**Refresh** submit is
re-grounded to a filter `Select` that auto-refreshes. **No per-element permission gating** (consistent
with every CHK UC).

**Test data (all permanent, read-only — no mutation, no cleanup):** pinned + ground-truthed against the
live endpoint 2026-07-13. Scale site **28E** holds the permanent detail record **145761** (type `FST`);
scale site **13A** exists but has **no** check scales. **Parallel-safe by design:** assertions check the
*presence/absence of the specific id 145761* under each filter — never row counts — because create suites
transiently add rows to site 28E's list (detail + summary create both use site 28E). 13A is used by
**no** create test, so its empty state is stable.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy path — full site list, unfiltered (BR-01, CNT-001) | S01 / slices:49-88, technical | default (no type filter) → `getScaleSiteCheckScales` (tab.tsx:28-39) | check-scale-site-list `@S01 @p1` (28E lists 145761) | covered | — |
| 14-column Check Scale Summary table | S01 / slices:26 | shared `CheckScaleSummaryTable` headers (index.tsx:45-154) | check-scale-site-list `@S01` (representative headers asserted) | covered | — |
| Check Scale # rendered as a link to the view (STA-001 granted) | S01/S05 / slices:235 | `RouterLink` to `/check-scales/view/{id}` (summary table:51-61) | check-scale-site-list `@S01` (145761 link href) | covered (re-ground) | — |
| Add Check Scale button rendered (STA-003 granted) | S01/S05 / slices:76 | `renderAddCheckScaleAction` always rendered (tab.tsx:43-49) | check-scale-site-list `@S01` (Add button visible) | covered (re-ground) | — |
| Empty list — no check scales at the site (STA-004) | S02 / slices:92-130 | `EmptySection` "No check scales found" (tab.tsx:117-123) | check-scale-site-list `@S02 @p2` (13A empty) | covered | — |
| Filter by check-scale type narrows the list (BR-01, CNT-001) | S03 / slices:134-171 | filter `Select` → `?checkScaleTypeCode=` (tab.tsx:51-70) | check-scale-site-list `@S03 @p1` (FST present / SEC absent) | covered | — |
| Filter returns no results → empty state (STA-004) | S04 / slices:175-213 | same empty branch when filtered set is empty (tab.tsx:117) | check-scale-site-list `@S03 @S04 @p1` (28E + SEC → 145761 absent, list empty) | covered | — |
| Permission-gated controls hidden — Check Scale # plain text / Add hidden (STA-001/002 denied) | S05 / slices:217-255 | **no control gating** — the tab renders every control for any role that can read it | (re-grounded positive covered in S01) | not-applicable | Coverage gap #1 → product question in `uc-chk-004-delete/defects.md` gap #3 |
| No site context in session tombstone → input forward | S06 / slices:259-295 | **no session-tombstone mechanic** — site id comes from the URL | — | not-applicable | Coverage gap #2 |

**Symmetry check:** the filter matrix covers both arms — a type the site's record *is* (FST → 145761
present) and one it *is not* (SEC → 145761 absent, which also exercises S04's empty-filtered-result). This
UC is the **sibling of UC-CHK-007**: same `CheckScaleSummaryTable` on the Scale Site tab instead of the
Scaler tab; 007 covers the licence-role filter + statistics, 008 covers the type-code filter (no stats).

**Role / permission coverage (re-grounded 2026-09-02):** the "blocked by mock auth" reason is retired —
PR #240's role switcher means any column can be signed in as, and route/endpoint denial for these tabs is
asserted per role in the `sec` suites, so the wrong-role row is `covered elsewhere`. What remains
`not-applicable` is control hiding: this screen gates no controls, and `sec`'s sweep is tab-scoped for the
*record* tabs rather than these list surfaces. The single open product question about control gating lives
in `uc-chk-004-delete/defects.md` gap #3.

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` (legacy-only mechanic) ·
`covered elsewhere` (asserted in the `sec` role suites). No divergences, no `blocked` rows.
