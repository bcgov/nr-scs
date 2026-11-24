# Coverage — the scaling manager column: `SCS_DIST_SCALING_MANAGER` (`DSM`), `SCS_REGIONAL_SCALING_MANAGER` (`RSM`)

**Spec:** `roles-permissions.md` §3 columns `DSM` and `RSM` + §4, as resolved in
`RolePermissions.scalingManagerColumn()` / `.districtScalingManager()` / `.regionalScalingManager()`.

**Rows are matrix cells, not source items.**

> **Executed and green (2026-08-27).** Authored from source, then run against the rebuilt WAR. One class
> of expectation had to be corrected: risk assessment, which `dbf826c` widened to every internal column —
> see `defects.md`.

## One suite, two roles

`RolePermissions` maps both roles to `scalingManagerColumn()` **verbatim**. §3 separates the two columns by
exactly one thing: `(dist)` against `(rgn)` on Templates and Signatories — org-unit breadth, not a
permission letter. So the two are behaviourally identical today and every
scenario is outlined over both.

Same reasoning, and same expiry, as `../read-only-internal-roles/`. The difference is that suite asserts
its premise in an `org-unit-scoping.feature`; **this one does not**, because the reg/dist axis is out of
scope by instruction. The dependency is therefore recorded here and in `defects.md` CG-1 rather than being
executable — the `api-access.feature` equality scenario is the closest thing to a tripwire, and it will
fail when the columns diverge.

## The widest non-administrator column

Hold it as **"almost the administrator, minus the deletes"**: §3 gives it `CRU` or `CR` nearly everywhere
the administrator has `CRUD`.

**Deletes it does hold** — `SCALE_SITE_CONTACT_DELETE` (§D Contacts `CRUD`), `SCALER_AUTHORIZATION_DELETE`
and `SCALE_SITE_AUTHORIZATION_DELETE` (§E `CRUD` on both create/edit rows),
`SCALER_PERFORMANCE_REMARK_DELETE` (§C `CRD`).

**Deletes it does not** — the scaler, and every maintenance area. It authors reference data it cannot
remove.

Two facts shape the whole suite:

