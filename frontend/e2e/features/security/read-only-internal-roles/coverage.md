# Coverage — the read-only internal column: `SCS_CLERICAL` (`CLE`), `SCS_BRANCH_SYS_SUPPORT` (`SUP`), `SCS_REGIONAL_MANAGER` (`RM`)

**Spec:** the roles & permissions matrix §3 — three columns, read cell by cell —
plus §4's per-role prose, as resolved in `RolePermissions.readOnlyInternalColumn()` / `.clerical()` /
`.branchSystemSupport()` / `.regionalManager()`.

**Rows below are matrix cells, not source items,** and each citation is a `roles-permissions.md` section
rather than a `-slices.md` line. That is the difference between a role ledger and a screen ledger: the
axis is one column of the permission matrix, cutting across every screen.

## One suite, three roles — and the condition that ends it

These three columns agree on **78 of §3's 79 rows**, and `RolePermissions` maps all three to the same
30-permission `Set` (asserted in Java by `RolePermissionsTest`). The single variation is §A's Work Bench:
`R (ltd)` for `CLE`/`RM`, plain `R` for `SUP`. `(ltd)` is org-unit **breadth**, not a permission letter,
so the three roles share one permission set.

That is what licenses one outlined suite instead of three, and it has an explicit expiry:
`org-unit-scoping.feature`'s last scenario asserts the premise, so it fails the moment org-unit scoping
changes. At that point `CLE`/`RM` narrow, `SUP` does not, and this suite must be split per role.

Every scenario is outlined over the roles rather than written once against `CLE`, so running it *proves*
the equality rather than assuming it.

## Why three levels (plus a fourth axis)

| File | Question it answers | What a gap here means | Enforcer under test |
|---|---|---|---|
| `gui-access.feature` | Does the app **offer** the action? | A user is shown a control that does nothing, or walked into a 403. | `permissions.ts`, `navigation.ts` |
| `url-access.feature` | Can the route be entered by **address bar**? | A bookmark or emailed link reaches a screen the role must not see. Hiding the menu contained nothing. | `ProtectedRoute` |
| `api-access.feature` | Does the **server** refuse the call? | The permission model is decoration — anyone can issue the request by hand. | `@RequiresPermission` |
| `org-unit-scoping.feature` | **Whose rows** may it see? | Org-unit data scoping. | *(see SG-1)* |

Only `api-access.feature` carries security assertions; the other two are usability assertions.

## What makes this column different from the three suites before it

1. **It is entirely reads.** Thirty permissions, every one a `_READ` or `_QUERY`. So there is no
   allow-side write to prove, and the exposure inverts: an endpoint answering 200 for *everyone* would
   satisfy every allow row. An administrator contrast cannot detect that — both callers hold the
   permission — so the allow rows are paired against the **roleless sentinel** (`X-Mock-Roles: none`).
   Deliberately not a role: all eleven are enabled, and two attempts at a role-based baseline were
   invalidated within a day (`defects.md` V1, V6). **This is the one structural thing this suite adds.**
2. **It is a strict read-only subset of `CHK`.** Every page it opens was already opened by the Check
   Scaler, so that suite's in-page control sweep covers these roles too — which is why the write-control
   sweep here reuses the union of that suite's offered *and* withheld control lists and requires **all**
   of them hidden.
3. **The role is a scenario parameter,** a first for this suite family.

## §A General & Navigation

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| SCS Home Page `R` | §A | `WELCOME_READ` | `url`: `/welcome`; `api`: `/api/welcome` | ✅ |
| Work Bench `R` — the read | §A | `WORKBENCH_QUERY` | `gui`: Administration offers Work Bench; `url`: `/workbench`; `api`: all three queues | ✅ |
| Work Bench — no `C`/`U` (cannot renew) | §A | *(none held)* | `api`: the three queues are read-only; no renew verb is granted to probe | ⚠️ CG-2 |
| Work Bench `(ltd)` = district / region scoping | §1, §A | *(none)* | `org-unit`: asserted **inert**, plus the premise scenario | ⚠️ SG-1 |
| Create menu absent | §3 (no `_CREATE` cell anywhere) | *(none held)* | `gui`: `"Create" menu should not be offered` | ✅ |
| Administration collapses to Work Bench | §J all `-` | *(none held)* | `gui`: `Administration should offer only the Work Bench` | ✅ |

