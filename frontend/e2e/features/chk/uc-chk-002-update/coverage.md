# Coverage — UC-CHK-002 Update Detail Check Scale

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-CHK-002-S01..S08.feature` + `UC-CHK-002-slices.md` (control/message
matrix) + `UC-CHK-002-technical.md` (ERR-001..009), against the new app's write path:
`pages/Edit/CheckScale/index.tsx` (`validate` = the same six-field check as create step 2, `onSave` →
PUT, `onReset` reload, `onBack` nav), `pages/View/CheckScale/index.tsx` (legacy-disable + Edit Record
nav), `services/checkScales.service.ts` (`updateCheckScale` PUT `/{id}`, `getCheckScale` GET
`/search`). Messages ground-truthed against the live PUT/GET on 2026-07-08.

**Test data (real, 2026-07-15):** the loaded data has **no** persistent editable HBCS record (the old
mock 905021 is gone), so EVERY scenario creates its OWN fresh record via the API (unused active-v1 pair
`224RY42F50F5C` (220F) + `383V211Y22E4C` (382E), baseline `FST`/Y/N/50/50 + a known comment) and deletes
it at the DB on teardown; only the happy path (S01) then PUTs, the rest never save, so each owning its
own record keeps them independent + parallel-safe. S04 reuses a real loaded legacy record **145842**
(LGCS). No seed patch needed (detail create derives the mark from HBS).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy path — edit six fields + save, read-back | S01 | `onSave` PUT `/{id}` → view (Edit index.tsx:131-163) | update `@S01 @p0` | covered | — |
| Reset reverts unsaved edits to saved values | S02 | `onReset` reloads `buildFormValues(loadedData)` (index.tsx:122) | update-navigation `@S02 @p1` | covered (re-ground) | verified-not-defect |
| Back cancels edit, nothing persisted | S03 | `onBack` nav to view (index.tsx:114); zero PUTs | update-navigation `@S03 @p1` | covered | — |
| Edit Record disabled for legacy (STA-001) | S04 / technical:217 | `disabled={ckscType==='LGCS'}` (View index.tsx:277) | update-navigation `@S04 @p1` | covered | — |
| Legacy record → what the **server** does with the same write (STA-001's server half) | S04 / technical:217 | no `cksc_type` guard — `PUT` on an LGCS record returns 200, and **legacy did the same** (the rule lived only in `viewCheckScale.jsp`'s `disabled` attribute) | update-navigation `@S04 @p1` (asserts the accepted write + the record stays LGCS) | covered (re-ground) | Divergence #2 RETRACTED — legacy parity; hardening question open in defects.md |
| Required blank — Check Scale Type (ERR-001) | S05 / technical:261 | `validate()` (Edit index.tsx:100) | update-validation `@S05 @p1` outline | covered | — |
| Required blank — Followed Good Practices (ERR-002) | S05 / technical:262 | `validate()` (index.tsx:101-103) | update-validation `@S05 @p1` outline | covered | — |
| Required blank — Original within Standard (ERR-003) | S05 / technical:263 | `validate()` (index.tsx:104-106) | update-validation `@S05 @p1` outline | covered | — |
| Net Value required-empty (ERR-004/005) | S05 / technical:264-265 | `validateNetValue` empty→"Required." (index.tsx:107-110) | (same code path as S06) | covered (parity) | — |
| Net Value non-numeric (ERR-006) | S06 / technical:313 | `validateNetValue` (index.tsx:107-110) | update-validation `@S06 @p1` outline (both arms) | covered | — |
| Check-Scaler Comment > 4000 chars (ERR-008) | S06 / technical:96 | Carbon `TextArea maxLength={4000}` caps the field (`CheckScaleForm/index.tsx:295`) — an over-length comment can't be typed or submitted | — | not-applicable (re-ground) | verified-not-defect |
| Record not found → not-found feedback (ERR-007) | S07 / technical:354 | FIXED — `isError \|\| (!isLoading && !loadedData)` short-circuits to the error state (index.tsx:177-182) | update-navigation `@S07 @p2 @ERR-007` | covered (re-ground) | Divergence #1 CLOSED |
| Not authorized wrong-role (ERR-009) | S08 / technical:394 | `ProtectedRoute` + `@RequiresPermission(CHECK_SCALE_UPDATE)` | `sec/read-only-internal-roles/url-access` (`/check-scales/edit/…` refused) + `sec/check-scaler-role/api-access` (write permissions) | covered elsewhere | coverage gap #1 CLOSED — the placeholder `@S08 @skip` scenario was REMOVED 2026-09-02 |
| Audit trail updated (BR-CHK-002-02, WhoDidIt) | S01 | `updateUserid`/`updateTimestamp` set by repo | — | not-applicable (UI) | no WhoDidIt affordance re-grounded |

**Symmetry check:** create/update mirror — create covered by UC-CHK-001, update here (S01). Net Value
original/check both materialized (S06). The three required drop-lists are all UI-reachable (each Select
has a selectable blank option, unlike UC-CHK-006's disabled-blank summary selects), so all three
required arms are covered via the UI. Net-Value required-empty shares the exact `validateNetValue` path
with the non-numeric arm (covered by parity).

**Role / permission coverage (re-grounded 2026-09-01):** no longer blocked. The eleven-role permission
layer shipped and `steps/sec/roleSession.steps.ts` can sign in as any column, so the old "mock auth grants
only `SCS_SYS_ADMIN`" reason is retired. Route- and endpoint-level denial for this screen is asserted in
the role suites (`sec/read-only-internal-roles/url-access` refuses `/check-scales/edit/…`;
`sec/check-scaler-role/api-access` covers the write permissions), so S08 is `covered elsewhere` rather than
`blocked`; its local `@skip` placeholder was removed on 2026-09-02 (Coverage gap #1 CLOSED). Control-level gating
still does not exist on the CHK pages — see UC-CHK-004 Coverage gap #3 for the one open product question
about that, kept in a single place rather than restated per UC.

**Status values:** `covered` · `covered (re-ground)` · `covered (parity)` · `covered elsewhere` ·
`not-applicable`. **No divergences remain in this UC:** #1 was fixed in the app (PR #267) and #2 was
retracted as legacy parity — see defects.md for both, and for the open hardening question #2 raised.
