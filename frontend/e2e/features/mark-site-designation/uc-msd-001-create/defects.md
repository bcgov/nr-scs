# Defect log — UC-MSD-001 Create Mark Site Designation

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment for all entries below: branch `iman/e2e-tests-for-MSD-domain`, frontend
`http://localhost:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`), seeded Docker DB
`THE/…@localhost:1525/DBDOCK_01` with `msd/msd-create-mark.sql` applied (mark `ES20R4` creatable —
re-grounded 2026-07-21). Bugs below were originally found 2026-07-20 under the prior `AF904` seed / prior
container; the marks and record ids in that evidence are from that container. The findings are
data-independent and remain OPEN — re-repro on the current seed uses `ES20R4`.

---

## Divergence

### Divergence #1 — the timber-mark "Update" lookup hides its not-found error until a submit is attempted
- **What's wrong (plain):** On the MSD create screen, typing an unknown timber mark and clicking **Update**
  shows the user **nothing** — the mark-holder fields stay blank and no error appears. The app *did* call
  the backend, *did* get a "not found" answer, and *did* compute the message — it just never displays it.
- **Expected vs actual:** Expected — clicking Update on an unknown mark shows "No mark holder found for
  timber mark {mark}". Actual — no message is shown; the error only appears later if the user fills the
  rest of the form and clicks **Save Record**.
- **How we caught it:** the `@discovered-divergence` scenario "The timber-mark lookup reports an unknown
  mark" (`mark-not-found.feature`) asserts the error is visible after Update; it fails (message not
  found). The sibling scenario proves the same backend message *does* show after Save, so the text is
  correct and only the Update-time surface is missing.
- **Evidence / root cause:** `pages/Create/MarkSiteDesignation/index.tsx` — `lookupTimberMarkHolder`
  sets `formError` on the 404, but the error banner renders only under `submitAttempted && (...)`
  (~L901), and the lookup never sets `submitAttempted`. Backend ground-truth: `GET
  /api/mark-site-designations?timberMark=ZZZQ999` → HTTP 404 `No mark holder found for timber mark ZZZQ999`.
- **Classification:** suspected-defect (a computed error hidden behind an unrelated gate looks like an
  oversight, not a deliberate design). Kept as a genuinely-failing `@discovered-divergence` test —
  never forced green; goes green (delete the tag) when the app surfaces the message.
- **Severity/priority:** `@p1`. **Data fixture:** `absentTimberMark` (`fixtures/msd/msd-test-data.ts`).
- **Test:** `features/mark-site-designation/uc-msd-001-create/mark-not-found.feature` — "The timber-mark lookup reports an unknown mark" (now a normal passing test; the `@discovered-divergence` tag was removed).
- **Fix (2026-08-04):** `pages/Create/MarkSiteDesignation/index.tsx` — the error-banner gate was changed
  from `submitAttempted && (formError || fieldErrors>0)` to `formError || (submitAttempted && fieldErrors>0)`,
  so a real backend `formError` (the lookup 404, a create error) surfaces immediately while field-level
  validation stays submit-gated. Verified green 2026-08-04 (the scenario now passes).
- **App dependency — SATISFIED:** the fix ships in **app PR bcgov-c/nr-scs#247 ("Test/msd")**, merged to
  `main` as `369a3a6`. This scenario asserts post-fix behaviour, so it only passes against a stack built
  from `main` at ≥ `369a3a6` — **rebuild the test stack** after pulling. (Before #247 landed this was a
  merge-order blocker: de-tagged here + un-fixed in the app = a red suite.)
- **Status:** FIXED (code change). No Jira needed — resolved in-repo.

### Divergence #2 — duplicate Timber Mark + Scale Site surfaces a RAW DB exception, not the friendly ERR-014 — log-only
- **What's wrong (plain):** Creating a second MSD for a Timber Mark + Scale Site pair that already has one
  IS rejected — but by a **raw database error** shown to the user, not the friendly validation message the
  legacy spec (S07 / ERR-014) specifies.
- **Expected vs actual:** Expected — "A valid Mark Site Designation already exists for this Timber Mark
  and Scale Site." Actual — the error banner shows **"Database Exception: A record already exists with the
  same unique key."** The `MarkSiteDesignationService` create path does NO duplicate pre-check; the
  `hauling_mark_site` table's UNIQUE key (timber mark + scale site) catches it, and the raw ORA exception
  is surfaced to the client (related to review item H-3, "sanitize Oracle error messages").
