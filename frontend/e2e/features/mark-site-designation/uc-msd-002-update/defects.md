# Defects & Findings — UC-MSD-002 Update Mark Site Designation

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment for all entries below unless noted: commit `17a5250f`, frontend `:3000` + backend `:8080`
(mock auth `SCS_SYS_ADMIN`) + seeded Docker DB `THE/default@localhost:1525/DBDOCK_01` with
`msd/msd-create-mark.sql` applied (mark `ES20R4` creatable — re-grounded 2026-07-21). Data fixtures
pinned in `fixtures/msd/msd-test-data.ts`. Bugs below were originally ground-truthed 2026-07-20 under the
prior `AF904` seed / prior container; the record ids cited in that evidence are from that container. The
findings are data-independent and remain OPEN — re-repro on the current seed uses `ES20R4`.

---

## Bug / Regression

### Bug #1 — A letterless MSD intermittently opens in restricted "Letter issued" edit mode under load

- **What's wrong (plain):** When you open a Mark Site Designation for editing, the screen sometimes wrongly
  behaves as if a letter has been issued for it — it shows the yellow "Letter issued. Only the Expiry Date
  may be changed." banner and disables every field except Expiry Date — even though that MSD has **no
  letter at all**. Reloading the same record can keep showing it locked for a while, then later loads are
  correct. It happens intermittently, only when the app is under concurrent load.
- **Expected vs actual:** A MSD with no issued letter must open fully editable (all fields enabled).
  Actual: it intermittently opens locked to Expiry-only, so a legitimate edit is impossible until it
  clears.
- **How we caught it:** The UC-MSD-002 functional edit scenarios seed a brand-new MSD (via the create API)
  and open it for editing. Under `--repeat-each` parallel load, ~1 in 8 opens rendered the locked
  "Letter issued" state for records we had **just created with zero letter rows**. Captured screenshots
  (2026-07-20, prior container / prior `AF904` seed): records 3522 / 3542 / 3563 / 3565 (all fresh
  creates under the then-current seed — the seed is now `ES20R4`) shown locked with the banner; the DB
  confirmed `SELECT COUNT(*) FROM hauling_mark_auth_letter WHERE hauling_mark_authorization_id=<id>` = 0
  for each, and an isolated `GET /api/mark-site-designations/<id>` returned `letterExists:false`.
- **Supporting detail:** `letterExists` is computed by `MarkSiteDesignationRepository.getMarkSiteDesignationLetterExists`
  → `HAULING_MARK_AUTH_LTR_PKG` search cursor (`rs != null && rs.next()`). The false-positive does **not**
  reproduce with isolated sequential or same-record-concurrent `curl` (40× each → all `false`); it only
  appears through the browser's connection-reuse pattern and is **sticky per pooled connection** (rapid
  client-side re-mounts on the same keep-alive connection stayed locked 5×). This points to a
  thread-safety / cursor-lifecycle defect in the letter-exists package/JDBC path — the same
  concurrency-unsafety family as **UC-MSD-001 Bug #1** (spurious 409 on concurrent create). It is
  user-facing: a scaler viewing MSDs under load could be blocked from editing a letterless designation.
- **Test-suite handling (not a mask):** the functional edit scenarios recover from a spurious lock by
  re-logging-in through a fresh `/welcome` load (new connections → different pool connection) and
  re-opening, up to 8 attempts (`pages/msd/MarkSiteDesignationEditPage.openForEditingUnlocked`). This
  hardens the *functional* assertions around this filed bug (mirrors the login reload-once); it does not
  hide it — this entry + the evidence above are the tracking signal, and S04 still asserts that a **real**
  letter record correctly locks.
