# Defects — `SCS_CE_TECHNICIAN` (`CET`) role scoping

> **⚠️ Re-ground 2026-09-03 for the client's 2026-09-02 spec, against the unmerged nr-scs branch
> `bugfix/updated-role-scoping-specs`.** The scenarios changed in that pass were derived from source on
> that branch — `RolePermissions`, the controller `@RequiresPermission` annotations and `routePaths.tsx`
> — and **no green run against a build of it is recorded here**. Any "all N green" note below predates
> the re-ground and does not cover the changed rows. Run the suite against a stack built from that branch
> before trusting them, and delete this note in the commit that does.
>
> Ordering: land the nr-scs branch first. Against a `main` build these scenarios fail — correctly, since
> `main` predates the spec change.

Legends: `../../../defects-guide.md`, `../../../coverage-guide.md`.

Authored 2026-08-27 from source, against nr-scs `dbf826c` (`Feat/scs roles (#269)`).

---

## Divergences

None. The suite was authored from source on 2026-08-27 and is **green against the running app** — but only
after one class of expectation was corrected: risk assessment, which `dbf826c` had widened to every
internal column. That correction is recorded in `../read-only-internal-roles/defects.md` **V8**, and it is
the reason **V1** below is worth reading before trusting a source-derived expectation.

---

## Coverage gaps

### CG-1 — moved to the team's private security findings log

### CG-2 — the Questions page's own write controls are not swept

§J gives this column `R` on Maintain Questions and withholds create, update and delete. The route is
asserted reachable and the API read allowed, but nothing asserts the page's **Add / Edit Record / Delete**
controls are hidden.

**Why:** those controls are gated by opt-in permission props on the two shared maintenance components
(added when this role was built, since every prior caller held every verb). They live on a maintenance
page, not a record tab, so they are outside `ALL_WRITE_CONTROLS` and outside `RecordTabsPage`'s tab-strip
mechanism.

**Recommended next step:** a small maintenance-page sweep — visit `/maintenance/questions` as `CET` and
assert `Add`, `Edit Record` and `Delete` are hidden, paired with an administrator on the same page. This is
the only place in the matrix where a non-administrator reads a maintenance screen, so the gating has
exactly one caller and no other suite will cover it.

### CG-3 — the check-scale and inspection write happy paths are not proven at the API level

`CHECK_SCALE_CREATE`/`_UPDATE` and `SUMMARY_CHECK_SCALE_*` are covered at the URL level (the routes are
reachable) and, for inspections, at the API level via the body-free init GETs. No bindable body has been
established for the check-scale writes themselves — the same gap the `CHK` suite records as its CG-2.

Inherited rather than new: one verified probe body would close it for both suites.

### CG-4 — multi-role users are not covered

`RolePermissions.forRoles` grants the union. Not covered here, as for every suite.

---

## Spec gaps

### SG-1 — §3 contradicts itself on this column's check-scale writes; §4 sides with the minority

Recorded because a reader comparing the spec against this suite will find a real conflict, and the suite
follows the majority reading rather than the document's own summary.

| Source | Says |
|---|---|
| §I — the section *about* check scales | `CR`, `CR`, `RU`, `RU` across its four rows — **identical to `CHK`** |
| §D "Scale Site Record – Check Scales" | `CR` — agrees |
| §C "Scaler Record – Check Scales" | `R` — **disagrees** (`CHK` has `CR`) |
| §4 | "**View** check-scale history", and in the very next bullet "**Complete** site-inspection reports" — a contrast that reads as deliberate |

`RolePermissions.ceTechnician()` grants the writes (Decision: Jonah, 2026-08-26) on three grounds: §3 is
the stated source of truth and five of its six relevant cells grant the write; §C's lone `R` **cannot be
honoured independently anyway**, because the vocabulary has one `CHECK_SCALE_CREATE` gating both the tab's
Add button and the create wizard, so withholding it to satisfy §C would contradict all four §I rows; and
legacy gives no basis for splitting check scales from inspections, having delivered both through the same
Handheld upload items.

