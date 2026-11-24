# Coverage — UC-CHK-004 Delete Detail Check Scale

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-CHK-004-S01..S08.feature` + `UC-CHK-004-slices.md` (control/message
matrix) + `UC-CHK-004-technical.md` (STA-001..004, CNF-001, ERR-001..004), against the new app's write
path: `pages/View/CheckScale/index.tsx` (the Delete button, its confirm `Modal`, and the "Delete failed"
banner), `services/checkScales.service.ts` (`deleteCheckScale`), and
`DELETE /api/check-scales/{checkScaleId}` (`CheckScaleController:91`, `@RequiresPermission(CHECK_SCALE_DELETE)`).

**Headline — delete is BUILT (re-grounded 2026-09-01).** The 2026-07-13 pass found no delete at all: the
confirm handler was `alert('Delete action is not wired yet.')` and the contract had no DELETE verb. Both
are gone. The confirm handler now calls the endpoint, evicts the cached tab lists, navigates back, and
raises a "Delete failed" banner when the call is refused (`index.tsx:157-178`). So S01 is a green happy
path, its failure arm is now assertable, and the three rows that read "unreachable — delete not
implemented" have been re-reasoned rather than merely re-dated (Coverage gaps #1/#2 in `defects.md`).
Divergence #1 is CLOSED. A **Divergence #2** was filed here the same day and **retracted the same day**:
the server does delete an `LGCS` record on request, but so did legacy, so it is parity rather than a
divergence (see `defects.md`). **This UC now carries no divergences.**

**Test data (real, 2026-07-15; legacy fixture added 2026-09-01):** the three mutating scenarios each
create their OWN disposable HBCS record via the API (`seedDetailCheckScaleForEdit`, real active-v1 pair
`224RY42F50F5C` + `383V211Y22E4C`) and remove it at the DB on teardown. Parallel-safe under
`--repeat-each`: `CHECK_SCALE`'s only unique index is the PK on `CHECK_SCALE_ID` — there is **no**
uniqueness on the log-tally doc columns, so concurrent creates on one HBS pair each get a fresh sequence
PK and never collide. The legacy server-guard probe seeds its own record and flips `cksc_type` to `LGCS`
at the DB (`seedLegacyDetailCheckScale`) rather than touching the pinned legacy anchor — the delete
genuinely goes through and destroys its target, and that must not be an anchor. S02 (cancel) and S07 (legacy button state) open
**permanent real** loaded records read-only — 146803 (SFPSCS, non-legacy, Delete enabled) and 145842
(LGCS, Delete disabled) — and never mutate, so they stay safe to share. Ids are pinned in
`fixtures/chk/chk-test-data.ts`; this file cites the fixture, not the numbers.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy path — confirm delete removes the record + child rows (BR-01 cascade, BR-02 confirm, SUC-001) | S01 / slices:63-109, technical:161-165 | `handleDelete` → `DELETE /api/check-scales/{id}` → cache evict → navigate back (View index.tsx:157-178) | check-scale-delete `@S01 @p0` (polled read-back = 0 rows) | covered | Divergence #1 CLOSED |
| Post-delete the user leaves the deleted record's view | S01 / slices:63-109 | `navigate(backTo ?? -1)` (index.tsx:171) | check-scale-delete `@S01 @p0` (URL no longer `/check-scales/view/{id}`) | covered (re-ground) | see `defects.md` "Verified" — the tab-list arm is not assertable |
| A delete the server refuses is surfaced, not swallowed | slices:63-109 (SUC-001 inverse) / new app surface | `catch` → `extractApiError` → "Delete failed" banner, modal closed, stays on view (index.tsx:173-174, 224-230) | check-scale-delete `@S01 @p1` (real 404 induced out-of-band) | covered (beyond slice) | — |
| Confirmation dialog appears on Delete (CNF-001, BR-02) | S01/S02 / technical:82 | Carbon `Modal` "Are you sure you want to delete this record?" (View index.tsx:299-311) | check-scale-delete `@S02 @p1` (asserts the modal) | covered | — |
| Cancel the confirmation → no deletion, stays on view | S02 / slices:113-149 | Modal `secondaryButtonText="Cancel"` → `onSecondarySubmit` closes, no `handleDelete` (index.tsx:305-306) | check-scale-delete `@S02 @p1` (read-back present, stayed on view) | covered | — |
| DB child records prevent deletion (ERR-001) | S03 / technical:83 | **no such rule** — `scs_check_scale_pkg.delete_rec` cascades children then removes the header (repo:268-277); nothing checks for dependants | — | deferred | Coverage gap #1 (rescoped: replaced, not deferred — awaiting a product answer) |
| Advisory letter prevents deletion (ERR-002) | S04 / technical:84 | same cascade; and no letter can be generated here — the advisory-letter endpoint answers 500 for every caller on this stack | — | blocked | Coverage gap #2 (rescoped: env, not unbuilt) |
| Record not found on view (ERR-004) | S05 / technical:86 | view shows "Could not retrieve check scale data." (View index.tsx:162-170) | **covered by UC-CHK-003** `check-scale-view-navigation @S06` (same view, same record-not-found path) | covered elsewhere | — |
| Lacks delete permission → Delete button hidden (STA-001) | S06 / technical:78 | **no control gating on this screen** — CHK pages call no `hasPermission`, so Delete renders for every role that can read the record | — (GUI); endpoint denial `sec/check-scaler-role/api-access` "Deleting a detail check scale is refused…" `@p0` | not-applicable (GUI) · covered elsewhere (endpoint) | Coverage gap #3 (rescoped) |
| Endpoint refuses delete for a role without `CHECK_SCALE_DELETE` | technical:78 (re-grounded to the permission layer) | `@RequiresPermission(CHECK_SCALE_DELETE)`; granted to NO column but `ADM` (`RolePermissions`) | `sec/check-scaler-role/api-access` `@p0` outline, detail + summary arms (403 + record survives) | covered elsewhere | — |
| Legacy record → Delete button disabled (STA-002) | S07 / technical:79 | `disabled={ckscType==='LGCS'}` on the Delete `<Button>` (View index.tsx:288-294) | check-scale-delete `@S07 @p1` | covered | — |
| Legacy record → what the **server** does with the delete | S07 / technical:79 (the rule's server half) | no `cksc_type` guard — `DELETE` on an LGCS record returns 204, and **legacy did the same** (`CheckScaleAction.delete` deleted by id with no load or validation) | check-scale-delete `@S07 @p1` (asserts the accepted delete + the record is gone) | covered (re-ground) | Divergence #2 RETRACTED — legacy parity; hardening question in UC-CHK-002 defects.md |
| Lacks view permission → list row links not rendered (STA-003) | S08 / technical:80 | no control gating — the row link always renders; the read-side denial is at the route/endpoint | — (GUI); `sec/read-only-internal-roles` (view/edit/letter routes + search refused) | not-applicable (GUI) · covered elsewhere (endpoint) | Coverage gap #4 (rescoped) |
| Add Check Scale hidden w/o create permission (STA-004) | technical:81 | no control gating (Add Check Scale always renders) | — (no equivalent) | not-applicable | (folded into Coverage gap #3) |

**Symmetry check:** the legacy read-only rule covers **both** Edit Record and Delete for an `LGCS` row
(technical:64,67), and each now has **two** arms — the disabled control and the server's answer. Control:
Edit = UC-CHK-002 S04, Delete = S07 here. Server: update = UC-CHK-002 S04, delete = S07 here — both assert
legacy PARITY (the write is accepted) and both are green, after the legacy source showed no server-side
`ckscType` guard ever existed on either path. The confirm/cancel pair is complete (S01 confirm green, S02 cancel
green), and the confirm arm now has both outcomes: accepted (S01 happy) and refused (S01 failure arm).
The delete-denial probe covers both record kinds — detail and summary — in the sec suite.

**Role / permission coverage:** two levels, split deliberately. **Endpoint:** covered — `CHECK_SCALE_DELETE`
and `SUMMARY_CHECK_SCALE_DELETE` are granted to no column but `ADM`, and
`sec/check-scaler-role/api-access.feature` proves the Check Scaler's DELETE is refused with 403 *and* that
the record survives (the outcome a status code cannot show). **Control:** not gated by the app — the CHK
pages render Delete for every role that can read the record, so the legacy *hidden* states (S06/S08/STA-004)
have no reproducible equivalent and stay `not-applicable`, with the open product question in Coverage gap
#3. This is a change of reason, not of verdict: the blocker used to be single-role mock auth; it is now the
absence of control gating.

**Status values:** `covered` · `covered (re-ground)` · `covered (beyond slice)` · `covered elsewhere` ·
`blocked` (env — advisory letter 500s here) · `deferred` (awaiting a product answer) ·
`not-applicable` (GUI: no control gating on this screen) · `divergence` (a genuinely-failing
`@discovered-divergence` test — see this UC's `defects.md`).