- **Load-dependence (measured):** at NORMAL concurrency (one full run), the recovery absorbs it — the
  functional scenarios are green; the only red is the intended ERR-011 divergence. Under the artificial
  `--repeat-each=5` peak stress the bug is amplified and the recovery is occasionally exhausted (5 of 74
  executions), **all** of them this exact spurious lock (never a data/assertion race). The amplifier is
  **S04's real-letter reads**: repeating the same peak stress with S04 excluded produced **0 lock
  exhaustions across 69 executions** — i.e. the test *design* is sound, and the residual stress failures
  are this backend defect (concentrated letter reads saturating the pool's contaminated cursor state),
  not test flakiness.
- **Severity/priority:** `@p1` (functional blocker under load; intermittent). **Status:** OPEN.
  **ACTION: BA/QA to raise a Jira ticket** — dev to make the letter-exists read concurrency-safe (close
  the ref cursor / avoid shared package state); likely fixes UC-MSD-001 Bug #1 too.

---

## Divergence

### Divergence #1 — Updating to District Wide = No with no scale sites is NOT blocked (ERR-011 dropped on edit)

- **What's wrong (plain):** The CREATE screen refuses to save a designation set to District Wide = No
  unless at least one scale site is added ("At least one Scale Site is required when District Wide is
  No."). The EDIT screen enforces no such rule — you can change an existing designation to District Wide
  = No, add no sites, and it saves successfully.
- **Expected vs actual:** Editing to District Wide = No with zero sites should be blocked with the same
  error the create screen shows. Actual: the save succeeds with no sites.
- **How we caught it:** Ground-truthed at the API — `PUT /api/mark-site-designations/{id}` with
  `{"districtWideInd":"N","scaleSites":[]}` → **HTTP 200**, and the record reads back `districtWideInd=N`
  with zero sites. The edit screen's `validateSave` (`Edit/MarkSiteDesignation/index.tsx`) has no
  scale-site rule, and `MarkSiteDesignationService.validateUpdateCommand` only checks required fields +
  date order.
- **Supporting detail:** Create enforces it at `Create/MarkSiteDesignation/index.tsx:137`; edit + backend
  do not. A create/update symmetry break.
- **Test:** `features/mark-site-designation/uc-msd-002-update/scale-site-required-divergence.feature` (`@S02 @ERR-011`) — now
  a normal passing test asserting the corrected (blocked) behaviour (the `@discovered-divergence` tag was
  removed).
- **Fix (2026-08-04):** ported the rule to the edit screen's `validateSave`
  (`pages/Edit/MarkSiteDesignation/index.tsx`) — it now takes `scaleSiteCount` and, when
  `districtWideInd==='N' && scaleSiteCount===0`, sets the same error the create screen shows
  ("At least one Scale Site is required when District Wide is No."), blocking the save (no PUT). Verified
  green 2026-08-04.
- **App dependency — SATISFIED:** the fix ships in **app PR bcgov-c/nr-scs#247 ("Test/msd")**, merged to
  `main` as `369a3a6`. This scenario asserts post-fix behaviour, so it only passes against a stack built
  from `main` at ≥ `369a3a6` — **rebuild the test stack** after pulling. (Before #247 landed this was a
  merge-order blocker: de-tagged here + un-fixed in the app = a red suite.)
- **Backend hardening (2026-08-07) — CLOSED (pending merge):** the residual crafted-request path is closed
  server-side on app branch `test/MSD` (`c81d4d4`) — **not yet on `main`**, and it lands *after* #247. No
  e2e scenario depends on it (the client rule blocks the save first, so no PUT is ever sent), so this
  suite stays green either way — unlike the #247 dependency above.
  `MarkSiteDesignationService.requireScaleSiteWhenNotDistrictWide` is called from **both**
  `validateUpdateCommand` and `validateCreateCommand`, so `{districtWideInd:"N", scaleSites:[]}` is
  rejected with HTTP 400 "At least one scale site is required when district wide is N." Locked by
  `MarkSiteDesignationServiceTest.updateMarkSiteDesignation_rejectsDistrictWideNoWithNoScaleSites`,
  `…_allowsDistrictWideYesWithNoScaleSites`, and `createMarkSiteDesignation_rejectsDistrictWideNoWithNoScaleSites`
  (the earlier `…_isNotRejectedServerSide` characterization lock was flipped, per its own note). Full
  backend suite green (1308/0). **Legacy parity check:** legacy enforced this **server-side on update** —
  `MarkSiteBo.validateUpdateMarkSite:367` → `scaleSiteRequired()` (`:212-220`, `scaleSites.size()==0 &&
  districtWideInd=="N"`) → `errors.auth_site_dist_wide` = "At least one Scale Site is required when
  District Wide is set to No." Legacy `validateCreateMarkSite` omitted the check, but only because its
  create step cleared scale sites (`MarkSiteAction.addConditions:117-118`; `MarkSiteDelegate.createMarkSite`
  — "the Authorization part is the only part added") so sites could only arrive on the follow-up update.
  The new API creates sites in the same POST, so guarding create too matches the legacy *rule* rather than
  its two-phase plumbing. **Status:** FIXED (client + server).

### Divergence #2 — Scale-site "not found" / "required" errors never surface on the edit screen (ERR-016/017)

- **What's wrong (plain):** On the edit screen, when you type a non-existent (or blank) Site # and click
  Add, the site is correctly not added — but no error message is ever shown telling you why. The message
  is computed but suppressed.
- **Expected vs actual:** An inline "Site N was not found." / "Site # is required." should appear (as the
  legacy ERR-017/016 specify). Actual: no message; the user gets silent rejection.
- **How we caught it:** The add-scale-site handler sets `fieldErrors.scaleSites`, but the field's
  `invalid` prop is gated behind `submitAttempted` (`showError`), so it's hidden until a save is
  attempted — and then `validateSave` overwrites `fieldErrors` (it has no scaleSites key), clearing it. So
  the message is unreachable via the normal add flow. Same hidden-until-submit pattern as UC-MSD-001's
  create-side lookup divergence.
- **Test:** covered indirectly — `features/mark-site-designation/uc-msd-002-update/validation.feature` `@S09` asserts the
  observable truth (the bad site is not added + no PUT). The message suppression itself is logged here
  (not separately red — plausibly intentional Carbon submit-gated display).
- **Severity/priority:** `@p2`. **Status: CLOSED 2026-09-08.** QA raised the ticket this entry asked for
  ("Mark Site Designation Edit — Missing Inline Validations") and it decided the open question in favour of
  **showing the add-time inline error**. The field's `invalid` prop no longer routes through `showError`
  (the `submitAttempted` gate); it reads `fieldErrors.scaleSites` directly, so an error raised by the Add
  button displays immediately instead of waiting for a save that then wiped it. `validateSave` still owns
  the record-level `scaleSites` message (≥1 site when District Wide=N), which is unchanged.
  **Tests:** `validation.feature` `@S09 @ERR-017` now asserts the message *and* the rejection (it could
  previously assert only the rejection); the same ungated display carries the new `@S09 @ERR-015`
  duplicate scenario. Component-level: `Edit/MarkSiteDesignation/index.browser.test.tsx` asserts
  `data-invalid`/`data-invalidtext` at add time with no save attempted. The create screen was gated the
  same way and was ungated with it.

### Divergence #3 — No "sites will be deleted" warning when switching District Wide to Yes (STA-006)

- **What's wrong (plain):** The legacy screen warns "Existing Sites will be deleted when the record is
  saved." when you change District Wide from No to Yes. The new edit screen silently clears the scale
  sites with no confirmation.
- **Expected vs actual:** A warning/confirmation before discarding sites. Actual: sites are cleared
  immediately and silently; on save the designation persists district-wide with no sites.
- **How we caught it:** `Edit/MarkSiteDesignation/index.tsx` `district-wide` `onChange` calls
  `setScaleSites([])` when value is `Y`, with no alert. The clearing behaviour itself is covered green by
  `update.feature` `@S10`; only the missing warning is the divergence.
- **Severity/priority:** `@p2`. **Status:** OPEN. **ACTION: BA/QA to raise a Jira ticket** (decide:
  add a confirm, or accept silent clear as intended UX).

### Divergence #4 — Legacy field-length validations not ported (ERR-019–022) — **FIXED 2026-09-18**; max-auth-period (ERR-009) still OPEN

- **What was wrong (plain):** The legacy screen enforced maximum lengths on Geographic Location (40),
  Timber Description (40), Transportation Date Desc (200) and Other Requirements (4000), highlighting the
  offending field and stating the limit. The new screens enforced none of them, so an over-length value
  went to the API and the user saw only the generic **"Please fix the errors below."** banner — no field
  named, no limit stated. QA filed exactly this (QA DEV — "missing field-specific validation errors for
  character limits").
- **Expected vs actual (was):** Expected — *"Geographic Location can not be greater than 40 characters."*
  on the field itself. Actual — the generic banner alone; nothing said which of the four fields was at
  fault or by how much.
- **Fix (2026-09-18) — both screens plus the server:**
  - `utils/markSiteDesignationLengths.ts` (new) holds the four label/limit pairs and builds the legacy
    `errors.maxlength` message, so create and edit cannot drift apart. Lengths are measured on the
    **trimmed** value, which is what the payload sends.
  - Create (`pages/Create/MarkSiteDesignation/index.tsx`): the rule runs in the new shared
    `validateMarkSiteOptionalFields`, so it fires at **"Add Conditions"** as well as Save — all four
    fields live in the first section, alongside the Est. Volume / Est. Truck Loads integer checks that
    already ran there. Each textarea now takes `invalid` / `invalidText`.
  - Edit (`pages/Edit/MarkSiteDesignation/index.tsx`): the rule joins `validateSave` **below** the
    `letterExists` early return — a letter disables every free-text field, so the value on that path is
    discarded and must not be rejected.
  - Backend (`MarkSiteDesignationService` + `SCSUtils.requireMaxLength`): the same four limits (plus
    Population's 4) guard create and update, so a crafted request gets the same field-named 400 instead of
    a raw `ORA-12899`. The letter-issued update path keeps only the expiry date, so it is deliberately not
    length-checked.
- **Deliberately NOT a `maxLength` on the textareas:** a hard cap silently truncates a paste, which leaves
  the user just as uninformed. Same call as the maintenance screens (Authorization Clauses' 200-char
  clause, Appointment Types' 120-char description).
- **Tests:** `validation.feature` `@S02 @ERR-019..@ERR-022` here and `@S04 @ERR-019..@ERR-022` on
  [UC-MSD-001](../uc-msd-001-create/validation.feature) (each with a no-write assertion), plus component
  tests in both screens' `index.browser.test.tsx` (over-limit blocks, at-limit passes through to the
  payload), `utils/markSiteDesignationLengths.unit.test.ts`, and
  `MarkSiteDesignationServiceTest` (per-field messages, at-limit accepted, letter path exempt).
- **Still OPEN — the max-authorization-period half (ERR-009).** Nothing in this change addresses it; it
  remains the same gap already filed for create, see
  [UC-MSD-001 defects.md Divergence #3](../uc-msd-001-create/defects.md). **ACTION: BA/QA to raise a Jira
  ticket for ERR-009 only** (decide: port the period rule, or confirm descoped).
- **Severity/priority:** `@p2`. **Status:** length half FIXED (code change, no Jira needed); ERR-009 OPEN.

### Divergence #5 — Duplicate condition and duplicate scale site were silently swallowed (ERR-015) — **FIXED 2026-09-08**

- **What was wrong (plain):** Adding a condition that was already in the list, or a scale site already on
  the record, did nothing and said nothing. Worse than nothing: both paths went on to clear the input and
  clear the field error, so the screen looked *exactly* as it does after a successful add. The user had no
  way to tell "already there" from "added". QA's repro: condition 185, scale site 1006.
- **Expected vs actual.** Legacy rejects both with an inline message —
  `errors.dup_condition` = "Condition already exists for Mark Site Designation." and
  `scaleSiteAuthorization.duplicateScaleSite` = "The Scale Site {0} has already been added."
  Actual: silence, plus a cleared input implying success.
- **Why (technical).** Both were written as de-duplication *inside* a `set…((prev) => …)` updater —
  `if (prev.some(...)) return prev;` — which cannot raise an error even in principle, because a state
  updater must stay pure. Execution then fell through to `setScaleSiteInput('')` /
  `setConditionIdInput('')` and `clearFieldError`, which is what produced the false success. The duplicate
  test now runs against the current list *before* the updater, so the rejection can carry a message.
- **Note on the classification this replaces.** Coverage gap #1 recorded ERR-015 as `not-applicable`
  because the duplicate was "silently de-duplicated (no error by design)". The observation was right and
  the inference was wrong — nothing in legacy supported "by design". See the corrected bullet there.
- **Blast radius.** The conditions section is the shared `AuthorizationConditionsSection`, embedded in six
  production screens (MSD create/edit, Scaler Auth create/edit, Scale Site Auth create/edit). Its duplicate
  wording is now a `duplicateConditionMessage` prop: it **defaults** to the
  `scaleSiteAuthorization.duplicateCondition` wording ("The condition {0} has already been added.") that
  the authorization screens use, and the two MSD hosts override it with MSD's own `errors.dup_condition`
  string. A single hardcoded message would have been wrong on one screen or the other. The scale-site fix
  was applied to **both** MSD create and edit — QA reported only edit, but create carried the identical
  silent no-op.
- **Status: CLOSED.** **Tests:** conditions — `AuthorizationConditionsSection/index.browser.test.tsx`
  (default wording, host override, row not duplicated, input not cleared) + e2e UC-MSD-001
  `conditions.feature` `@p1 @ERR-015` re-adding auto-loaded mandatory condition 185 (QA's repro, and it
  proves the MSD override is wired). Scale site — e2e UC-MSD-002 `validation.feature` `@S09 @ERR-015` plus
  UC-MSD-001 `positive-flows.feature` `@p2 @ERR-015` (which previously asserted only "exactly once", true
  either way), and component tests on both MSD screens. All four new component tests were verified to fail
  against the pre-fix source.
- **Related:** surfacing these messages at all depended on lifting the submit gate — Divergence #2, closed
  by the same ticket.

---

## Coverage gaps

### Coverage gap #1 — Add Condition by number (S07 · ERR-012/013/014/015) — CORRECTED + partially covered

- **Correction (2026-07-22):** an earlier draft wrongly said the new app "has no numeric add-by-id, so
  ERR-012/013/014/015 have no new-app equivalent." That is **false** — the shared
  `AuthorizationConditionsSection` DOES have a numeric add-by-id (`#condition-id` + `onAddConditionById`)
  alongside the search modal and template picker. The guards re-ground as:
  - **ERR-013 numeric ("Condition # must be a valid number.")** → reachable, **now covered** once via
    UC-MSD-001 `advanced-validation.feature` `@S10 @ERR-016` (same shared component — covered once, not
    re-litigated per host screen).
  - **ERR-012 required** → the Add button is disabled while `#condition-id` is blank → UI-unreachable →
    `not-applicable`.
  - **ERR-015 duplicate** → **this reading was WRONG, corrected 2026-09-08.** It recorded the silent
    de-duplication as "no error by design" and classified the guard `not-applicable`. There was no such
    design: legacy rejects the add with an inline message (`errors.dup_condition`), and QA reported the
    missing error. Now **covered** — see Divergence #5 and UC-MSD-001 `conditions.feature` `@p1 @ERR-015`.
    The lesson worth keeping: *observed* silence is evidence about the new app, never evidence that legacy
    was silent too — that has to be read from the legacy source before classifying anything
    `not-applicable`.
  - **ERR-014 not-found ("Condition N was not found.")** → reachable (valid-format absent id → backend
    search empty). **RESOLVED 2026-08-04 (CLOSED):** covered once for the shared component by UC-MSD-001
    `conditions.feature` `@p1 @ERR-014` (id 999999 → "Condition 999999 was not found."). **Status:** CLOSED.

### Coverage gap #2 — Authorization-denied edit (S08 · ERR-025) — `blocked` by mock auth

- The "Edit Record" gating + `notAuthorized` path requires a user **without** `markSiteUpdate`. Mock auth
  grants only `SCS_SYS_ADMIN` (editor), so the denied branch is unreachable from the browser.
  **Status:** OPEN — `blocked`. Revisit if the harness gains multi-role auth.

### Coverage gap #3 — Conditions + template section on edit (ERR-018) — partially covered

- The numeric add-by-id guard is now covered once via the shared component (see Coverage gap #1). The
  **ERR-018 "Template is required." guard is `not-applicable`** — the Apply button is disabled without a
  template selection, so it is UI-unreachable. The **positive** flow (apply a template / add-by-id / add via
  the search modal / remove a non-mandatory condition / mandatory auto-load + remove-blocked) is
  **RESOLVED 2026-08-04 (CLOSED)** — covered once for the shared component by UC-MSD-001 `conditions.feature`
  (5 scenarios, green), per the "cover once" convention. **Status:** CLOSED.

### Coverage gap #4 — Species content on edit — RESOLVED (CLOSED)

- The edit screen's Species Content guards (Species required / Content required / Content must be an
  integer) mirror create's and — unlike the edit scale-site message (Divergence #2) — **surface** (they
  are not submit-gated). **Now covered** by `validation.feature` `@S02` ("The edit screen enforces species
  content guards"), which seeds a fresh record, walks all three guards (no PUT), and cleans up. The
  duplicate / invalid-species guards are UI-unreachable (the Species `<Select>` filters out added codes
  and offers only valid ones) → `not-applicable`, defensive-only. **Status:** CLOSED (2026-07-22).

### Coverage gap #5 — restricted-edit SAVE (expiry-only persists when a letter is issued) — `deferred`

- S04 (`restricted-edit.feature`) asserts a letter-issued MSD opens with every field except Expiry Date
  disabled, but never that an **expiry-only edit actually persists** in that mode. Authoring the positive
  save is **data-blocked**: the only real letter record in the extract (`letterMarkSiteDesignationId`) is
  shared read-only, and **saving it would mutate a real record with no cleanup** (no DELETE endpoint;
  parallel-unsafe). There is no way to *seed* a letter without the Tier-4 letter-generation flow. Revisit
  once letter generation is authored (Tier 4) — a seeded MSD + generated letter would give a disposable
  locked record to save. **Status:** OPEN — `deferred`.

---

## Verified — not a defect

### Edit-save strips `ministryStandardInd='Y'` (mandatory) conditions from the payload — correct, not a defect
- **Investigated 2026-08-04** (flagged by the MSD coverage audit as "worth a BA sanity-check"). The edit
  screen's update payload filters out mandatory conditions before PUT
  (`Edit/MarkSiteDesignation/index.tsx:510` — `.filter(c => ministryStandardInd !== 'Y')`). This is
  **correct**, not a data-loss bug: the backend **computes** mandatory conditions on read
  (`MarkSiteDesignationRepository.getMarkSiteDesignationConditions:207` always injects
  `getMandatoryMarkSiteConditions()` + linked), and the update delete-then-replace only removes
  **non-mandatory** linked associations (`deleteMarkSiteDesignationAssociations:565` — "non-mandatory
  conditions"). So mandatory conditions are never stored as removable links; sending them back would try to
  persist auto-injected conditions as linked ones. Stripping them is required to mirror the backend design.
  Recorded so it is not re-investigated — the view still renders the mandatory condition after an edit
  because it is re-injected on read.

### Restricted edit mode when a letter exists (S04 · STA-002) — correctly implemented

- A MSD **with** an issued letter correctly opens in restricted mode (info banner + only Expiry Date
  editable; all other fields disabled), and the backend `updateMarkSiteDesignation` writes expiry only in
  that path. Asserted green by `restricted-edit.feature` `@S04` against real letter record (pinned
  `letterMarkSiteDesignationId`). Kept here so the "letterExists=true ⇒ locked" behaviour is not
  re-investigated — it is correct; only the letterless **false-positive** (Bug #1) is wrong.
