# UC-MNT-004 Maintain Valid Licence Attributes — Defect Log

> How this log works (registers, statuses, tags): [defects-guide.md](../../../../defects-guide.md).

## Divergence
_None found._ Create forwards to the read-only view (aligned behavior); required, date-order and
duplicate rules are enforced; the delete-blocked path is a clean client-side warning with the Delete
button hidden (this screen handles it better than ExamUpgrades — contrast UC-MNT-002 Divergence #1).

## Bug / Regression

### Bug #1 — "Both" rows showed a blank Grading System and could not be opened — FIXED 2026-09-10
- **What's wrong:** "Both" is a selectable Grading System Code on the Create form, but a saved row came
  back with an **empty** Grading System cell in the list. That cell is also the row's only link, so
  those records could not be opened to view, edit or delete them.
- **Expected vs actual:** expected `Both`; actual an empty, unclickable cell. (Same for the `NA` code.)
- **How we caught it:** reported by QA against dlvr (Administration → Maintenance → Maintain Valid
  Licence Attributes → create with Grading System Code = Both → observe the new row). Independently
  recorded here on 2026-07-22 as the reason S02/S03 could not be automated (Coverage gap #1).
- **Why (technical):** the list built its code→name map from the **grading-code/appointment-type** LOV
  (`/grading-code-appointment-type-lov`), which only contains codes that have valid appointment-type
  combos — `C` and `I`. `B` and `NA` are absent, so the lookup missed and the cell fell back to `''`.
  The filter drop-down and the Create form meanwhile used the `SCALE_GRADING_SYSTEM_CODE` **static LOV**,
  which does contain `B = Both` — hence a code you could select but never see. Legacy read this cell
  from the static LOV too (`validLicenceAttributeLeft.jsp`, `writeDescription="true"`).
- **Fix:** `pages/Administration/Maintenance/ValidLicenceAttributes/index.tsx` now names the column from
  the static LOV (the same source as the filter and the Create form) and falls back to the raw code, so
  the link always has a label. Regression test: `index.browser.test.tsx` → "names and opens a row whose
  grading system has no appointment-type combos (\"Both\")".
- **Status:** FIXED — no `@discovered-bug` test needed.

### Bug #2 — newly added attributes missing from the Scaler Appointment dropdowns (QA DEV)
- **What:** After adding an attribute here (QA repro: Grading code system = **Both**, Appointment
  type = **F**), the new value did not appear in **Queries → Scalers → Appointments tab → Add
  Appointment**. Expected "Forest Services - Both" in the dropdown; the list stayed pre-add.
- **Why:** The dropdown reads `GET /api/grading-code-appointment-type-lov`, which is a view
  (`SCS_SGCD_SAPT_LOV_VW_PKG`) over the very table this screen maintains — but three caches sit in
  front of it and **none** was invalidated by a write here:
  1. backend Caffeine `lov-grading-code-appointment-type` (+ `…-map`), 24h TTL — the dominant cause,
     and the only one that also affects *other* users' sessions;
  2. React Query `['lov', 'grading-code-appointment-type-lov']` — the app sets
     `refetchOnMount: false` globally, so once fetched the Appointments tab never refetches it for
     the rest of the SPA session;
  3. the `useLovOptions` Map + `sessionStorage` copy behind the Scaler create/edit appointment
     picker — no TTL, and it survives a full page reload.
  Same root cause as the template stale-dropdown bug already fixed in `ScaleAuthTemplateService`.
- **Not fixed by this — see Bug #3:** the "Appointment Type Description" on the details screen the
  create forwards to still reads blank for a brand-new combination. The evict and the purge both act
  on *shared* caches; that field is rendered from page-local state neither of them touches.
- **Fix:** `@CacheEvict` on all three `ValidLicenceAttributeService` mutations (backend), and
  `purgeLovCache` after each successful create/update/delete on this screen (frontend).
- **ACTION:** Dev — fixed. **Status:** CLOSED.
- **Test:** `ValidLicenceAttributeCacheEvictionTest` (backend, 4), `utils/lovCache.unit.test.ts`
  (frontend, 5), and two cases in `ValidLicenceAttributes/index.unit.test.tsx` (purge on successful
  create; no purge when the create is rejected). **Not** automated end-to-end: an e2e would have to
  create a real attribute, and Coverage gap #1 records why this screen has no free, list-addressable
  combination to mutate safely in a parallel run.

### Bug #3 — "Appointment Type Description" is blank on the details screen shown straight after a create
- **What's wrong (plain):** Add a grading-system/appointment-type combination that did not exist before.
  The app saves it and forwards to the read-only **details** view of the record you just created — and
  that screen's **Appointment Type Description** field is empty. Close the modal and re-open the same
  row from the list and the description is there; the list's own Appointment Type Description column is
  correct too. So it is one field, on the one screen you land on immediately after creating.
- **Expected vs actual:** expected the appointment type's description (e.g. `Forest Services`);
  actual an empty field.
- **Severity:** cosmetic, and self-correcting — no data is wrong and nothing needs a page reload to come
  good. Logged because the blank field reads as "this record saved badly".
- **How we caught it:** raised in review of the licence-attribute PR, independently flagged by the
  automated review pass, and re-confirmed against `main` after Bug #1's fix landed. Reproduced at unit
  level on 2026-09-16 with a throwaway probe (not committed) driving the real page: create `C`/`Z` →
  details field `""`, list column `Brand New`, and `Brand New` again after closing and re-opening the
  row.
- **Why (technical):** two deliberate behaviours meet.
  1. The **create response carries a null description on purpose.** `ValidLicenceAttributeService`
     enriches inside the transaction and its `@CacheEvict` fires *after* the method returns, so the POST
     is enriched from the pre-evict LOV map — which has no entry for a combination that did not exist a
     moment ago. Evicting first would let a cold cache be repopulated from an uncommitted read, so the
     ordering is correct; the service javadoc already notes the response's description is null and
     assumes nothing renders it.
  2. **But something does render it.** `useMaintenanceCrud.onSave` puts that create response straight
     into `selected` and switches the modal to `view`. `ValidLicenceAttributesModal.description()` finds
     `scalerAppointmentTypeDescription` null and falls back to the page's `gradingCodeLov` — `useState`
     filled once by a `useEffect` keyed on `[userToken]`. `purgeLovCache` drops the *shared* copies
     (React Query + the `useLovOptions` Map/`sessionStorage`); nothing re-runs that effect, so the
     page-local array stays pre-create for the whole visit.
  The **list column escapes** this because `onSave` ends with `reload()` — a fresh search issued after
  the evict, which comes back enriched. Re-opening the row escapes it for the same reason: that path
  does a fresh `GET`.
- **Fix (suggested, for the dev who picks it up):** either re-fetch `gradingCodeLov` inside
  `onLovChanged` (purge the shared caches *and* refill the page's own state), or have the create flow
  read the record back with `getDetail` instead of rendering the POST response.
- **ACTION:** BA/QA → Jira. **Status:** OPEN.
- **Test:** none yet — no test at any level covers this field after a create. Not automatable end-to-end
  for the reason in Coverage gap #1 (no free, list-addressable combination to mutate safely in a parallel
  run); a page-level unit test in `ValidLicenceAttributes/index.unit.test.tsx` could pin it
  (render → create → assert `#view-vla-description`) and is the cheaper option.

## Coverage gap

### Coverage gap #1 — S02 edit + S03 delete-without-dependents not automated (data constraint)
- **What:** Edit-dates (S02) and delete-a-childless-record (S03) are not automated.
- **Why:** The screen has **no free, list-openable, childless record** to exercise them safely:
  - All 8 valid grading×appointment combos (C/I × A/C/F/O) already exist AND every existing combo has
    dependents — so there is no childless real record to edit/delete, and editing/deleting a real one
    would mutate shared, dependent data (not parallel-safe).
  - A self-seeded free combo uses grading system **B**/**NA**. Its list row used to render an **empty**
    link — that part is now fixed (Bug #1), so a B row is addressable as "Both"; but the appointment-type
    value is still shared across rows, so a seeded record is only reliably re-openable while it is the
    lone B row.
- **Status:** OPEN — the blank-link blocker is gone, so S02/S03 are worth re-attempting against a
  self-seeded B/A record (create → open "Both" → edit dates → delete), provided the scenario cleans up
  after itself. Create (S01) still exercises the create→view→persist path.

### Coverage gap #2 — S04 filter / S10 cancel-edit
- `@p2` niceties (S10 additionally needs the deferred edit-open). Status: OPEN.

### Coverage gap #3 — S11 not authorized (role)
- Blocked by single-role mock auth. Status: OPEN.

## Spec gap (gherkin-incomplete-vs-source)

### Spec gap #1 — S06 invalid date format not reachable in the new UI
- **What:** Legacy S06 (invalid date format on submit) isn't reproducible — the dates use a Carbon date
  picker (no free-text) and `validate` has no format branch.
- **Status:** OPEN — informational.

## Verified — not a defect
- **Duplicate-create rejection** — `POST` of an existing (grading, appointment) combo returns HTTP 400
  `"A valid licence attribute with grading system 'C' and appointment type 'A' already exists."` and the
  existing row is unchanged (verified live 2026-07-22). Correct behavior; asserted by validation.feature `@S08`.
- **Delete-blocked (client-side)** — opening a dependent-having attribute shows the "Cannot delete"
  warning and hides the Delete button (no server call). Correct; asserted by delete.feature `@S09`.
