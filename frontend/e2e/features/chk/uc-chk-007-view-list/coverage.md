# Coverage — UC-CHK-007 View Scaler Check-Scale List

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-CHK-007-S01..S06.feature` + `UC-CHK-007-slices.md` (control/message
matrix) + `UC-CHK-007-technical.md` (STA-001..004, ERR-001), against the new app's read path:
`pages/View/Scaler/components/tabs/CheckScalesTab.tsx` (stats section + filter + summary table + empty
state), `components/core/CheckScaleSummaryTable/index.tsx` (the 14-column result table), and
`services/checkScales.service.ts` → `GET /api/scalers/{scalerLicenceNo}/check-scales?filter=` (backed by
`scs_check_scale_summary_vw_pkg.search_recs` + `scs_calc_check_scale_pkg.calculate_check_scale`).

**Re-grounding — legacy standalone list → Scaler view tab.** Legacy `.scalerCheckScales` (P012) is a
standalone Struts screen driven by a session *tombstone*; the new app renders the same list + statistics
as the **Check Scales tab** inside the Scaler view (`/scalers/view/{lic}?tab=check-scales`). The legacy
select+**Refresh** submit is re-grounded to a client-side filter `Select` that **auto-refreshes** (React
Query re-keys on the filter) — there is no Refresh button. There is **no per-element permission gating**
(consistent with every CHK UC): the Add Check Scale button and the Check Scale # link always render.

**Test data (all permanent, read-only — no mutation, no cleanup):** pinned from the seeded DB and
ground-truthed against the live scaler Check-Scales endpoint (real extract, 2026-07-15). Record **145988**
shows in scaler **7443**'s tab as **primary** and scaler **7444**'s tab as **check** (both have a working
view page, required for the tab route to render). Scaler **7225** exists but has **no** check scales.
**Parallel-safe by design:** assertions check the *presence/absence of the specific id 145988* under each
filter — never exact row counts — because UC-CHK create tests may transiently add rows to a scaler's list;
a count assertion would flake, a presence assertion does not. 7225 is used by **no** create test, so its
empty state is stable.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy path — list loads with default All filter; stats + summary table (BR-01 aggregation) | S01 / slices:48-96, technical:45-84 | `CheckScalesTab` default `filter='All'` → `getScalerCheckScales` (tab.tsx:78-89) | check-scale-list `@S01 @p1` (7443 lists 145988) | covered | — |
| Check Scale Statistics section rendered (Variance % × Volume/Value) | S01 / technical:54-63 | `StatsTable` (tab.tsx:44-73) | check-scale-list `@S01` (stats section asserted) | covered | — |
| 14-column Check Scale Summary table | S01 / technical:65-83 | `CheckScaleSummaryTable` headers (index.tsx:45-154) | check-scale-list `@S01` (representative headers asserted) | covered | — |
| Check Scale # rendered as a link to the view (STA-002 granted) | S01/S04 / technical:69,84 | `RouterLink` to `/check-scales/view/{id}` (summary table:51-61) | check-scale-list `@S01` (145988 link href) | covered (re-ground) | — |
| Add Check Scale button rendered (STA-001 granted) | S01/S04 / technical:51-52 | `renderAddCheckScaleAction` always rendered (tab.tsx:93-99) | check-scale-list `@S01` (Add button visible) | covered (re-ground) | — |
| Empty list — no check scales, no error banner (STA-004) | S02 / slices:100-138 | `EmptySection` "No check scales found" (tab.tsx:166-172) | check-scale-list `@S02 @p2` (7225 empty) | covered | — |
| Filter narrows the list to matching licence role (BR-01 filter logic) | S03 / slices:142-179, technical:170-177 | filter `Select` re-queries `?filter=` (tab.tsx:101-115) | check-scale-list `@S03 @p1` outline (All/Check/Primary × 7443/7444 presence of 145988) | covered | — |
| Filtered result empty → empty state (STA-004) | S03 (last scenario) | same empty branch (tab.tsx:166) | check-scale-list `@S03 @p1` outline (7443 Check → 145988 absent) | covered | — |
| Permission-gated controls hidden — Add hidden / Check Scale # plain text (STA-001/002 denied) | S04 / slices:183-221, technical:92-93 | **no control gating** — the tab renders every control for any role that can read it | (re-grounded positive covered in S01) | not-applicable | Coverage gap #1 → product question in `uc-chk-004-delete/defects.md` gap #3 |
| Scaler licence missing from session tombstone → input forward (STA-003) | S05 / slices:225-259, technical:94 | **no session-tombstone mechanic** — licence comes from the URL | — | not-applicable | Coverage gap #2 |
| Unauthorized role → notAuthorized (SCSRoleException) | S06 / slices:263-293 | `ProtectedRoute` + `@RequiresPermission(SCALER_CHECK_SCALE_QUERY)` | `sec/*/url-access.feature` (scaler record refused per role) + `api-access.feature` (`/scalers/{lic}/check-scales`) | covered elsewhere | Coverage gap #3 CLOSED |
| Column-sort re-order | slices:44 (excluded) | client-side sort in `CheckScaleSummaryTable` | — | not-applicable (excluded by source) | — |

**Symmetry check:** the filter matrix covers both arms per scaler — the role the scaler *holds* (145988
present) and a role it *doesn't* (145988 absent): 7443 All=present / Check=absent; 7444 Check=present /
Primary=absent. Sibling **UC-CHK-008** covers the same list rendered on the Scale Site tab (shared
`CheckScaleSummaryTable`).

**Role / permission coverage (re-grounded 2026-09-02):** the "blocked by mock auth" reason is retired —
PR #240's role switcher means any column can be signed in as, and route/endpoint denial for these tabs is
asserted per role in the `sec` suites, so the wrong-role row is `covered elsewhere`. What remains
`not-applicable` is control hiding: this screen gates no controls, and `sec`'s sweep is tab-scoped for the
*record* tabs rather than these list surfaces. The single open product question about control gating lives
in `uc-chk-004-delete/defects.md` gap #3.

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` (legacy-only mechanic) ·
`covered elsewhere` (asserted in the `sec` role suites). No divergences, no `blocked` rows.