## §B Client Queries

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Queries – Clients `R` | §B | `CLIENT_QUERY` | `gui`: Queries offers Clients; `url`: `/client`; `api`: `/api/clients/search` | ✅ |
| Queries – Clients – Results `R` (unscoped) | §B | `CLIENT_QUERY` | `api`: results returned, not narrowed — no `(ltd)` on an internal column | ✅ |

## §C Scaler – Search & Records

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Queries – Scalers (+ Results) `R` | §C | `SCALER_QUERY` | `gui`; `url`: `/scalers`, `/scalers/summary`; `api`: search | ✅ |
| Scaler – Create `-` | §C | *(none)* | `url`: `/scalers/create` refused; `gui`: no Create menu | ✅ |
| Scaler Record – Summary `R`, Summary – Edit `-` | §C | `SCALER_READ` | `url`: view reachable; `gui`: `Edit Record` withheld | ✅ |
| Scaler Record – Address `R` | §C | `SCALER_ADDRESS_READ` | `gui`: Address tab readable | ✅ |
| Scaler Record – Authorizations `R` | §C | `SCALER_AUTHORIZATION_QUERY` | `gui`: tab readable; `Add Authorization` withheld | ✅ |
| Scaler Record – Check Scales `R` (list only) | §C | `SCALER_CHECK_SCALE_QUERY` | `gui`: tab readable, `Add Check Scale` withheld; `api`: site check-scales allowed while the record is refused | ✅ |
| Scaler Record – Exams / Upgrades `R` | §C | `SCALER_EXAM_QUERY` | `gui`: tab readable; `Add Exam / Upgrade` withheld | ✅ |
| Scaler Record – Appointments `R` | §C | `SCALER_APPOINTMENT_QUERY` | `gui`: tab readable; `Add Appointment` withheld | ✅ |
| Scaler Record – Performance Remarks `R` | §C | `SCALER_PERFORMANCE_REMARK_QUERY` | `gui`: tab readable; `Add Performance Remark` withheld | ✅ |
| Scaler licence cancel `-` | §4 (granted to `DM`, not here) | *(none)* | `gui`: `Save Record` on Performance Remarks withheld | ✅ |
| Scaler delete `-` | §C | *(none)* | `api`: `DELETE /api/scalers/001B` refused **and read back** | ✅ |

## §D Scale Site – Search & Records

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Queries – Scale Sites (+ Results) `R` | §D | `SCALE_SITE_QUERY` | `gui`; `url`: `/scale-sites`; `api`: search | ✅ |
| Scale Site – Create `-` | §D | *(none)* | `url`: `/scale-sites/create` refused | ✅ |
| Scale Site Record – Summary `R`, Edit `-` | §D | `SCALE_SITE_READ`, `_SUMMARY_READ` | `url`: view reachable; `gui`: `Edit Record` withheld | ✅ |
| – Activity Summary `R` | §D | `SCALE_SITE_ACTIVITY_READ` | `gui`: tab readable; `api` | ✅ |
| – Contacts `R`, no create | §D | `SCALE_SITE_CONTACT_QUERY`/`_READ` | `gui`: tab readable; both Add controls withheld | ✅ |
| – Site Authorizations `R` | §D, §E | `SCALE_SITE_AUTHORIZATION_QUERY`/`_READ` | `gui`; `url`: `/scale-site-authorizations/view/239313` | ✅ |
| – Authorized Scalers `R` | §D | `SCALE_SITE_AUTHORIZED_SCALER_QUERY` | `gui`: tab readable; `api` | ✅ |
| – MSD `R` | §D | `SCALE_SITE_MSD_QUERY` | `gui`: tab readable; `Add Mark Site Designation` withheld | ✅ |
| – Inspections `R` | §D, §H | `SCALE_SITE_INSPECTION_QUERY`/`_READ` | `gui`: tab readable; `Add Inspection` withheld | ✅ |
| – Check Scales `R` (list only) | §D | `SCALE_SITE_CHECK_SCALE_QUERY` | `gui`: tab readable; `api`: allowed | ✅ |
| – Software Use `R` | §D | `SCALE_SITE_SOFTWARE_QUERY` | `gui`: Software tab readable; `api` | ✅ |
| – Risk Rating Criteria — read half granted | class javadoc rule, not §3 literally | `*_RISK_RATING_QUERY`, `*_RISK_ASSESSMENT_QUERY`/`_READ` | `gui`: tab **offered** on both records; `url`: both search screens reachable, both create routes refused; `api`: 4 risk reads allowed | ✅ |

