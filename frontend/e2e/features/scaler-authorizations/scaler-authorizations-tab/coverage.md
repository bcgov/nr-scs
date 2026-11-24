# Coverage — Scaler view "Authorizations" tab (UC-SCA tabs, Tier 3)

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Not a standalone legacy UC — this is the **navigation surface** that lists a scaler's authorizations on the
Scaler view and routes into the CRUD UCs. Reconciled against `AuthorizationsTab.tsx`
(`pages/View/Scaler/components/tabs/`), reached at `/scalers/view/{lic}?tab=authorizations`, backed by lazy
GET `/api/scalers/{lic}/authorizations`. Row link target = **UC-SCA-003** (view); "Add Authorization" target
= **UC-SCA-001** (create, with `?scalerLicenceNo=` prefill). Read-only against scaler **001A** (one
long-expired authorization **147850**) — pinned in `fixtures/sca/sca-test-data.ts`. No seed/cleanup.

| Source item | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|
| Tab lists the scaler's authorizations; Authorization # links to its view | `AuthorizationsTab` table + `RouterLink to=/scaler-authorizations/view/{id}` | authorizations-tab.feature `@S01 @p1` (row 147850 → view href) | covered | — |
| "Add Authorization" → create form prefilled with the licence | `goToCreate` → `navigate(/scaler-authorizations/create?scalerLicenceNo={lic})`; create reads `searchParams` | authorizations-tab.feature `@S02 @p1 @UC-SCA-001` (URL + `#authorized-scaler-licence`=001A) | covered | — |
| Status filter (All/Active/Cancelled/Expired) narrows the list | `useStatusFilter` (default All) + `StatusFilterSelect` | authorizations-tab.feature `@S03 @p2` (Active → 147850 gone + empty-for-status) | covered | — |
| "View Letter" per-row action (when `letterExists`) | `useAuthorizationLetterDownload` (row action) | — | deferred | defects.md #1 (no letterExists=true record) |
| Empty-because-no-authorizations (whole list empty, not filtered) | `EmptySection` when `authorizations.length===0` | — (covered via the status-filter empty path @S03) | not-applicable | defects.md #2 (no zero-auth scaler that also *exists*; the same EmptySection is exercised via @S03) |
| Loading / error tab states | `isPending` skeleton / `isError` EmptySection | — | deferred | defects.md #3 (transient/fault-injection states) |
| District-scope / role gating of the Add + links | (none — org-unit scoping deferred) / single mock role | — | not-applicable / blocked | defects.md #4 |

**Symmetry check:** the two entity tabs mirror each other — this tab (by-scaler) covers the licence-**prefilled**
Add path; the Scale-Site "Authorized Scalers" tab covers the **no-prefill** Add path and the licence→scaler
link. The status-filter empty path is covered on both. Together they exercise both Add entry points, both link
targets, and the shared `StatusFilterSelect`/`useStatusFilter` without duplication.

**Coverage gate (excluding deferred/not-applicable/blocked):** list+link, Add-prefill, status-filter — all
covered. **P1 100% · P2 100%.**

**Role / permission coverage:** no role branch automatable under single-role mock auth; the Add button/links
are not district-gated in the new app (org-unit scoping deferred). See defects.md #4.

**Status values:** `covered` · `deferred` · `not-applicable` · `blocked`. No divergence red.
