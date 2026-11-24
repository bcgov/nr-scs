# Defects & Divergences — UC-QRY-007 Search Risk Assessments (Scale Site subject)

> Legend + the divergence/defect/coverage-gap distinction: [defects-guide.md](../../../defects-guide.md).
> This suite is expected **all-green** — no `@discovered-divergence` scenarios. What follows are **coverage
> gaps** (things the extract or the single-role model prevent us from asserting) and one **verified-not-a-defect**
> note on wording. None is an app bug.

## Verified — not a defect

1. **"Partial matching" wording vs exact-unless-`%` behaviour.** The endpoint spec describes the text
   filters (Assessment ID, Scale Site Name, …) as supporting "partial matching". Ground-truth 2026-08-11:
   matching is **exact unless the caller supplies a `%`** and is case-sensitive — `?riskQuestionnaireId=18`
   → `[]`, `?riskQuestionnaireId=18%` → 6 rows; `?siteName=WELDWOOD` → `[]`, `?siteName=weldwood%` → `[]`,
   `?siteName=WELDWOOD%` → 2 rows. This is the SAME behaviour the scaler subject exhibits (`scs_risk_*_vw_pkg.search_recs`).
   The suite pins both halves (wildcard-matches-by-prefix + bare-value-is-exact) so the behaviour is locked;
   the imprecise OpenAPI wording is logged here, not treated as a defect.

## Test-design hazards (handled)

### Parallel create-seed hazard — exact whole-extract counts

The scale-site risk **search** view returns freshly-created rows: verified 2026-08-11 by creating an in-range
assessment on site 520 via `POST /api/scale-sites/520/risk-assessments` (rating 90 = High) and observing
`?riskTypeCode=H` go 9 → 10 and `?scaleSiteIdNmbr=520` return the new id (then deleted, DB restored to 9).
The RSK-006/007 create+seed suites run against the **same shared DB** in the same `npm test` run, so a
create scenario executing in parallel with this suite transiently adds a High row.

**Impact + handling:** only a *whole-extract* count is exposed. Every other pinned count keys on a value a
new sequence-generated seed can never collide with — Assessment ID `1822`, Scale Site `614`, `18%` (ids
1822–1861), `WELDWOOD%` (site names), the sort id-list — because seeds land on site 520 with ids ~2xxx. So:

- The Level=High arm asserts **`>= 9` + lists anchor 1822** (`search.feature` dedicated scenario), not `= 9`.
- The exact `9` is still pinned by `preflight/anchors.setup.ts` (`levelFilter.expectedCount`), which runs as a
  project **dependency** — to completion, on a quiescent DB, before any create scenario starts.
- Browse-all only asserts non-empty, so it is inherently safe.

**Interrupted-run leak (persists across runs).** Because RSK has no delete endpoint, create cleanup is
DB-level (`deleteRiskAssessmentsViaDb`). A run killed *between* create and teardown leaks a High row on site
520 that never gets removed — so the next run's preflight sees `H → 10` and fails the exact-`9` guard, and
because preflight is a project dependency it blocks **every** domain's tests until cleaned. The failure
message (`anchors.setup.ts` `levelFilter` arm) now names this cause first when the count runs high — it points
at `?scaleSiteIdNmbr=520` and DB-level stray removal before it suggests re-grounding the extract, so the
message doesn't mis-attribute a leak to extract drift.

Note: the scaler twin suite pins an exact whole-extract Level count (High → 14) and shares this exposure; it
is not in scope to change here, but the same `>=` treatment would harden it.

## Coverage gaps

Each is a gap in what THIS extract / auth model lets us assert, not an app defect. Numbers are referenced
from `coverage.md`.

1. **Level single-result (data).** The scaler twin asserts "Level Medium → exactly 1 row". This scale-site
   extract is **uniformly Level = High** (`?riskTypeCode=M` → `[]`, `=L` → `[]`, `=H` → all 9), so there is
   no single-result-by-Level case to pin. The Level filter IS covered as a multi-result arm (High → 9).
   *Re-ground trigger:* a re-extract that introduces Medium/Low scale-site assessments — add the arm then.