- **How caught:** observed live 2026-07-20 — two S02 creates on the same (AF904, 520) collided with that
  exact banner (which is also why S02 uses a per-worker site).
- **Why log-only (no test):** authoring it means deliberately creating a duplicate on a dedicated
  (mark, site) pair with careful isolation from S02's parallel pool; deferred. The behavior (raw error
  vs friendly message) may also change once H-3 is addressed.
- **Correction note:** an earlier draft of this entry wrongly said the duplicate is "not enforced" — it
  IS enforced at the DB; the divergence is the message/UX, not the absence of the rule.
- **Severity/priority:** `@p1`. **Status:** OPEN. **ACTION: BA/QA to raise a Jira ticket** (decide: friendly pre-check vs raw error acceptable).

### Divergence #3 — max-authorization-period (legacy ERR-009) is not enforced — log-only
- **What's wrong (plain):** Legacy S05/ERR-009 caps an MSD authorization at N years ("A MSD Authorization
  can only be in effect for up to {N} year(s)."). The new backend enforces only expiry ≥ effective; no
  maximum-period check exists.
- **Expected vs actual:** Expected — a too-long effective→expiry window is rejected. Actual — accepted
  (subject only to date order).
- **Why log-only (no test):** the client blocks nothing here and reaching the server needs a creatable
  mark (data-blocked, Coverage gap #1). Possibly an intentional rule drop.
- **Severity/priority:** `@p2`. **Status:** OPEN. **ACTION: BA/QA to raise a Jira ticket** (decide: defect vs intended).

### Divergence #4 — the "Exceptions" multi-select on create + edit was a latent no-op (never persisted) — RESOLVED
- **What's wrong (plain, historical):** The MSD **create** and **edit** screens render an "Exceptions" control (a
  multi-select populated from the `EXEMPT_MARK_METHOD_CODE` LOV). A user can pick exceptions, but the
  selection **has no effect** — it is never sent to the server and nothing is saved. There is no error and
  no feedback; the picks silently vanish on Save.
- **Expected vs actual:** Expected — either the selected exceptions persist, or the control isn't shown.
  Actual — the control is fully interactive but its value is dropped on Save.
- **Evidence / root cause (code-read, both screens):**
  - Create: `pages/Create/MarkSiteDesignation/index.tsx` holds `selectedExceptions` state (`:750`) and
    renders `ExceptionsSection` (`:981`), but the create payload (`:279-286`) builds only
    `scaleSites` / `speciesContent` / `conditions` — **no** exceptions field.
  - Edit: same — `selectedExceptions` (`:346`) rendered (`:777-781`), update payload (`:502-515`) has no
    exceptions field.
  - The `MarkSiteDesignationCreateRequest` / `MarkSiteDesignationUpdateRequest` DTOs
    (`services/markSiteDesignation.service.ts`) have **no** exceptions/exemptions property, and the read
    DTO `MarkSiteDesignationDetail` has none either (UC-MSD-003 coverage.md Coverage gap #1 already notes
    the *view* has no Exemptions section). So there is no create/read/update representation of exceptions
    anywhere in the new MSD stack — the control is orphaned.
- **Classification:** suspected-defect (a fully-rendered, LOV-backed control that silently discards its
  value reads as an incomplete/oversight feature, not a deliberate design). **Log-only** (no
  `@discovered-divergence` red): a red asserting "exceptions persist" would assert a feature that may be
  intentionally unbuilt (legacy Exemptions were descoped from the view). The control's *presence* is the
  smell; whether it should persist or be removed is a product call.
- **Resolution (2026-09-02):** the product call was made — **wire it through**. The Exceptions control is
  now persisted end-to-end: the `MarkSiteDesignationCreateRequest` / `MarkSiteDesignationUpdateRequest`
  DTOs and the read DTO `MarkSiteDesignationDetail` carry an `exceptions` field, the create/update payloads
  send it, and the view page renders an Exemptions section (resolving the paired UC-MSD-003 gap). The edit
  page also hydrates saved codes with a `{ code, description: code }` fallback so a code missing from the
  date-filtered `EXEMPT_MARK_METHOD_CODE` LOV round-trips instead of being silently dropped on Save.