1. **It holds the permission for every protected route in the application except one** —
   `/maintenance/system` (`MAINTAIN_SYSTEM_READ`; §J's Maintain System row is `-`). So the URL deny table
   has a single row, and that *is* the assertion. A second refused route appearing means a permission was
   withdrawn or a new route landed gated on something this column lacks.
2. **The contrast has to invert.** Almost nothing is denied, so an administrator pairing carries no
   information — both hold everything. What proves a control is *gated* rather than *ungated* is that the
   same controls are hidden for a narrow enabled role (`SCS_CLERICAL`) on the identical pages. **This is
   the one structural thing this suite adds to the pattern.**

## Coverage

### §A General & Navigation

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| SCS Home Page `R` | §A | `WELCOME_READ` | `url`, `api` | ✅ |
| Work Bench `CRU (ltd)` — the `R` | §A | `WORKBENCH_QUERY` | `gui`: leaf offered; `url`: `/workbench`; `api` | ✅ |
| Work Bench `C`/`U` (renew) | §A | `WORKBENCH_CREATE`/`_UPDATE` | *(not covered — CG-2)* | ⚠️ |
| Every top-level menu renders, Create included | §3 | 7 `_CREATE` verbs | `gui`: 4 groups, all 7 Create leaves | ✅ |

### §C / §D — records, authored whole

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Scaler – Create `CR`, Summary `RU` | §C | `SCALER_CREATE`, `SCALER_UPDATE` | `gui`: `Edit Record`; `url`: `/scalers/create` | ✅ |
| Scaler delete `-` | §C (`RU` vs admin `RUD`) | *(none)* | `api`: `DELETE /api/scalers/001B` refused **and read back** | ✅ |
| Licence cancel | §4 | `SCALER_LICENCE_CANCEL` | `gui`: `Save Record` **alongside** `Add Performance Remark`; `api`: PATCH passes authorization | ✅ |
| Exams / Appointments `CRU` | §C | `*_CREATE`/`_UPDATE` | `gui`: both Add controls | ✅ |
| Performance Remarks `CRD` | §C | `*_CREATE`/`_UPDATE`/`_DELETE` | `gui`: `Add Performance Remark` | ✅ |
| Scale Site – Create `CR`, Summary `RU` | §D | `SCALE_SITE_CREATE`/`_UPDATE` | `gui`: `Edit Record`; `url`: `/scale-sites/create` | ✅ |
| Contacts `CRUD` — the one record delete | §D | `SCALE_SITE_CONTACT_DELETE` | `gui`: both Add controls offered; *the delete itself — CG-3* | ⚠️ |
| Inspections `CR` + §H `RU` | §D, §H | `SCALE_SITE_INSPECTION_*` | `gui`; `url`; `api`: both init GETs paired | ✅ |

### §E / §F — authored and lettered

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Authorizations `CRUD` both flavours | §E | `*_CREATE`/`_UPDATE`/`_DELETE` | `gui`: both Add controls; `url`: create + edit ×2 | ✅ |
| MSD `CR`/`RU` | §F | `MSD_CREATE`/`_UPDATE` | `gui`: `Add Mark Site Designation`; `url`: create + edit | ✅ |
| **All four `_LETTER` verbs** | §E, §F, §I | 4 `*_LETTER` | `url`: all four letter routes reachable | ✅ |

The first column besides the administrator that authors every document it can then issue — the "owns the
workflow end to end" test satisfied in all four places at once. `CHK` and `CET` each satisfy it in one
place and fail it in another, so their suites assert the halves; this one asserts the whole.

### §I / risk assessment — the new territory

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Check Scale `CR`/`RU` + advisory letter | §I | `CHECK_SCALE_*` | `url`: create/view/edit/letter; `api`: search allowed | ✅ |
| Risk assessment — **every verb both subjects expose** | class javadoc rule (not §3 literally) | 10 `*_RISK_*` | `gui`: Risk Rating tab **offered** on both records; `url`: 4 RSK routes; `api`: both searches, contrasted vs `CLE` | ✅ |

**The first non-administrator column offered the Risk Rating tab.** This is the visible consequence of
"risk assessment follows the record it hangs off" — §3 has one risk row and no scaler-subject row at all,
so an assessment takes the level the role holds on that record's other tabs. The read-only, `DM` and `CET`
suites all assert the tab hidden, so this scenario is the other side of theirs.

It also un-strands two routes: `/scaler-risk-assessments/edit/:id` and
`/scale-site-risk-assessments/edit/:id` were, under the earlier literal reading of §3's lone
"Risk Rating Criteria `CR`", reachable by nobody but the administrator.

### §J — eight of nine

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Templates, Conditions, Exam/Upgrades, Appointment Types, Valid Licence Attributes, Authorization Clauses — `CRU` | §J | `MAINTAIN_*_QUERY`/`_READ`/`_CREATE`/`_UPDATE` | `gui`: 8 Maintenance leaves; `url`: 8 routes; `api`: 7 endpoints allowed | ✅ |
| Questions `R` only | §J | `MAINTAIN_QUESTIONS_QUERY`/`_READ` | `gui`: leaf offered; `api`: allowed | ✅ |
| Signatories `RU (dist)` — **no `C`** | §J | `MAINTAIN_SIGNATORIES_CREATE` withheld | `../maintenance-controls/`: Add withheld while Edit is offered, same screen | ✅ |
| Maintenance deletes `-` | §J (`CRU` vs admin `CRUD`) | *(none)* | `../maintenance-controls/`: Delete withheld on all eight areas, vs offered to an administrator | ✅ |
| **Maintain System `-`** | §J | `MAINTAIN_SYSTEM_READ`, `SYSTEM_ADMIN` withheld | `gui`: the one hidden leaf; `url`: the one refused route; `api`: `/api/system-settings/WMSG` 403 + admin contrast | ✅ |

## Symmetry check

| Denial | Its contrast |
|---|---|
| GUI: Maintenance → System, the single hidden leaf | asserted inside the whole-list comparison, so a Maintenance group that failed to render cannot pass |
| GUI: **offered** write controls (all 14) | `A narrow role is offered none of the controls the scaling managers hold` — the inverted pairing; an administrator contrast would pass against an unconditionally-rendered UI |
| URL: the one refused route | `An administrator reaches /maintenance/system` — matters more than usual with a single-row deny table |
| API: the one denial | `the same call should succeed for a system administrator` |
| API: allowed reads and write inits | `the same call should be refused for a caller with no roles` |
| API: the distinguishing cells | `refused for SCS_CLERICAL` — risk assessment, the check-scale record, and two maintenance areas |
| API: `DELETE` refused | read-back, no admin contrast |
| The `DSM` ≡ `RSM` claim | `both scaling manager roles should agree on <endpoint>` — a granted read, a granted write init, and the one denial |

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | **the `(dist)` / `(rgn)` axis — the only thing separating these two columns** | out of scope by instruction. Unenforced in this source anyway, but note this is the one suite where that axis is load-bearing: it is the entire difference between the two roles. See `defects.md` CG-1 |
| ~~CG-2~~ | ~~Work Bench renew verbs (`WORKBENCH_CREATE`/`_UPDATE`)~~ — **CLOSED 2026-08-31** | there *is* a body-free gated endpoint: the renew and remove endpoints take no request body. Both `DSM` and `RSM` are asserted as passing authorization in `../write-verb-boundaries/write-verb-sweep.feature`, against a nonexistent id so nothing can be renewed |
| CG-3 | ~~the withheld **maintenance** deletes~~ — **CLOSED 2026-08-31**; the four **held record** deletes remain open | the maintenance half is now swept in `../maintenance-controls/`: Delete withheld on all eight §J areas, paired against an administrator offered it on the same eight. The record-tab deletes (contacts and the three others) are still confirm-modal driven and out of `ALL_WRITE_CONTROLS` |
| ~~CG-4~~ | ~~`MAINTAIN_SIGNATORIES_CREATE` withheld — the one maintenance area with no `C`~~ — **CLOSED 2026-08-31** | swept in `../maintenance-controls/maintenance-control-sweep.feature`: Add withheld on `/maintenance/signature-blocks` while Edit is offered on that same screen — so the screen is demonstrably rendering its action row, which is what makes the withheld Add meaningful. Covered for `DSM` and re-checked for `RSM` |
| CG-5 | multi-role users | union semantics, uncovered as for every suite |