## §E Authorizations

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Scaler Authorization `R` | §E | `SCALER_AUTHORIZATION_READ` | `url`: view; `api`: `/api/scaler-authorizations/147851` | ✅ |
| Scale Site Authorization `R` | §E | `SCALE_SITE_AUTHORIZATION_READ` | `url`: view | ✅ |
| Create / Edit rows `-` | §E | *(none)* | `url`: create + edit refused, both flavours | ✅ |
| Authorization letters `-` | §E (no create row → no lifecycle) | *(none)* | `url`: both `/letter` routes refused | ✅ |

## §F Mark / Site Designations

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Query – MSD (+ Results) `R` | §F | `MSD_QUERY` | `gui`; `url`: `/mark-site-designations` | ✅ |
| Mark Site Designation `R` | §F | `MSD_READ` | `url`: `/mark-site-designations/view`; `api`: `/1101` | ✅ |
| Create / Edit rows `-` | §F | *(none)* | `url`: create + edit refused | ✅ |
| MSD letter `-` | §F | *(none)* | `url`: `/mark-site-designations/1101/letter` refused | ✅ |

## §H Site Inspections

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Site Inspection `R` | §H | `SCALE_SITE_INSPECTION_READ` | `url`: view; `api`: `/api/scale-sites/inspection/322429` | ✅ |
| – Create `-` | §H | *(none)* | `api`: the create-init GET refused, + admin contrast | ✅ |
| – Update `-` | §H | *(none)* | `api`: the edit-init GET refused, + admin contrast | ✅ |

## §I Check Scales — the tab/record split

The sharpest thing this suite asserts, and judgement call (2) in `RolePermissions.clerical()`.

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Every §I row `-` → the check-scale **record** is closed | §I | `CHECK_SCALE_QUERY` withheld | `url`: view / edit / advisory-letter refused; `api`: `/api/check-scales/search` refused for all three roles | ✅ |
| …while both check-scale **tabs** stay readable | §C, §D both `R` | `SCALER_CHECK_SCALE_QUERY`, `SCALE_SITE_CHECK_SCALE_QUERY` | `gui`: both tabs render; `api`: `/api/scale-sites/520/check-scales` allowed | ✅ |
| Summary check scales — create / update `-` | §I | *(none)* | `url`: `/summary-check-scales/create` refused | ✅ |
| Summary Check Scales **tab** readable | §C | `SCALER_CHECK_SCALE_QUERY` | `gui`: tab in `readableScalerTabs` | ✅ |

## §J Reference-Data Maintenance & System Admin

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| All nine rows `-` | §J | *(none held)* | `url`: all 9 `/maintenance/*` refused; `api`: 8 maintenance endpoints refused; `gui`: nested group dropped | ✅ |

## Reports (§4 "View reports")

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| View reports — menu-level | §4 | `REPORT_READ` | `gui`: all 8 leaves render; `url`: 2 report routes reachable | ✅ |

