# Defects — the read-only internal column (`SCS_CLERICAL`, `SCS_BRANCH_SYS_SUPPORT`, `SCS_REGIONAL_MANAGER`)

Legends: `../../../defects-guide.md` (registers, tags) and `../../../coverage-guide.md`.

Registers, in the order they matter: **Divergences** (a behaviour difference — a genuinely red test),
**Coverage gaps** (a cell nothing asserts), **Spec gaps** (the spec contradicting itself or the code), and
**Verified — not a defect** (something that looked wrong and was confirmed correct, recorded so nobody
re-investigates it).

Authored 2026-08-26 against nr-scs `feat/SCS_CLERICAL-role`. Every status quoted was measured, not
inferred from the matrix.

---

## Divergences

None. Every cell of §3 that this suite asserts behaves as the matrix states — which is the expected
outcome for a column that is a strict read-only subset of one already proven (`CHK`), and is itself the
useful result: enabling three roles by pointing them at a shared permission list introduced no drift.

---

## Coverage gaps

### CG-1 — moved to the team's private security findings log

### CG-2 — the Work Bench renew verbs are absent rather than refused

§A is `R (ltd)` here against `CRU (ltd)` for `CHK`, so this column holds `WORKBENCH_QUERY` and neither
`_CREATE` nor `_UPDATE`. The queues are asserted readable, but no scenario proves a *renew* is refused.

**Why:** an allow-side write needs a body-free gated endpoint or a bindable body verified to reach
service-side validation, and neither is established for the Work Bench renew verbs — the `CHK` suite's own
CG-2 records the same gap from the other direction. Asserting an ungated endpoint would be worse than not
asserting it.

**Recommended next step:** inherit whatever probe the `CHK` suite's CG-2 eventually establishes; the
denial here is the mirror of that suite's allow, so one bindable body serves both.

### CG-3 — multi-role users are not covered

A user holding `SCS_CLERICAL` *and* a wider role receives the union of both columns
(`RolePermissions.forRoles`). Nothing here asserts that, as for every suite before it. Called out because
these three roles are the most likely to be held alongside another in practice.

### CG-4 — `SCS_DIST_MANAGER` and `SCS_CE_TECHNICIAN` have no suite yet

Both were enabled in source (`aaeeda1`, `3d496db`) before this suite was authored, but neither was in the
deployed WAR at the time — see **V2**. They are the remaining two of the five roles enabled in this
branch, and each needs its own folder rather than a row here:

- **`SCS_DIST_MANAGER`** is this column **plus one cell**: `SCALER_LICENCE_CANCEL`. Its suite is this one
  plus a delta — and the delta is directly asserted here in the negative
  (`withheldWriteControls` includes `Save Record` on the Performance Remarks tab), so the two suites will
  pin opposite sides of the same control.
- **`SCS_CE_TECHNICIAN`** is a different shape: check-scale and inspection writes, performance-remark
  writes, **no** Work Bench at all, and `MAINTAIN_QUESTIONS_QUERY`/`_READ` — the only §J cell granted to
  any non-administrator column.

---

## Spec gaps

### SG-1 — moved to the team's private security findings log

## Verified — not a defect

### V1 — the `CHK` suite's "welcome-only" contrast role is no longer welcome-only

`fixtures/security/check-scaler-test-data.ts` exports `WELCOME_ONLY_ROLE = 'SCS_CLERICAL'`, with the stated
rationale that the role "is still `welcomeOnly()`, so it holds no permission beyond the welcome page".
**That is no longer true** — `SCS_CLERICAL` now holds all 30 permissions this suite covers.

**Not a live failure, and the `CHK` suite is green.** Its two uses of that contrast are both endpoints
gated on `SCALE_SITE_INSPECTION_CREATE` / `_UPDATE`, which `SCS_CLERICAL` still does not hold, so the
contrast survives — but for a *different reason* than the one written down: the role holds no **writes**,
not nothing at all.

**Why it is recorded rather than fixed here:** the fragility is real. The moment a **read** endpoint is
added to that outline, the contrast breaks silently in the sense that matters — the test goes red while
the comment sends the reader looking for a bug elsewhere.

**Recommended fix:** retarget the `CHK` fixture's `WELCOME_ONLY_ROLE` to the **roleless sentinel**
(`apiAs([], [])` → `X-Mock-Roles: none`), not to another role. See **V6** — this suite tried a role first
and it was invalidated within hours. One-line change, no scenario edits; left to the `CHK` suite's owner
rather than changed from here.

### V2 — the deployed WAR lagged the source, and two roles read as `welcomeOnly()`

While authoring, `SCS_DIST_MANAGER` and `SCS_CE_TECHNICIAN` answered **403 on every endpoint except
`/welcome`** — the exact signature of a role mapped to `welcomeOnly()`, and initially convincing as a
finding that the roles had been enabled incorrectly.

