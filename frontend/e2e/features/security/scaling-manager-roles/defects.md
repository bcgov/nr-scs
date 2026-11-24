# Defects — the scaling manager column (`SCS_DIST_SCALING_MANAGER`, `SCS_REGIONAL_SCALING_MANAGER`)

Legends: `../../../defects-guide.md`, `../../../coverage-guide.md`.

Authored 2026-08-27 from source, against nr-scs `dbf826c` (`Feat/scs roles (#269)`).

---

## Divergences

None. Authored from source on 2026-08-27 and **green against the running app** — after one class of
expectation was corrected: risk assessment, which `dbf826c` had widened to every internal column
(`../read-only-internal-roles/defects.md` **V8**). Two contrast rows in `api-access.feature` also had to
change, because they had used risk endpoints to distinguish this column from `SCS_CLERICAL` and that
distinction no longer exists — see **V6**.

---

## Coverage gaps

### CG-1 — moved to the team's private security findings log

### CG-2 — the Work Bench renew verbs are held but unproven

`WORKBENCH_CREATE`/`_UPDATE` are in the column. Nothing proves a renew *succeeds* past authorization: no
body-free gated endpoint exists for them and no bindable body has been verified. Same gap the `CHK` suite
records as CG-2, from the allow side rather than the deny side — one verified probe body closes both.

### CG-3 — the deletes are not covered, in either direction

This column's delete profile is its most distinctive feature ("authors everything, destroys almost
nothing"), and it is the least covered:

- **Held** — `SCALE_SITE_CONTACT_DELETE`, `SCALER_AUTHORIZATION_DELETE`, `SCALE_SITE_AUTHORIZATION_DELETE`,
  `SCALER_PERFORMANCE_REMARK_DELETE`. Not asserted: delete controls are confirm-modal driven and outside
  `ALL_WRITE_CONTROLS`, and an API probe would destroy shared anchors.
- **Withheld** — the scaler (covered: `DELETE /api/scalers/001B` refused + read back) and every maintenance
  area (not covered — needs a maintenance-page sweep).

**Recommended next step:** assert the held deletes at GUI level only (the control renders), and the
withheld maintenance deletes via a maintenance-page control sweep. Neither needs a destructive API call.

### CG-4 — `MAINTAIN_SIGNATORIES_CREATE` withheld is the sharpest untested cell here

§J's three Signatory rows are `RU (dist)` — the only maintenance area with no `C` for this column. So it
edits signature blocks and cannot add one, and `/maintenance/signature-blocks` is asserted *reachable*
while the distinction that makes it interesting is unasserted.

**Recommended next step:** a control sweep on that page — `Edit Record` offered, `Add` hidden, paired with
an administrator who has both. Small, self-contained, and the same mechanism `CET`'s CG-2 needs.

### CG-5 — multi-role users are not covered

Union semantics via `RolePermissions.forRoles`. Uncovered, as for every suite.

---

## Verified — not a defect

### V1 — authored blind against a stale WAR — *resolved 2026-08-27*

The third occurrence of the stale-exploded-WAR problem (see `../dist-manager-role/defects.md` V1 and
`../read-only-internal-roles/defects.md` V2). At authoring time every non-administrator role answered
welcome-only; the admin baseline and the `none` sentinel behaved correctly, so the app was healthy and only
the role map was backdated.

The deployed `RolePermissions.class` (09:50) contained neither `districtScalingManager` nor
`regionalScalingManager`; `target/classes` (10:25) contained both.

**Resolution:** the WAR was rebuilt the same day and the suite runs green — including the exhaustive
route-level claim that `/maintenance/system` is the **only** refused route in the whole application for
this column, which was derived by cross-referencing the permission list against every `permission` prop in
`routePaths.tsx`. That was the claim most in need of a real run, and it held.

### V2 — moved to the team's private security findings log

### V3 — the administrator is the wrong contrast for this column, and using it would be a silent no-op

Worth recording as a method note, because it is the trap this suite is shaped around.

Every other role suite pairs a denial with an administrator: it proves the denied thing exists and works.
That works because those columns deny a lot. This column denies almost nothing — so an administrator
pairing on its *allow* rows compares two callers who both hold the permission, and would pass just as
happily against a UI that rendered every write control unconditionally, or an endpoint gated on nothing.

So the pairings invert:

| Assertion | Contrast | What it rules out |
|---|---|---|
| 14 write controls **offered** | `SCS_CLERICAL` sweeping the same controls | the controls are ungated rather than granted |
| reads and write inits **allowed** | the roleless sentinel (`X-Mock-Roles: none`) | the endpoint is open to anyone |
| the distinguishing cells allowed | `SCS_CLERICAL` refused the same call | the 403 tracks a specific permission, not the whole column |
| `/maintenance/system` **refused** | an administrator reaching it | the route is broken or deleted for everyone |

Only the last is the conventional shape.

### V4 — the Risk Rating tab being offered here contradicts a literal reading of §3, and is correct

§3 has **one** risk row ("Risk Rating Criteria", §D) and no scaler-subject row at all. Read literally, that
`CR` is the ceiling — which is how it was first read, withholding `_UPDATE` from every column but the
administrator and leaving the two assessment edit routes reachable by nobody else.

The rule now in the `RolePermissions` class javadoc supersedes that: **risk assessment follows the record
it hangs off.** An assessment is another tab on the scaler or scale-site record, so it takes the level the
role holds on that record's other tabs — full read → query/read; any tab create/update/delete →
create/update. These columns author across both records whole, so they hold every verb both subjects
expose.

Two consequences this suite asserts: the Risk Rating tab renders (the first non-administrator column for
which it does), and the two edit routes are reachable.

The same rule is why the tab is **withheld** from the two external roles — the assessment search and
read-by-id are keyed on `riskQuestionnaireId` and nothing client-scopes them, which
`ClientScopeInterceptorTest` fails the build over.

### V5 — the licence-cancel probe targets a nonexistent licence on purpose

`PATCH /api/scalers/ZZZZ/licence-cancelled-date` looks like a typo. It is deliberate: the endpoint's whole
purpose is to set a scaler's cancelled date, so aiming it at a pinned anchor would cancel a real licence on
every run.

`@RequiresPermission` is an AOP interceptor around the handler and the permission is not record-scoped for
an internal role, so authorization runs *before* the service tries to load the row. A non-403 therefore
proves the permission was granted while nothing is written either way. Asserted as "not 403" rather than a
pinned status, so a security assertion is not hostage to whichever status a missing record produces.

### V6 — two contrast rows stopped discriminating when risk assessment widened

`api-access.feature`'s "allowed here and refused for a read-only internal role" outline originally used
the two risk searches to separate this column from `SCS_CLERICAL`. After `dbf826c` that column holds the
risk query/read verbs too, so those rows asserted a denial that no longer happens — they would have failed
as written, and had they been phrased the other way round they would have *passed while proving nothing*.

Replaced with the cells that still separate the two columns: the check-scale record and four maintenance
areas. Recorded because the failure mode is general — a contrast row is only as good as the gap it names,
and widening a narrow column silently erodes every contrast built on that gap.