Per-report granularity is deferred project-wide — the matrix has no per-report rows, so there is nothing
finer to assert. Legacy agrees: `getAQRMenus()` included Reports wholesale.

## Symmetry check — where each denial's contrast lives

| Denial | Its contrast |
|---|---|
| GUI: nav groups / leaves withheld | `An administrator is offered the Maintenance sub-group` |
| GUI: Risk Rating tab — now an ALLOW, not a denial | needs no admin pairing; its withheld half (create/update) is paired at the URL level, where both assessment create routes stay refused |
| GUI: every write control withheld | `An administrator is offered every write control the read-only column is denied` — the same sweep, same locators |
| URL: 30 refused routes | `<route> is reachable for a role that holds the permission` — sampled, one per matrix section |
| API: refused reads and write-inits | `the same call should succeed for a system administrator`, on every row |
| API: **allowed** reads | `the same call should be refused for a role holding no permissions` — the inverse pairing this column needs |
| API: `DELETE` refused | *(no admin contrast by design — it would delete a pinned anchor; the write-denial contrast is carried by the init-GET pair)* |
| Scoping: nothing narrows | Paired by identity — the same search as an administrator, compared exactly |

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | org-unit scoping behaviour (`D`/`R`/`H` breadth, fail-closed) | see the private security findings log |
| ~~CG-2~~ | ~~Work Bench renew verbs are absent rather than refused~~ — **CLOSED 2026-08-31** | the renew and remove endpoints take **no request body**, so they always reached authorization — the inherited "no body-free probe" premise was mistaken. All three roles are now asserted as refused with 403 in `../write-verb-boundaries/write-verb-sweep.feature`, paired against the columns that hold the permission |
| CG-3 | multi-role users | a user holding `SCS_CLERICAL` **and** a wider role gets the union; not covered here, as for every suite before it |
| CG-4 | the other **four** enabled roles — `DM`, `CET`, `DSM`, `RSM` | all four now enabled and probeable (the WAR was refreshed; see `defects.md` V2). Each needs its own folder — see below |

### CG-4 in detail — what remains, now that all eleven roles are enabled

At authoring time `CLE`/`SUP`/`RM` were the only newly-enabled roles present in the deployed build. Four
more are now live, and none is covered:

| Role | Shape relative to this column | Probed 2026-08-26 |
|---|---|---|
| `SCS_DIST_MANAGER` (`DM`) | this column **+ `SCALER_LICENCE_CANCEL`** | reads 200, `/inspection-questions` 403 |
| `SCS_CE_TECHNICIAN` (`CET`) | own shape: check-scale + inspection + remark writes, **no Work Bench**, **+ `MAINTAIN_QUESTIONS_*`** | reads 200, **`/inspection-questions` 200** — the only §J cell granted to a non-administrator |
| `SCS_DIST_SCALING_MANAGER` (`DSM`) | the widest non-administrator column — create wizards, maintenance, risk assessment | enabled `7d7d6aa` |
| `SCS_REGIONAL_SCALING_MANAGER` (`RSM`) | `RolePermissions` javadoc says it shares `DSM`'s list, differing only in `(dist)` vs `(rgn)` | enabled `1e16754` |

Two notes for whoever picks these up:

- **`DM` is the cheapest.** Its one extra cell is already asserted here in the negative —
  `withheldWriteControls` includes `Save Record` on the Performance Remarks tab — so its suite pins the
  opposite side of the same control, and `RolePermissions.districtManager()` records the combination
  (cancel without remark writes) as a new one.
- **`DSM`/`RSM` look like a repeat of this suite's shape**: two columns claimed identical bar a breadth
  qualifier, which is the same argument that licensed one outlined suite for three roles here. Verify it
  cell by cell before assuming — and read this folder's `defects.md` V6 first, because the holds-nothing
  contrast those suites will need is now the roleless sentinel, not a role.
