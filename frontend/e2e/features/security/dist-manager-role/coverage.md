# Coverage — `SCS_DIST_MANAGER` (`DM`) role scoping

**Spec:** `roles-permissions.md` §3 column `DM` + §4's "Suspend scaler licence / recommend cancellations",
as resolved in `RolePermissions.districtManager()`.

**Rows are matrix cells, not source items.**

> **Executed and green (2026-08-27).** Authored from source, then run against the rebuilt WAR. One class
> of expectation had to be corrected: risk assessment, which `dbf826c` widened to every internal column —
> see `defects.md`.

## A delta suite, and why that is the right shape

`DM` = `readOnlyInternalColumn()` ∪ `{SCALER_LICENCE_CANCEL}` — thirty reads plus exactly one write. The
read half is asserted in full by `../read-only-internal-roles/`, across three roles that hold the
identical set. Re-asserting thirty permissions here would duplicate that suite and give one fact two
places to rot.

So this suite asserts two things:

1. **The one cell that differs** — in the direction the read-only suite asserts it *withheld*, so the two
   suites pin opposite sides of one control and one endpoint.
2. **That the delta is invisible everywhere else** — same menus, same tabs, same routes, no other control.

(2) is the assertion most likely to catch a real mistake: `SCALER_LICENCE_CANCEL` gates a control and no
route or menu entry, so any nav, tab or route difference would mean the permission is leaking into surface
it should not touch.

## Why the delta is interesting

`Save Record` on the Performance Remarks tab is the licence suspend/cancel form, **not** a scaler edit. So
this is the first column to hold *cancel without remark writes*:

| Column | `SCALER_LICENCE_CANCEL` | `SCALER_PERFORMANCE_REMARK_CREATE` | `SCALER_UPDATE` |
|---|---|---|---|
| `ADM` | ✅ | ✅ | ✅ |
| `DSM` / `RSM` | ✅ | ✅ | ✅ |
| **`DM`** | ✅ | ❌ | ❌ |
| `CHK` / `CET` | ❌ | ✅ | ❌ |
| `CLE` / `SUP` / `RM` | ❌ | ❌ | ❌ |

Both controls sit on the same tab, which is what makes the pair a single sharp assertion rather than two
loosely related ones.

## Coverage

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| §4 "Suspend scaler licence / recommend cancellations" | §4 | `SCALER_LICENCE_CANCEL` | `gui`: `Save Record` offered; `api`: `PATCH /api/scalers/ZZZZ/licence-cancelled-date` passes authorization | ✅ |
| …and it is the ONLY write | §3 (no C/U/D cell anywhere) | — | `gui`: the other 13 controls withheld, incl. `Add Performance Remark` on the same tab | ✅ |
| …and it opens no route | `routePaths.tsx` names it nowhere | — | `url`: route surface identical to the read-only column; `/scalers/create` still refused | ✅ |
| …and it adds no menu entry | `navigation.ts` names it nowhere | — | `gui`: menus and leaves identical to the read-only column | ✅ |
| …and it does not widen into delete | §C has no scaler delete row | `SCALER_DELETE` withheld | `api`: `DELETE /api/scalers/001B` refused **and read back** | ✅ |
| The thirty reads | §3, all sections | `readOnlyInternalColumn()` | sampled here (7 allow + 4 deny rows); **asserted in full** in `../read-only-internal-roles/` | ✅ (by reference) |
| `(ltd)` / `(dist)` org-unit scoping | §1, §A | *(none)* | out of scope by instruction — see `defects.md` CG-1 | ⚠️ |

## Symmetry check

| Denial | Its contrast |
|---|---|
| GUI: 13 controls withheld | `An administrator is offered every control this column withholds` — same sweep, same locators |
| GUI: Create menu, Maintenance sub-group | inherited from the read-only suite's pairings; re-asserted here as identity. The Risk Rating tab is no longer a denial for any internal column — it is asserted *readable* |
| URL: refused routes | `<route> is reachable for a role that holds the permission` |
| API: refused reads | `the same call should succeed for a system administrator` on every row |
| API: **allowed** licence-cancel | two contrasts — a caller with no roles (endpoint is gated at all) **and** `SCS_CLERICAL` (the 403 tracks this one cell, not the whole column) |
| API: `DELETE` refused | read-back, no admin contrast — running it as admin would delete a pinned anchor |

The `SCS_CLERICAL` contrast on the licence-cancel endpoint is the sharpest assertion in this suite: same
call, same path, two enabled internal roles differing by exactly one permission, opposite outcomes.

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | org-unit (`ltd`) scoping of the Work Bench queue | out of scope by instruction |
| ~~CG-2~~ | ~~Work Bench renew verbs absent rather than refused~~ — **CLOSED 2026-08-31** | the inherited premise was mistaken — the renew endpoints take no request body and always reached authorization. `DM` is asserted as refused with 403 in `../write-verb-boundaries/write-verb-sweep.feature` |
| CG-3 | the licence-cancel **happy path** | the probe deliberately targets a nonexistent licence so it cannot mutate a shared anchor. That proves authorization passed, not that the write works — that belongs to a UC-level suite, not a role suite |
