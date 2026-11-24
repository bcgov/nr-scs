# Defects — `SCS_DIST_MANAGER` (`DM`) role scoping

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

### CG-2 — the Work Bench renew verbs are absent rather than refused

`WORKBENCH_CREATE`/`_UPDATE` are not held, but nothing proves a renew is *refused* — the same gap the
read-only suite records, for the same reason: no body-free gated endpoint or verified bindable body exists
for those verbs. Asserting an ungated endpoint would be worse than not asserting it.

### CG-3 — the licence-cancel happy path is not covered

The API probe targets `ZZZZ`, a licence no scaler holds, so authorization runs and the service then fails
to load the row. That proves the permission was granted; it does not prove the write works.

Deliberate: this endpoint's whole purpose is to set a scaler's cancelled date, so probing it against a
pinned anchor would cancel a real licence on every run. Whether the cancel *functions* belongs to a
UC-level suite with its own seeded scaler, not to a role suite.

---

## Verified — not a defect

### V1 — authored blind against a stale WAR, and what that cost — *resolved 2026-08-27*

Authored against source only. At the time, the running backend answered **welcome-only for every
non-administrator role** — `SCS_CLERICAL` included, which had been fully working the day before:

```
CLE /api/scalers/001B          403      (was 200 on 2026-08-26)
DSM /api/scale-auth-templates  403
CET /api/inspection-questions  403
ADM /api/scalers/001B          200      (app otherwise healthy)
none /api/scalers/001B         403
```

The deployed exploded WAR (`backend/target/scs-war-2.21.0-SNAPSHOT/WEB-INF/classes/`, stamped 09:50) had
**none** of `districtScalingManager`, `regionalScalingManager`, `districtManager` or `ceTechnician` in its
compiled `RolePermissions.class`, while `backend/target/classes/` (10:25) had all four. `/welcome`
answering 200 while everything else answered 403 is the signature of a build in which these roles map to
`welcomeOnly()` — not of a build that has never heard of them, which would refuse `/welcome` too because
`forRole` returns `Set.of()` for an unknown name.

**This is the third occurrence.** See the read-only suite's V2 for the first. Diagnose it before trusting
any probe of newly-added backend behaviour:

```bash
grep -c districtManager backend/target/scs-war-*/WEB-INF/classes/ca/bc/gov/nrs/scs/backend/security/RolePermissions.class
```

Method names survive in the `.class` constant pool, so a `0` means the running app has not been rebuilt.
**Resolution:** the WAR was rebuilt the same day and the suite now runs green. Source-reading got the
column right in every respect **except risk assessment**, where it reproduced an expectation `dbf826c` had
already inverted — so the cost of authoring blind was exactly one wrong class of assertion, caught on the
first real run. Recorded because that is the honest measure of how far source-derivation can be trusted:
far, but not far enough to skip the run.

### V2 — moved to the team's private security findings log

### V3 — `Save Record` is the licence-cancel form, not a scaler edit

A reader will see `Save Record` offered on the Performance Remarks tab of a column whose §3 row for
"Scaler Record – Summary – Edit" is `-`, and reasonably suspect a leak.

It is not. `Save Record` there is the Licence Cancelled Date form (legacy
`/scalerPerformanceRemarkCancelScaler.do`), gated on `SCALER_LICENCE_CANCEL` — which is exactly why that
permission was split out of `SCALER_UPDATE`. The scaler's own summary stays read-only: `Edit Record` on the
Summary tab is asserted withheld in the same sweep, and `DELETE /api/scalers/001B` is refused.

### V4 — the delta being invisible in nav, tabs and routes is the point, not thin coverage

Most of this suite asserts that `DM` looks *identical* to the read-only column. That reads like padding.

It is the higher-value half. `SCALER_LICENCE_CANCEL` gates one control and nothing else, so the failure
mode worth catching is it leaking into surface it should not touch — a menu entry, a tab, a route. The one
cell it does grant is a single assertion; everything it must *not* change takes the rest.

### V5 — this suite's Risk Rating prose was stale while its assertions were correct

Scenario titles here said "…and not Risk Rating" after the assertions had been corrected for the
`dbf826c` risk rule. The tests were green throughout — Gherkin prose is not executable, so nothing
announced the drift. Corrected 2026-08-28; root cause and the mitigation are recorded once in
`../read-only-internal-roles/defects.md` **V9**, with the rule change itself in **V8**.

