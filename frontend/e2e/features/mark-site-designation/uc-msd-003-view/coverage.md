# Coverage — UC-MSD-003 View Mark Site Designation

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-MSD-003-S01..S07.feature` + `UC-MSD-003-slices.md` (control/message
matrix) + `UC-MSD-003-technical.md` (STA-001..009 / ERR-001..002 catalog + 20-field reference), against
the app's read path (`pages/View/MarkSiteDesignation/index.tsx`; `MarkSiteDesignationService.getMarkSiteDesignation`
+ `MarkSiteDesignationApiMapper`; DTO `MarkSiteDesignationDetail`). Read endpoint:
`GET /api/mark-site-designations/{id}`; route `/mark-site-designations/view?haulingMarkAuthorizationId=`.

**Scope note:** the View screen is **read-only**, so scenarios open **discovered REAL records** and never
mutate — no seed, no cleanup, parallel-safe by construction (no test owns these ids; the MSD create/update
flows only ever touch `ES20R4`-based records they create + clean up). S01 uses the single richest letterless
MSD (id `2681`: 1 site + 1 species + 6 conditions, `letterExists=false`); S03 reuses the real letter record
`1390` (`letterExists=true`); S06 uses the provably-absent id `99999999`. Concrete ids/values pinned in
`fixtures/msd/msd-test-data.ts`; dates are the raw ISO strings the API emits for a historical record (NOT
today-relative — they describe an existing record, not a value under test). Ground-truthed against the live
stack 2026-07-21. **The `letterExists` concurrency false-positive (already filed as UC-MSD-002 Bug #1)
affects this read path too** — worked around in the view page object (documented, not masked; see defects.md).

**Legacy → new field renames** (asserted against the new names): MSD # = `haulingMarkAuthorizationId`,
Geographic Location = `geographicLocation`, Population = `population`, Est. Truck Loads = `estimatedTruckLoads`.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Read-only render of the 20 header/display fields (S01, BR-MSD-003-01) | slices.md S01; technical.md:37-63 | `View/…index.tsx` readOnly TextInput/TextArea | view.feature `@S01 @p0` (6 representative fields incl. renamed ones) | covered | — |
| Scale Sites section renders (S01) | slices.md S01; technical.md:53 | `TableResource` Site # / Site Name | view.feature `@S01` | covered | — |
| Species Content section renders w/ LOV `SCALE_SPECIES_CODE` (S01) | slices.md S01; technical.md:54 | `TableResource` + `getStaticLov` label map | view.feature `@S01` (Content `100%`) | covered | — |
| Conditions section renders (Condition #/Title/Mandatory?/Description) (S01) | slices.md S01; technical.md:56 | `TableResource` + `ministryStandardInd` Y→Yes | view.feature `@S01` (cond 185, row-scoped) | covered | — |
| Page title "Mark Site Designation" (S01) | technical.md:14 | `PageTitle` | view.feature `@S01` | covered | — |
| Edit Record button present (STA-002, S01) | slices.md S01; technical.md:72 | `View/…index.tsx:350` (ungated button) | view.feature `@S01` | covered | — |
| Create Letter button when `letterExists=false` (STA-007, S01) | slices.md S01; technical.md:77 | `View/…index.tsx:360-362` label toggle | view.feature `@S01` | covered | — |
| View Letter button when `letterExists=true` (STA-008, S03) | slices.md S03; technical.md:78 | `View/…index.tsx:360-362` label toggle | view.feature `@S03 @p1` | covered | — |
| MSD not found → error (ERR-001, S06) | slices.md S06; technical.md:299 | GET → HTTP 404 → inline error notification | not-found.feature `@S06 @p1 @ERR-001` | covered | — |
| Exemptions section (STA-009, S01) | slices.md S01; technical.md:55,79 | `MarkSiteDesignationDetail.exceptions` + `View/…index.tsx` Exemptions section (wired 2026-09-02) | — | deferred | Coverage gap #1 (was not-applicable; now writable) |
| Scale-site # hyperlink → scale-site view (STA-001, S04) | slices.md S04; technical.md:71 | `ScaleSiteLink` → `PermissionLink` (`SCALE_SITE_READ`), MSD view index.tsx:53 | view.feature `@S01` asserts the link + href | covered (re-ground) | Divergence #2 CLOSED 2026-08-13; plain-text arm = Coverage gap #5 |
| Delete blocking alerts — scale-sites-exist / letter-exists (STA-005/006, S02/S03) | slices.md S02,S03; technical.md:75-76 | (none — Delete = `window.confirm` → workbench-remove) | — | not-applicable | Divergence #1 (log-only) |
| Delete confirm dialog when deletable (STA-004) | technical.md:74 | `handleDelete` → `POST …/workbench/remove` → /welcome | — | not-applicable | Divergence #1 (delete belongs to UC-MSD-004) |
| Edit Record hidden without `markSiteUpdate` (STA-003, S05) | slices.md S05; technical.md:73 | (no per-button role gating; single mock role) | — | blocked | Coverage gap #2 |
| Not authorized → notAuthorized page (ERR-002, S07) | slices.md S07; technical.md:339 | `ProtectedRoute` (route-level `SCS_SYS_ADMIN`) | — | blocked | Coverage gap #3 |
| Who Did It audit affordance | technical.md:63,93 | `<WhoDidIt>` component (cross-cutting) | — | deferred | Coverage gap #4 |

**Navigation + empty sections (added 2026-08-04 — `navigation.feature`):** view.feature asserted the action
buttons are *shown*; these assert they actually *navigate*, plus the empty child-section render:

| Source item | App enforcement point | Scenario (tags) | Status |
|---|---|---|---|
| Edit Record → `/mark-site-designations/edit/{id}` (STA-002) | `View/…index.tsx:353` `navigate(edit)` | `navigation.feature` `@S02 @p1` (→ "Mark Site Designation - Edit") | covered |
| Create Letter → `/mark-site-designations/{id}/letter` (STA-007) | `View/…index.tsx:219` `handleLetterClick` | `navigation.feature` `@S07 @p1` (→ "…Letter Options") | covered |
| Empty child sections (0 sites / 0 species) render empty tables | `TableResource showEmptyTableWhenNoResults` | `navigation.feature` `@p2` (seeded district-wide MSD) | covered |

**Still deferred (view):** the **View Letter** button's blob **download** (+ status banner + download-error)
is part of the Tier-4 letter-generation pass; the **Who Did It** audit popup remains Coverage gap #4.

**Symmetry check:** the meaningful mirror on a read-only screen is the **`letterExists` toggle** — both
arms covered (S01 letterless → "Create Letter"; S03 letter issued → "View Letter"). The three legacy Delete
states (deletable / scale-sites-exist / letter-exists) collapse to one redesigned Delete (workbench-remove)
→ logged as Divergence #1, not silently dropped. All child sections (Scale Sites / Species / Conditions,
and — as of 2026-09-02 — the now-present Exemptions section) are accounted for.

**Role / permission coverage — premise corrected 2026-08-18.** This previously said every role branch was
**blocked** by single-role mock auth and that the app "does not gate the view buttons by role at all". Both
are out of date: the role model shipped (the view buttons are permission-gated, and `@IsScsEditor` has been
superseded by per-handler `@RequiresPermission`), and `pages/security/RoleSessionPage` can drive any of the eleven
roles — see `features/security/industry-scaler-role/`. So:
- **S05 Edit-hidden** and **S07 not-authorized** are writable now (`SCS_INDUSTRY_SCALER` holds `MSD_READ`
  without `MSD_UPDATE`); Coverage gaps #2/#3 restated accordingly.
- **S04's no-permission plain-text arm** is still blocked, but on the *matrix* rather than the harness: it
  needs a role with `MSD_READ` and no `SCALE_SITE_READ`, which none has yet. Coverage gap #5.

**Concurrency note:** `letterExists` intermittently false-positives under load (UC-MSD-002 Bug #1) on the
same `GET /api/mark-site-designations/{id}` this screen uses, which would flip the letter button
Create↔View. The letter-button scenarios open via a fresh-login re-open until the true state renders
(`pages/msd/MarkSiteDesignationViewPage.reopenUntilLetterState`) — documented, not masked; the bug keeps its
standalone red repro in the MSD suite.

**Status values:** `covered` · `not-applicable` (legacy-only / unbuilt) · `deferred` (see Coverage gaps) · `blocked` (env/auth) · `divergence` (log-only entry or a genuinely-failing `@discovered-divergence` test — see this UC's `defects.md`).