They had not. The exploded WAR Tomcat serves
(`backend/target/scs-war-2.21.0-SNAPSHOT/WEB-INF/classes/`) was stamped 08:32 and its compiled
`RolePermissions.class` contained no `districtManager` or `ceTechnician` symbol, while
`backend/target/classes/` (09:44) contained both. The running app predated the two commits that enabled
them.

**How to tell the difference next time** — a role genuinely mapped to `welcomeOnly()` and a role missing
from a stale build look identical from the outside. Compare the compiled class, not the source:

```bash
grep -c districtManager backend/target/scs-war-*/WEB-INF/classes/ca/bc/gov/nrs/scs/backend/security/RolePermissions.class
```

A role the build has never heard of at all would instead be refused `/welcome` too, because
`forRole` returns `Set.of()` for an unrecognised name.

**Consequence:** those two roles are deferred to CG-4 rather than guessed at. No assertion in this suite
was written against the stale build — `CLE`, `SUP` and `RM` were all present in it and probed cleanly.

### V3 — a permission denial answers 403, not 500

The skill reference (`references/role-scoping-mechanics.md` §3) and the `CHK` suite's Divergence #1 both
record that a `@RequiresPermission` denial returned **500**, because `GlobalApiExceptionHandler` had no
handler for Spring Security's `AuthorizationDeniedException` and the catch-all claimed it.

**That is fixed.** `GlobalApiExceptionHandler:196` now carries
`@ExceptionHandler(AccessDeniedException.class)` (which `AuthorizationDeniedException` extends), and
denials answer 403 — measured across 11 endpoints × 3 roles on 2026-08-26.

Recorded because the reference doc still says otherwise and will mislead the next author. The suite
convention of asserting "refused" in matrix rows and pinning 403 in **one** scenario is kept regardless:
its purpose is to stop a future mapping regression from turning every deny row red, which is orthogonal
to whether the mapping is correct today.

### V4 — the three roles being byte-identical is the spec, not a copy-paste error

`RolePermissions.clerical()`, `.branchSystemSupport()` and `.regionalManager()` all `return
readOnlyInternalColumn()` — the same `Set`, no deltas. This reads like an unfinished implementation.

It is deliberate and argued in that method's javadoc: the three §3 columns were compared cell by cell
across all 79 rows and agree on 78, the only variation being a breadth qualifier. Each role keeps its own
method and javadoc because each has a different §4 summary and its own conflicts to resolve, and
`RolePermissionsTest` asserts the three sets equal *with the reason in the failure message*, so a real
requirement separating them fails loudly and says where to write down why.

This suite's `api-access.feature` equality scenario asserts the same thing over HTTP, so the claim is
pinned on both sides of the boundary rather than only in Java.

### V5 — `SCS_REGIONAL_MANAGER` is denied scaler create even though §4 says it creates licences

§4's summary for `RM` claims "Create scaler licences (full create for acting exams; pending branch
approval for licensed exams)", and `url-access.feature` asserts `/scalers/create` is **refused**.

The suite follows §3, which denies it twice in two rows separately about it, and
`RolePermissions.regionalManager()` records the decision (Jonah, 2026-08-25) with its reasoning: the §4
phrase maps to the Create → Scaler wizard, and `DSM`/`RSM` carry the identical §4 bullet *and* hold `CR`
on §C's "Scaler – Create" — so that is what the phrase means in this document's own terms. `RM` holds
neither cell.

Recorded because a reader comparing §4 against this suite will see a contradiction and reasonably suspect
the test. The decision is the spec's, not the suite's.

### V6 — no role can serve as the "holds nothing" baseline, because all eleven are now enabled

This suite was first written against `SCS_DIST_SCALING_MANAGER` as its holds-nothing contrast, on the
same reasoning that made the `CHK` suite pick `SCS_CLERICAL` (**V1**). It was enabled while the suite was
being authored — `7d7d6aa feat: SCS_DIST_SCALING_MANAGER`, then `1e16754 feat:
SCS_REGIONAL_SCALING_MANAGER` — and seven allow-pairing scenarios went red at once, each reporting a
`200` where a `403` was expected.

**All eleven `SCS_` roles now hold a permission column. There is no `welcomeOnly()` role left**, so the
baseline cannot be a role at all: `RolePermissions.PERMISSIONS_BY_ROLE` maps every one of them to a real
set, and any role picked today is a candidate for being widened tomorrow.

