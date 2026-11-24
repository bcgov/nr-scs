# Defects — `SCS_CHECK_SCALER` (`CHK`) role scoping

Registers follow `defects-guide.md`: **Divergence** (app differs from spec → a red, tagged test),
**Bug**, **Coverage gap** (untested cell), **Spec gap** (the spec contradicts itself or the world), and
**Verified — not a defect** (something that looked wrong and was confirmed correct).

That last register earns its keep here more than anywhere. Role work generates convincing false alarms,
and this column — the first internal one, and the first with writes — generated four. Each cost real time
to run down; none is a defect. Read V1–V4 before reporting anything from this suite.

**Status at 2026-08-25: 148 scenarios, 148 green, no divergences.** Every status quoted below was
measured against the seeded local stack (backend `:8080`, mock auth), not inferred from the matrix.

---

## Divergences

**None.** The `CHK` column is enforced exactly as `roles-permissions.md` §3 and
`RolePermissions.checkScaler()` describe it, at all three levels. Worth stating plainly: for the two
columns enabled before this one, the equivalent section carried a real find each time (a denial answering
500 for `IND`; a shared-anchor race for `OWN`). This one did not.

The permission-denial status contract that was industry-scaler **Divergence #1** — a
`@RequiresPermission` denial answering `500` because `GlobalApiExceptionHandler` had no handler for
`AuthorizationDeniedException` — is **fixed**, and is re-pinned here by its own scenario at the foot of
`api-access.feature` so a regression shows up once rather than reddening the whole matrix.

---

## Coverage gaps

### CG-1 — moved to the team's private security findings log

### CG-2 — the update verbs are reachable but not proven

`CHECK_SCALE_UPDATE`, `SUMMARY_CHECK_SCALE_CREATE/UPDATE`, `MSD_UPDATE`,
`SCALER_PERFORMANCE_REMARK_UPDATE` and `WORKBENCH_CREATE/UPDATE` are covered only at the URL level (the
edit route is reachable) and, for some, the GUI level (the Create leaf renders). No API-level assertion
proves the *server* honours them.

**Why:** an allow-side write needs either a body-free gated endpoint (as the inspection create/edit-init
GETs provide) or a bindable body verified to reach service-side validation. Neither has been established
for these. `PUT` init endpoints exist for some, but none was confirmed to be gated rather than merely
working — and asserting an ungated endpoint would be worse than not asserting it.

**Recommended next step:** for each, probe `<role>` vs `SCS_CLERICAL` on the update endpoint with a
bindable body, and add it to `buildWriteProbeBody` only once the welcome-only caller is confirmed to get
`403` while the check scaler does not. The Work Bench renew verbs additionally need a seeded expiring
authorization — reuse the recipe in `fixtures/admin/workbench/workbench-test-data.ts`.

### CG-3 — `SCALER_PERFORMANCE_REMARK_DELETE` cannot be asserted at the API level

`DELETE /api/scaler-performance-remarks/{id}` answers **500 for every role tested** —
`SCS_CHECK_SCALER`, `SCS_CLERICAL` (welcome-only) and `SCS_SYS_ADMIN` alike — against a nonexistent id.
Authorization is never reached, so no status assertion on this endpoint can distinguish a role that holds
the permission from one that does not.

This was initially mistaken for positive evidence (see **V3**). It is not; it is an absence of evidence.
The permission itself is pinned by `RolePermissionsTest.CheckScaler`, so the map is covered — only the
enforcement path is not.

**Blocked on:** a real, disposable performance remark to delete, or the 500-on-missing-id being fixed so
the endpoint answers 404/403 in an order that reveals the permission check.

### CG-4 — `CHECK_SCALE_ADVISORY_LETTER` cannot be asserted at the API level

Identical shape to CG-3: `GET /api/check-scales/{id}/advisory-letter` answers **500 for every role**,
including an administrator, so authorization is never reached. Covered at the URL level only (the route is
reachable for this role). The 500 itself is not role-related and is out of scope for this suite — it
belongs to the check-scale domain suite (`features/chk/`).

### CG-5 — multi-role users are not covered

A user holding `SCS_CHECK_SCALER` alongside another enabled role gets the union of both columns
(`expandAuthorities` unions per-role permission sets). No scenario asserts that union, for this column or
any other. Low priority while FAM issues one functional role per user, but it is the obvious next axis
once that stops being true.

---

## Spec gaps

### SG-1 — moved to the team's private security findings log

### SG-2 — three `CHK` grants have no matrix row at all

`SUMMARY_CHECK_SCALE_CREATE/UPDATE`, `MSD_LETTER` and `CHECK_SCALE_ADVISORY_LETTER` are granted by
resolution, not by a matrix cell — `roles-permissions.md`'s own preamble says so, and
`RolePermissions.checkScaler()` records the reasoning (judgement calls 2 and 3). The tests assert the
resolution, so if it is ever revisited the tests must be revisited with it.