**If the ministry does intend this column read-only on check scales,** the fix is §3 §I → `R` for `CET`
plus a one-line change in `ceTechnician()`. `RolePermissionsTest` pins the current reading in both
directions, and this suite asserts it at all three levels — so the change would be caught, not silent.

---

## Verified — not a defect

### V1 — authored blind against a stale WAR, and what that cost — *resolved 2026-08-27*

Same environment problem as `../dist-manager-role/defects.md` V1 and the third occurrence overall. At
authoring time every non-administrator role answered welcome-only, including `SCS_CLERICAL` which had
worked the previous day; the admin baseline and the `none` sentinel both behaved correctly, so the app was
otherwise healthy.

The deployed exploded WAR's compiled `RolePermissions.class` (09:50) contained no `ceTechnician` symbol,
while `target/classes` (10:25) did.

**Resolution:** the WAR was rebuilt the same day and the suite now runs green. Source-reading got this
column right except for risk assessment, where it reproduced an expectation `dbf826c` had already inverted
(**V6** / read-only **V8**) — one wrong class of assertion, caught on the first real run.

### V2 — moved to the team's private security findings log

### V3 — Administration renders with no Work Bench, which looks broken and is correct

Every other internal column reaches Administration *through* the Work Bench. This one does not hold
`WORKBENCH_QUERY` at all (§A is `-`), yet the Administration group still renders — because §J's Questions
cell gives it one visible child under Maintenance.

That is the exact inverse of the read-only internal column (Work Bench, no Maintenance), and neither is
special-cased: both follow from "a group with no visible child is dropped". Worth recording because
"Administration renders but Work Bench is missing" is the kind of thing that gets reported as a nav bug.

### V4 — ~~the advisory letter is granted while the MSD letter is refused~~ — SUPERSEDED 2026-09-02

**What it recorded:** both were `_LETTER` verbs on the same column and the asymmetry was deliberate — the
"owns the workflow end to end" test. This column authored check scales (§I `CR`) so it could issue the
advisory letter; it did not author designations (§F `-` on both create rows) so it could not issue theirs.

**Why it no longer applies:** the client's 2026-09-02 spec makes this column read-only, so it issues
**neither**. What replaces the asymmetry is a sharper one in the same place — the column may *view* a
stored letter and may not *compose* one, which is why the single `_LETTER` verb was split into
`_LETTER_VIEW` and `_LETTER_CREATE`. `CET` is the only column where those two differ, so it is the only
place the split is observable at all.

**Still worth knowing:** there is no advisory-letter view. SCS generates that letter without storing it
and exposes no GET, so `CHECK_SCALE_ADVISORY_LETTER_CREATE` has no `_VIEW` counterpart and this column
reaches no advisory letter by any route.

### V5 — ~~`Save Record` is withheld on a tab this column can otherwise write to~~ — SUPERSEDED 2026-09-02

**What it recorded:** `CET` held `SCALER_PERFORMANCE_REMARK_CREATE`, so `Add Performance Remark` rendered
while `Save Record` on the **same tab** did not — that control is the Licence Cancelled Date form, gated
on `SCALER_LICENCE_CANCEL`, which §4 gives the district and regional managers.

**Why it no longer applies:** the client's read-only rule withdrew the remark writes too, so **both**
controls are now absent and the tab offers this column nothing. The surviving example of "two controls on
one tab, gated separately" is `DM`, which holds `SCALER_LICENCE_CANCEL` and no remark writes — the exact
inverse of what this entry described, and asserted in `../dist-manager-role/`.

Two controls, one tab, two permissions. `../dist-manager-role/` asserts the exact opposite pairing on the
same two controls.

### V6 — this suite's Risk Rating prose was stale while its assertions were correct

Scenario titles here said "…and not Risk Rating" after the assertions had been corrected for the
`dbf826c` risk rule. The tests were green throughout — Gherkin prose is not executable, so nothing
announced the drift. Corrected 2026-08-28; root cause and the mitigation are recorded once in
`../read-only-internal-roles/defects.md` **V9**, with the rule change itself in **V8**.