**The fix, and the general rule:** use the **roleless sentinel**. `apiAs([], [])` sends
`X-Mock-Roles: none`, which `MockRequestFilter` treats as "no authorities at all" — measured 403 on every
endpoint including `/welcome` (2026-08-26, 8 endpoints). An unrecognised role name (`SCS_NOT_A_REAL_ROLE`)
behaves identically, because `forRole` returns `Set.of()` for an unknown name, but the sentinel is the
documented mechanism and is kept in sync with the frontend's `MOCK_ROLES_NONE`.

It is structural rather than data: a sentinel cannot be granted a permission column, so it cannot be
enabled out from under a suite. **Any future role suite needing a holds-nothing contrast should use it
directly and never name a role for the purpose** — two suites have now made that mistake, one of them
twice in a day.

### V7 — the owner suite's two bridge scenarios collide under `fullyParallel` (pre-existing)

Running the full `features/security/` tree surfaced one failure in a suite this work did not touch:
`scale-site-owner-role/client-scoping.feature:86`, *"The API serves a scaler authorized at a site I own
only while that authorization exists"*.

**Not caused by this suite.** It passes in isolation, and the owner suite **alone** reproduces it roughly
one run in two (verified 2026-08-26: run 1 green at 168, run 2 red at 167 + 1). Adding 200 tests changed
worker scheduling and made an existing race land more often; it did not create it.

**Mechanism.** Two scenarios each assert *refused before the seed, admitted after* on the same subject:

| Scenario | Seeds | Site anchor |
|---|---|---|
| `client-scoping.feature:50` (URL) | `seedOwnerScalerBridge(bridgedScalerLicenceNo, bridgeSeedScaleSiteId)` | `313` |
| `client-scoping.feature:86` (API) | `seedOwnerScalerBridge(bridgedScalerLicenceNo, apiBridgeSeedScaleSiteId)` | `601` |

The **site** anchors were deliberately separated (`scale-site-owner-test-data.ts:174` — *"separate anchor,
same `fullyParallel` reason"*), but both seed onto the **same scaler**, `bridgedScalerLicenceNo = '001A'`.
The admission predicate is *scaler*-keyed — "this scaler holds an in-force authorization at a site this
client owns" — so either seed makes `001A` readable regardless of which site it names. Separating the
sites therefore isolates nothing, and whichever scenario runs its pre-seed assertion while the other's
seed is live sees a readable record and fails.

**Recommended fix:** give the API scenario its own scaler anchor, the way
`bridgedScalerLicenceNo` was already kept distinct from `otherScalerLicenceNo` for exactly this reason.
Separating the site anchors is not sufficient and the fixture comment claiming it is should be corrected.
Needs a DB-grounded second scaler that this owner's client does not employ — left to the owner suite
rather than guessed at from here.

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

### V9 — prose drifted from assertions when the fixture flipped, and the tests stayed green

A review of the `dbf826c` fix-up (**V8**) found four places where scenario titles and section comments
still said Risk Rating was **denied** while the fixture (`readsRiskRatingTab: true`) and the step asserted
it **visible**:

| File | What it said |
|---|---|
| `../ce-technician-role/gui-access.feature` | section comment "apart from Risk Rating — RSK has no row for this column", plus two titles "…and not Risk Rating" |
| `../dist-manager-role/gui-access.feature` | two titles "…and not Risk Rating" |
| `read-only-internal-roles/gui-access.feature` | section comment "apart from Risk Rating", directly above scenarios correctly titled "Risk Rating included" |

**Why it went unnoticed: the tests passed.** The assertions were corrected via the fixture and the
registry, so nothing went red — and nothing ever will, because Gherkin prose is not executable. The
check-scaler suite's prose *was* updated in the same pass; these were the copies.

**Why it matters here more than in most suites.** These files are read as a ledger of role reach — that is
the stated point of writing them at this length. A reviewer auditing what `DM` or `CET` can see would have
read the titles and concluded Risk Rating was withheld: the exact reverse of what ships and what is
tested. Stale prose in a green suite is worse than a red test, because nothing announces it.

**The structural cause:** an expectation was expressed twice — once in the fixture (executable) and once
in the title (not). A fixture flip updates one. The mitigation is to keep titles describing the *shape* of
the claim ("offers every tab this column reads") and let the fixture name the members, rather than
restating a specific member in the title. The corrected titles do that, except where a member is the whole
point of the scenario — as in `DM`'s licence-cancel control, which is named deliberately.

**Also corrected in the same pass** (both cosmetic, both from the V8 edits): three leftover blank lines in
`../check-scaler-role/url-access.feature` where a removed `Examples` block had been, and duplicate
`Scenario Outline` titles in the `CET` and scaling-manager `api-access.feature` files — two outlines each
named "…is allowed for this column and refused for a caller with no roles" with different Examples
tables. `playwright-bdd` disambiguates by example data so both ran correctly, but HTML reports could not
tell them apart. Now "…is an allowed READ" and "…is an allowed WRITE init".