Called out because it is the one place in this suite where the assertions are grounded in a Java comment
rather than in the spec document. The letter pair in `api-access.feature` is the direct test of judgement
call (3); judgement call (2) is only partly covered (CG-2, CG-4).

---

## Verified — not a defect

### V1 — `/api/system-status` answers 200 for a role holding no maintenance permission

Looks alarming: `CHK` holds no `MAINTAIN_*` permission, yet `GET /api/system-status` returns 200 for it
(and for a welcome-only role, and for an anonymous caller).

**Not a defect.** The endpoint is explicitly `permitAll()` — `SecurityConfig.java:261`,
`auth.requestMatchers(pathMatcher(API_BASE_PATH + "/system-status")).permitAll()`. It is a health
endpoint, deliberately open, and unrelated to §J's "Maintain System" row, which is
`MAINTAIN_SYSTEM_READ/UPDATE` on `/api/system-settings/*`. Those *are* refused (403), and
`/maintenance/system` redirects to `/unauthorized`.

No scenario asserts `system-status`, on purpose: an ungated endpoint has nothing to say about a role.

### V2 — a write is body-checked BEFORE it is permission-checked, so a bodyless write probe is vacuous

The single most important finding for anyone extending this suite, and the reason every write scenario
here carries a body.

Spring method security (`@RequiresPermission` → `@PreAuthorize`) is an AOP interceptor **around** the
handler, so request-body binding and Jakarta bean validation both run first. Measured:

| Probe | `SCS_SYS_ADMIN` | `SCS_CHECK_SCALER` | `SCS_CLERICAL` (welcome-only) |
|---|---|---|---|
| `POST /api/check-scales` **bodyless** | 500 | 500 | 500 |
| `POST /api/scalers` **bodyless** | 500 | 500 | 500 |
| `POST /api/scale-sites/520/inspections` **bodyless** | 500 | 500 | 500 |
| `POST /api/scale-sites` body failing **bean** validation (`scalingMethods: []`) | 400 `VALIDATION_ERROR` | 400 | 400 |
| `POST /api/scale-sites` body failing **service** validation (bad owner client) | 422 | **403** | 403 |

The first four rows are identical for a role that holds the permission, a role that does not, and an
administrator — so any assertion built on them is true regardless of what the permission layer did. Only
the last row distinguishes anything.

**The rule this produces:** a write probe body must (1) bind, (2) pass bean validation, and (3) fail a
*service-side* business rule. Telling (2) from (3) at the wire is easy — bean validation answers
`VALIDATION_ERROR` with a `fieldErrors` array; service rules answer `BAD_REQUEST`/`NOT_FOUND`/
`UNPROCESSABLE_ENTITY` with a prose `message`. Check for `fieldErrors` before trusting a new body.

This extends the industry-scaler suite's V5 with the third role's data and the bean-vs-service
distinction, which V5 did not separate.

### V3 — a 500 shared with an administrator is NOT proof that authorization passed

A mistake made while building this suite, recorded so it is not repeated. `DELETE
/api/scaler-performance-remarks/999999999` answers 500 for `CHK` and 500 for `SCS_SYS_ADMIN`, and that
symmetry looks like "the check scaler got as far as the administrator did, so its permission was read".

It is not. `SCS_CLERICAL`, which holds nothing at all, answers 500 as well. The error precedes
authorization entirely, so the symmetry says nothing. Same for
`GET /api/check-scales/{id}/advisory-letter`.

**The check that settles it:** always probe a **welcome-only role** alongside. If it gets the same status
as the role under test, authorization was never consulted and there is no assertion to make. This is why
`WELCOME_ONLY_ROLE` exists in `check-scaler-test-data.ts` and why the allow-side write scenarios are
written as pairs. CG-3 and CG-4 are the two cells this rule disqualified.

### V4 — an in-page control read immediately after a tab click reports hidden

The GUI-level equivalent of V2, and dangerous in the same direction: a control read before its tab panel
has mounted reports **hidden**, which would record a *leaked* write control as correctly withheld — a
false pass on a security-adjacent assertion.

First run of `An administrator is offered every control the check scaler is denied` failed for exactly
this reason: `isVisible()` fired immediately after `locator.click()`, before the panel's query resolved.

**Handled** in `activateTab`, now shared as `pages/security/RecordTabsPage.ts`: click, wait for
`aria-selected="true"`, wait for the panel wrapper to attach, then wait for Carbon's skeletons to drain.
And structurally: the deny loop is paired with an administrator running the *identical* loop with the
same timing, so a settle window that is too short turns the contrast scenario red instead of turning the
deny scenario quietly green.

