# Coverage — Scale Site view "Authorized Scalers" tab (UC-SCA tabs, Tier 3)

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Not a standalone legacy UC — the **navigation surface** that lists every scaler authorized at a scale site.
Reconciled against `AuthorizedScalersTab.tsx` (`pages/View/ScaleSite/components/tabs/`), reached at
`/scale-sites/view/{site}?tab=authorized-scalers`, backed by lazy GET `/api/scale-sites/{id}/authorized-scalers`.
Row links target **UC-SCA-003** (Authorization #→view) and the Scaler view (Licence #→`/scalers/view/{lic}`);
"Add Authorization" targets **UC-SCA-001** (create, **no** prefill). Read-only against site **520** (whose
authorized scalers are all currently Expired) — pinned in `fixtures/sca/sca-test-data.ts`. No seed/cleanup.

> Data note: a freshly-seeded scaler authorization (even District-Wide=No + site 520) does **not** appear in
> this view — it reads a different linkage — so scenarios run against pre-existing rows and assert the first
> row's links by **href pattern**, not a pinned id (robust to the extract reordering rows).

| Source item | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|
| Tab lists authorized scalers; Authorization #→view, Licence #→scaler | `AuthorizedScalersTab` table + two `RouterLink`s | authorized-scalers-tab.feature `@S01 @p1` (first row: auth href + scaler href) | covered | — |
| "Add Authorization" → create form with NO licence prefill | `navigate('/scaler-authorizations/create')` | authorized-scalers-tab.feature `@S02 @p1 @UC-SCA-001` (URL has no `scalerLicenceNo`; licence field empty) | covered | — |
| Status filter narrows the list | `useStatusFilter` (default All) + `StatusFilterSelect` | authorized-scalers-tab.feature `@S03 @p2` (Active → empty-for-status) | covered | — |
| Whole-list empty (no authorized scalers) | `EmptySection` when list empty | — (same EmptySection exercised via the filter path @S03) | not-applicable | defects.md #1 |
| Loading / error tab states | `isPending` skeleton / `isError` EmptySection | — | deferred | defects.md #2 |
| District-scope / role gating | (none — scoping deferred) / single mock role | — | not-applicable / blocked | defects.md #3 |

**Symmetry check:** mirror of the Scaler view's "Authorizations" tab — that tab covers the licence-**prefilled**
Add and the Authorization #→view link; this tab covers the **no-prefill** Add and the extra Licence #→scaler
link. Status-filter empty is covered on both. Together the two tabs exercise both Add entry points and all
three link targets without duplicating steps.

**Coverage gate (excluding deferred/not-applicable/blocked):** list+links, Add-no-prefill, status-filter — all
covered. **P1 100% · P2 100%.**

**Role / permission coverage:** no role branch automatable under single-role mock auth; links/Add not
district-gated in the new app (org-unit scoping deferred). See defects.md #3.

**Status values:** `covered` · `deferred` · `not-applicable` · `blocked`. No divergence red.