2. **Client-side pagination (data).** `pages/Queries/ScaleSiteRiskAssessments` fetches all matching rows and
   slices client-side at 10/page (index.tsx:249-260). The largest groundable result set in this extract is 9
   (browse-all) — below the page size — so a 2-page assertion (like the scaler suite's Level High → 14 = 10 + 4)
   is not reproducible. The slice math is identical to the scaler page (same component), which covers it.
   *Re-ground trigger:* a re-extract where some filter returns > 10 rows.

3. **Permission-gated links / not-authorized (single-role / RBAC deferred).** Legacy gated the result links
   edit-vs-display by permission and had a not-authorized path. The new app renders one unconditional view
   link and gates the whole portal on `SCS_SYS_ADMIN`; mock auth grants only that role, so the denied-user
   state cannot be produced. The links themselves ARE covered (assessment → view, Scale Site # → scale-site
   view). Tracked with the project-wide RBAC deferral — revisit when finer roles land.

4. **Complete = Yes filter (data).** Every extracted scale-site assessment is incomplete (`?completeInd=Y`
   → `[]`, `=N` → 9). A positive "Complete = Yes" filter has no data. Same gap the scaler suite logged. The
   mechanism is identical to the (covered) Level select.

5. **Site Type cell (data).** Assessment 1822's `methodTypeCodeName` is null in this extract, so its Site
   Type cell renders empty and is not asserted in the cell-data scenario (the column header IS asserted).

6. **Filter-widget interactions — NARROWED (mostly CLOSED, 2026-08-20).** The Reg/Dist (`DistrictSelect` →
   `orgUnitNo`), Site Owner (`ClientLocSearch` → `ownerClientNumber`), and Site Type (`ActiveMultiSelect` →
   `methodTypes`) filters are now **covered** by `filter-widgets.feature`: it drives each real widget and
   asserts the resulting rows (South Island 1619 → 3 incl. 1861; owner 00055821 → 1 = 1822; Piece Scale `P`
   → 1 = 1861), with anchors drift-guarded in `preflight/anchors.setup.ts` — both the CODE→count and, since
   the `DistrictSelect`/`ActiveMultiSelect` widgets match by LABEL, the LABEL↔code of the region/district and
   scale-method-type LOVs (so a re-extract that renamed either option fails LOUD in preflight rather than as
   an opaque mid-suite `selectOption` timeout). Site Type is the only filter on either risk page with no
   plain-Select twin, so its multiselect arm is the sole proof of `methodTypes`.
   **Still deferred:** (a) the `ClientLocSearch` **picker-MODAL writeback** (open the modal and *pick* a
   client, vs. typing the number) — lower value (same `ownerClientNumber` param) and flakier (the modal
   embeds the Client query page); and (b) the **`ownerClientLocnCode`** sub-param — the type-in scenario
   leaves the Loc box `''`, so although `doSearch` sends it live (index.tsx:290-291) it is never populated by
   any scenario. NB this is UNLIKE the scaler page's `clientLocnCode`, which is genuinely dead (Bug #1): the
   scale-site loc param is real untested behaviour, so it is logged `not-yet` in coverage.md, not `covered`.
   Same narrowing as the scaler suite's gap #7.

7. **Timber Cruise / Waste subjects (descoped).** UC-QRY-007's S03 (Timber Cruise) and S04 (Waste) subjects
   are descoped — do not build, do not test.

8. **Persisted filters/paging across navigation — CLOSED (2026-08-20).** The page persists filters, sort,
   paging, and the last search `lastSearchParams` via `usePersistentState`; `persistence.feature` now asserts
   it — search (Assessment ID 1822), navigate away and back CLIENT-SIDE (a full reload would correctly drop
   the in-memory store), then assert the filter value is restored and the count reappears. NB the result ROWS
   are NOT persisted — they are re-fetched on remount by an effect that replays the persisted params
   (index.tsx "Result rows are ephemeral: re-fetched on mount"), so the count is restored by that re-fetch,
   not from a stored result set. The scenario therefore has teeth on the params store but cannot fail on a
   results store (there is none).