**Updated 2026-09-04 — the wait was timing out under a full-suite run while passing in isolation.** Two
scenarios here and two in `../ce-technician-role/` failed on "the *Check Scales* / *Contacts* panel must
finish loading" during a whole-domain run at four workers; every one of them passed on its own. The
cause was budget, not the app: `activateTab` ended with a `networkidle` wait *after* the skeleton drain,
and that was redundant twice over — the drain is already the state-based signal, and these record views
fire enough background queries that idle is not a state they reliably reach. A sweep clicks several tabs
inside one 60-second test, so the redundant wait was being charged against the budget the real signal
needed.

The trailing `networkidle` is gone and the skeleton budget went 15s → 30s with the time it freed. Both
changes only ever make the wait for the REAL signal longer, so V4's guarantee is strengthened rather than
relaxed — this is the opposite of loosening a flaky assertion. Verified: `--grep "@CHK|@CET"` at two
workers, **327 passed**.

Worth knowing generally: this failure mode announces itself. It fails LOUD with a message naming the
panel, never by reading a control over a skeleton — which is exactly what V4 built it to do.

### V5 — `GET /api/scale-sites/520` answers 500 for every role, including an administrator

Not role-related, and deliberately not asserted anywhere in this suite. `GET /api/scale-sites/{id}` (the
bare record endpoint) answers 500 for `SCS_CHECK_SCALER` and `SCS_SYS_ADMIN` alike, while
`/scale-sites/{id}/summary` and `/scale-sites/{id}/tombstone` both answer 200 for both. The suite uses
`/summary` for the `SCALE_SITE_READ` assertion.

Flagged for the scale-site domain suite (`features/sst/`) rather than fixed or asserted here — a
role-scoping suite has nothing useful to say about an endpoint that fails for everyone.

### V6 — the check scaler deletes a performance remark but cannot edit the scaler

Reads like a permission modelling error: `SCALER_PERFORMANCE_REMARK_DELETE` is held while
`SCALER_UPDATE` is not, so the role can destroy a remark on a scaler record it cannot otherwise change.

**Not a defect — it is exactly what the matrix says.** §3.C's "Scaler Record – Performance Remarks" cell
is `CRD` and its "Scaler Record – Summary – Edit" cell is `-`.
`RolePermissions.checkScaler()`'s javadoc calls this out explicitly ("A role that deletes a remark but
cannot edit the scaler reads oddly and is exactly what the matrix says").

The related boundary is asserted at the GUI level and IS worth knowing: `SCALER_LICENCE_CANCEL` is
withheld even though the suspend/cancel control sits on the Performance Remarks tab this role writes to,
because §4 gives suspend/cancel to the district and regional managers. That is why "Save Record" appears
in `withheldWriteControls` while "Add Performance Remark" appears in `offeredWriteControls` — same tab,
opposite verdicts, and the pair is the clearest statement of where this role's authority stops.

### V8 — the risk-assessment expectations were inverted by `dbf826c`, not by a bug

**~35 tests across four suites went red at once, including CHK tests that had been green.** The app was
right and the suites were stale.

`dbf826c` (*Feat/scs roles (#269)*) introduced the rule **risk assessment follows the record it hangs
off**: §3 has one risk row ("Risk Rating Criteria", §D) and no scaler-subject row at all, so an assessment
is treated as another tab on the record and takes the level the role holds on that record's other tabs —
full read → query/read; any tab create/update/delete → create/update. Every internal column therefore
gained risk permissions:

| Column | Gained |
|---|---|
| `CLE` / `SUP` / `RM`, `DM` | 6 — `*_RISK_RATING_QUERY`, `*_RISK_ASSESSMENT_QUERY` / `_READ` |
| `CHK`, `CET`, `DSM` / `RSM` | those + `*_RISK_ASSESSMENT_CREATE` / `_UPDATE` |

Measured 2026-08-27: all four risk read endpoints answer **200** for every internal role and **403** for
the roleless sentinel, so the widening is deliberate and the pairings still discriminate.

**What changed in the suites:** the Risk Rating tab is asserted *readable* on both records; both risk
screens are expected in the Queries menu; the two assessment *search* routes are reachable. The
create/update half stays withheld for the read-only column and `DM`, so
`/scalers/{no}/risk-assessments/create` remains refused for them — the tab opens and the routes behind it
do not. That split is now the assertion.

**Why it is recorded rather than just fixed:** this is the second time the risk row has been re-read
(`RolePermissions.districtScalingManager()` records the first, which withheld `_UPDATE` from every column
and left two edit routes reachable by nobody). Anyone comparing §3 literally against these suites will
find the same apparent contradiction again. The rule lives in the `RolePermissions` **class** javadoc, not
in §3 — read it before "correcting" a risk expectation here.