- **Severity/priority:** `@p2`. **Status:** RESOLVED (code change, no Jira needed). No `@discovered-`
  scenario locked the old no-op behaviour, so nothing goes red; this entry is retained as history.

### Divergence #5 — duplicate scale site / condition silently swallowed on create too — **FIXED 2026-09-08**

- Recorded in full as **[UC-MSD-002 defects.md Divergence #5](../uc-msd-002-update/defects.md)** — kept
  there as the single source of truth because QA filed it against the edit screen. Logged here because the
  **create** screen carried the identical defect and was fixed in the same change: `addScaleSiteById`
  rejected nothing on a duplicate, returning `prev` from the state updater and then clearing the input, so
  a duplicate looked like a successful add. The conditions half lives in the shared
  `AuthorizationConditionsSection`, so it was never create- or edit-specific at all.
- **This continues the gate distinction Divergence #1 established here.** That fix drew the line at
  "backend `formError` surfaces immediately, field-level validation stays submit-gated". An error raised by
  an **Add** button is field-level but its submit *is* the Add click, so gating it behind `submitAttempted`
  hid it until a Save that then overwrote it. The scale-site field is therefore ungated on both screens;
  `validateSave`'s record-level messages remain submit-gated, unchanged.
- **Tests (create side):** `conditions.feature` `@p1 @ERR-015` (mandatory condition 185 — QA's repro, and
  it proves the per-host `duplicateConditionMessage` override), `positive-flows.feature` `@p2 @ERR-015`
  (previously asserted only "exactly once", which was true either way), plus component tests in
  `Create/MarkSiteDesignation/index.browser.test.tsx` and
  `components/Form/AuthorizationConditionsSection/index.browser.test.tsx`.
- **Status:** FIXED (code change). No Jira needed beyond QA's originating ticket.

### Divergence #6 — free-text character limits were not enforced on create either — **FIXED 2026-09-18**

- Recorded in full as **[UC-MSD-002 defects.md Divergence #4](../uc-msd-002-update/defects.md)** — kept
  there as the single source of truth because that UC's technical catalog is where ERR-019..ERR-022 are
  written down, and QA's ticket names both screens. Logged here because the **create** screen carried the
  identical gap and was fixed in the same change: Geographic Location (40), Timber Description (40),
  Transportation Date Desc (200) and Other Requirements (4000) had no length rule at all, so an
  over-length value produced only the generic "Please fix the errors below." banner, naming no field.
- **Create-specific detail:** the gate is **"Add Conditions"**, not Save — all four fields sit in the
  first section, so the rule joins the Est. Volume / Est. Truck Loads integer checks that already ran
  there (now sharing one `validateMarkSiteOptionalFields`). Both screens read their limits from
  `utils/markSiteDesignationLengths.ts` so they cannot drift.
- **Tests:** `validation.feature` `@S04 @ERR-019..@ERR-022` plus an at-limit boundary scenario, and
  component tests in `Create/MarkSiteDesignation/index.browser.test.tsx`.
- **Status:** FIXED (code change). No Jira needed beyond QA's originating ticket.

---

## Bug / Regression

### Bug #1 — concurrent MSD creates return a spurious HTTP 409 (mark-INDEPENDENT — a multi-user concurrency defect)
- **What's wrong (plain):** When two Mark Site Designation creates run at the same time, one can fail with
  HTTP 409 "Database Exception: A record already exists with the same unique key," even though the two
  are **independent records for different timber marks**. A single create always succeeds. So two users
  creating unrelated MSDs concurrently can hit a spurious failure.
- **Confirmed by the cross-mark test (2026-07-20):** 2-way concurrency, 25 rounds each, no two creates of
  the same mark ever overlapping:
  - **Cross-mark** (`AF904` ‖ `AF794`, different marks): **5 / 25 rounds** produced a 409.
  - **Same-mark** control (`AF904` ‖ `AF904`): **1 / 25**.
  Because cross-mark (different marks) collides *at least as often* as same-mark, the collision is **not**
  keyed on the timber mark — it is a shared-resource race hit by ANY two concurrent creates. Earlier
  same-mark-only repro: 6 concurrent → 4× 201, 2× 409. (This is a supported scenario — different users
  creating different MSDs concurrently is normal multi-user usage — so it is a genuine defect.)
- **Exact constraint + mechanism (from the backend log 2026-07-20):**
  ```
  ORA-00001: unique constraint (THE.HMSC_PK) violated on HAULING_MARK_SITE_CONDITION
    (HAULING_MARK_AUTHORIZATION_ID, SCALE_CONDITION_CLASS_CODE, SCALE_AUTH_CONDITION_ID)
    row (HAULING_MARK_AUTHORIZATION_ID:3382, 'MSD', 185) already exists
    at MarkSiteDesignationRepository.addMarkSiteConditions(MarkSiteDesignationRepository.java:301)
  ```
  The colliding row is scoped to **one specific `hauling_mark_authorization_id`** (e.g. 3382) — so it is
  NOT a shared cross-create row (an earlier draft guessed that — wrong). It is a **duplicate of a single
  create's OWN condition** (MSD/185) inserted twice. A single create inserts each condition once and
  succeeds, so the duplication only appears under concurrent load → the cause is **thread-unsafe shared
  state in the create/condition-attach path** (`addMarkSiteConditions`, repo line 301, and/or the
  `ParameterBinder`/callable-statement it uses): a concurrent request either re-inserts its own condition
  or binds another in-flight request's authorization id.
- **Why this is more serious than a 409:** the unique key is the *lucky* catch. If two concurrent creates
  bled ids that did NOT already collide, one request's condition could be silently written under another
  MSD's id (data misattribution) with no error. The dev should treat this as a thread-safety defect, not
  just "return a friendlier 409".
- **Impact on the suite:** the functional happy-path tests (`create.feature`) are `@mode:serial` so they
  don't race each other — the suite should not depend on the app being concurrency-safe here. This makes
  the tests deterministic WITHOUT masking the defect (it is logged here with a standalone repro). Not
  kept as a `@discovered-bug` test — a concurrency race is not a stable red.
- **Severity/priority:** `@p1` (a real multi-user data-entry failure; intermittent under load).
- **Environment:** branch `iman/e2e-tests-for-MSD-domain`, backend `:8080` + seeded DB. The cross-mark
  repro needs a 2nd creatable mark alongside `ES20R4` (seed a second `blanket_road_mark` the same one-row
  way; the 2026-07-20 diagnostic used `AF794`/`AF904` under the prior seed) — one-off diagnostic residue,
  cleared on the next container recreate.
- **Status:** OPEN. **ACTION: BA/QA to raise a Jira ticket** — dev to identify the shared constraint and
  make the create concurrency-safe (or retry/serialize server-side).

---

## Coverage gap

### Coverage gap #1 — create happy paths S01/S02 were data-blocked → RESOLVED via seed (CLOSED)
- **What it was:** a *successful* MSD create needs a timber mark satisfying **both** the mark-holder
  view (`SCS_MARK_SITE_TIMBER_VW`) **and** `HAULING_AUTHORITY` membership (insert FK `HMKA_HAA_FK`) — and
  S02 additionally needs a *searchable* scale site (the search view `SCS_SCALE_SITE_SEARCH_VW` is empty
  in the extract). No raw-extract data satisfied these, so create was unreachable (`ORA-02291`).
- **Resolution (re-grounded 2026-07-21):** the fear of an ~8-table cascade was wrong.
  `scs-real-test-data-patches/msd/msd-create-mark.sql` bridges everything with **one** link-row
  insert — mark `ES20R4` is a real `blanket_road_mark` already in `HAULING_AUTHORITY` (Gate A already
  true) with file `A18674` already in `PROV_FOREST_USE`; the only missing piece is the
  `forest_file_client` link, so the seed inserts ONE `forest_file_client` row (file A18674, type 'A',
  **reusing existing client `00000001`**) — a `BEFORE INSERT` trigger (`FTA_SYNC_FFC_FCL`) auto-creates
  the `for_client_link`, arm 4 of the holder view resolves, and Gate B is satisfied. Plus `ORG_UNIT` 1904
  (region → site 520 searchable). Validated live → HTTP 201. (The original resolution used mark `AF904`
  bridged by a `FOREST_CLIENT`/`CLIENT_AUDIT_CODE` seed; that chain is gone from this extract.)
- **Now covered:** `create.feature` `@S01 @p0` (District Wide=Y) and `@S02 @p0` (District Wide=N + site
  520), each with a full API read-back and DB cleanup (children-then-parent; no DELETE endpoint).
- **Status:** CLOSED. Re-verify the seed after any DB re-extract. NOTE: unlike the retired AF904 seed
  (one-way), this seed is **reversible** via `msd-create-mark.teardown.sql` (plain FK-guarded tables).

### Coverage gap #2 — role / permission behaviour (S09 Not Authorized, ERR-021) blocked by mock auth
- **What's not tested (plain):** S09 (a user without permission is refused, ERR-021). Mock auth grants
  **only** `SCS_SYS_ADMIN` to every request (`MockRequestFilter`), so the not-authorized branch can't be
  reached from the browser.
- **Status:** OPEN — `blocked` by mock auth. Revisit if the harness gains multi-role auth.

### Coverage gap #3 — conditions-section guards (shared component) — partially covered (2026-07-22)
- **ERR-016 "Condition # must be a number."** → the shared `AuthorizationConditionsSection` DOES have a
  numeric add-by-id (`#condition-id` + `onAddConditionById`); its client-side guard is **now covered** by
  `advanced-validation.feature` `@S10 @ERR-016` (re-grounded wording: app says "Condition # must be a
  **valid** number."). Covered once here for the whole shared component.
- **ERR-015 "Condition # is required."** and **ERR-018 "Template is required."** → both `not-applicable`:
  the Add button is disabled while `#condition-id` is blank, and the Apply button is disabled without a
  template selection, so neither error is UI-reachable.
- **Residual (`deferred`) — RESOLVED 2026-08-04 (CLOSED):** the *positive* flow (apply a template, add a
  valid condition by number, add via the search modal, remove a non-mandatory condition, mandatory auto-load
  + mandatory-remove-blocked, and ERR-014 not-found) is now covered ONCE for the whole shared component by
  `conditions.feature` (5 scenarios, green). Covered on the MSD create host per the "cover once" convention
  (the identical `AuthorizationConditionsSection` is embedded in MSD edit + Scaler/Scale-Site auth). The
  only remaining residual is exercising it through a *saved* record (persistence), which the client-side
  section flow doesn't need. **Status:** CLOSED (positive flow); mandatory-strip-on-persist is verified
  correct (see UC-MSD-002 "Verified — not a defect").

### Coverage gap #4 — input-required/format guards — RESOLVED (CLOSED, 2026-07-22)
- **Scale-site ERR-012 "Site # is required."** (blank Site # + Add) → **covered** by
  `advanced-validation.feature` `@S06 @ERR-012` (the symmetric partner of the covered ERR-013 not-found
  guard; displays on create because "Add Conditions" has set `submitAttempted` — unlike the edit screen,
  where the same message is suppressed, UC-MSD-002 Divergence #2).
- **Species "Content is required." / "Content must be an integer."** → **covered** by
  `advanced-validation.feature` `@S02` (select `AL` from the `SCALE_SPECIES_CODE` LOV, then blank /
  non-integer content).
- **Species "Species has already been added." / "Select a valid species."** → `not-applicable`,
  defensive-only: the Species `<Select>` filters out already-added codes and offers only valid ones, so
  neither guard is UI-reachable. **Status:** CLOSED.

---

## Spec gap (gherkin-incomplete-vs-source)

_The `.feature` scenarios matched the `-slices.md` control/message matrix for S03/S04/S05/S06/S08.
(ERR-014/ERR-009 are app divergences, logged above, not `.feature` omissions.)_

**One gap in the UC itself (not the `.feature` files), found 2026-09-18:** this UC's ERR catalog omits the
four free-text **character limits**, although the legacy `HaulingMarkAuthorizationValidator.checkFieldLengths()`
ran on the create path exactly as it did on update. They are catalogued only on
[UC-MSD-002 technical.md:138-141](../../../../planning-artifacts/requirements/use-cases/UC-MSD-002/UC-MSD-002-technical.md)
as ERR-019..ERR-022 — note those four codes mean something else in *this* UC's catalog (Est. Volume /
Est. Truck Loads integer, Not authorized), so cite them as "UC-MSD-002 ERR-019..022" here. Covered by
`validation.feature` under those tags; see Divergence #6 above.

---

## Verified — not a defect

### V1 — the mark-not-found message wording differs from legacy, and that is correct
- Legacy ERR-002 "A Timber Mark could not be found for {0}." The new app returns "No mark holder found
  for timber mark {mark}" (HTTP 404) on both the lookup and the create. This is the re-grounded truth,
  asserted directly — not a defect, recorded so it isn't re-investigated.
