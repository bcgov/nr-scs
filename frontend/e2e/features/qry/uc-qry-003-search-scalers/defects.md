# Defects — UC-QRY-003 Search Scalers

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

## Divergences

Divergence #1 is **log-only** (no `@discovered-divergence` red): it looks like a **deliberate new-app UX
choice**, not a defect, so a red asserting the legacy behaviour would be wrong. It is recorded for BA/QA to
confirm the intent; the green test asserts the app's ACTUAL behaviour. Divergence #2 was logged the same way
but QA ruled it a bug, and it is **RESOLVED** (2026-10-01). Its entry is kept as history.

### Divergence #1 — a single-result scaler search no longer jumps straight to the scaler summary
- **What's wrong:** nothing may be wrong — it's a behaviour change. In the old system, searching by a
  specific licence that matched exactly one scaler took you **straight to that scaler's summary**. The new
  app instead shows a one-row results list, and you click the licence to open the scaler.
- **Expected vs actual:** *Expected* (legacy S02): exactly-one match auto-forwards to `/scalerSummary`.
  *Actual*: the single match is listed as one row (licence links to `/scalers/view/{licence}`).
- **How we caught it:** ground-truthed 2026-07-23 — `GET /api/scalers/search?scalerLicenceNo=914D` returns
  1 row; `pages/Queries/Scalers/index.tsx doSearch()` always sets results and renders the table (no
  count===1 auto-navigate). The `@S02` green test asserts the 1-row table.
- **Action:** BA/QA to raise a Jira ticket (confirm: is listing the single row intended, or should it
  auto-open the scaler like the legacy app?).
- **Register / classification:** Divergence · suspected-intentional-change.
- **Severity/Priority:** sev3 / p2
- **UC / Gherkin slice:** UC-QRY-003-S02 — UC-QRY-003-S02
- **Environment / build:** commit `083b308`, branch `dev/erik`; local seeded DB `real-data-seeded-scs-db` (:1525).
- **Data fixture:** `fixtures/qry/qry-scaler-test-data.ts` (`singleResultLicence = 914D`).
- **Status:** OPEN. **Found:** 2026-07-23. **Test:** covered by the actual-behaviour green scenario `search.feature` `@S02` (no red — log-only).

### Divergence #2 — RESOLVED — the check-scale number was not validated on the search form; it navigated to the view regardless
> **History.** Everything down to "Register / classification" describes the behaviour *before* the
> 2026-10-01 fix. Current behaviour is in **Status** below.
- **What's wrong:** possibly nothing — a behaviour change. Old system: typing an invalid or non-existent
  Check Scale # on the scaler search form kept you there and showed a field-level "No records were found."
  New app: it **navigates to the check-scale view anyway**, which then shows its own generic
  "Could not retrieve check scale data." error.
- **Expected vs actual:** *Expected* (legacy S05, ERR-001/002 `errors.no.recs`): field error "No records
  were found." on the search form, no navigation. *Actual*: navigates to `/check-scales/view/{id}`; the view
  surfaces "Could not retrieve check scale data." Additionally, a **non-numeric** id returns **HTTP 500**
  from `GET /api/check-scales/search?checkScaleId=NOTANUMBER` (should arguably be 400) — the UI still
  degrades gracefully to the same view error.
- **How we caught it:** ground-truthed 2026-07-23 (re-confirmed 2026-07-28) — the check-scale branch has
  **two distinct backend error paths**, both re-grounding to the same graceful view error:
  - *numeric, not found:* `search?checkScaleId=999999999` → **HTTP 200 + `[]`** → the view's `getCheckScale`
    treats the empty result as not-found → `isError` → "Could not retrieve check scale data."
  - *non-numeric:* `search?checkScaleId=ABC` → **HTTP 500** — Spring can't bind `ABC` to the `Long`
    `checkScaleId` param, so the request fails before the SP is reached → the view still catches the failure
    and shows the SAME "Could not retrieve check scale data."
  Both are asserted by green `@S05` scenarios in `check-scale.feature` (999999999 and ABC).
- **Action:** BA/QA to raise a Jira ticket (confirm: is jump-to-view intended, or should the search form
  pre-validate like the legacy app?).
- **🔧 Dev decision needed (backend robustness):** the non-numeric case returns **HTTP 500**, but a
  malformed client-supplied parameter is a client error — this should arguably be a **400 Bad Request**
  (`MethodArgumentTypeMismatchException` handled in `GlobalApiExceptionHandler`). No user impact today (the
  UI degrades gracefully), but a 500 pollutes error monitoring and misreports a client error as a server
  fault. Low priority; decide 400 vs leave-as-500.
- **Register / classification:** Divergence → re-classified as a **Bug** by QA (not an intentional change) · fixed. The backend 500 nit is tracked separately in the deferred-work log.
- **Severity/Priority:** sev3 / p2
- **UC / Gherkin slice:** UC-QRY-003-S05 — UC-QRY-003-S05
- **Environment / build:** commit `083b308`, branch `dev/erik`; local seeded DB `real-data-seeded-scs-db` (:1525).
- **Data fixture:** `fixtures/qry/qry-scaler-test-data.ts` (`notFoundCheckScaleId = 999999999`, `nonNumericCheckScaleId = ABC`).
- **Status:** RESOLVED. **Found:** 2026-07-23, **resolved** 2026-10-01 — QA raised it as a bug, so it was not an
  intentional change. The search form now looks the number up before navigating, like legacy
  `QueriesScalersSearchAction.search()`: a numeric miss shows the field error "No records were found."
  (`errors.no.recs`), and a non-numeric entry shows "Check Scale # must be a number." (`errors.long`, from
  `OAValidator.isLong`). The S05 Gherkin's "No records were found." for the non-numeric case is wrong, and
  legacy source wins. The backend 500-vs-400 nit above is still open but no longer reachable from this
  form, but it is still reachable through the API and through `/check-scales/view/ABC`. It is now tracked in
  `deferred-work.md`. Spec: the QRY scaler check-scale spec.
  **Test:** `check-scale.feature` `@S05` (999999999 + ABC) assert the field errors.

## Coverage gaps

- **Legacy "Back" button — no new-app equivalent (single-page layout)**
  - **What's wrong:** nothing. Legacy S01/S03 end by clicking Back to go from results (P006) to the search
    form (P005). The new app renders form + results on one `/scalers` page — no Back button.
  - **Register / classification:** Coverage gap · not-applicable (legacy-only mechanic).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `not-applicable` (permanent). **Found:** 2026-07-23.

- **S06 role-driven side-menu set (incl. descoped Handheld) — blocked / not-applicable**
  - **What's wrong:** nothing testable. S06 asserts the District Scaling Manager sees Administration /
    Queries / Reports / Create / **Handheld Management** menu items. The new app's navigation differs from
    the legacy WebADE menu, **Handheld is a descoped domain**, and the menu set is role-driven — unreachable
    under single-role mock auth. The screen's own controls (check-scale accordion, Create Scaler button,
    editable client field) ARE covered via the S01/S04 scenarios.
  - **Register / classification:** Coverage gap · not-applicable (legacy menu / descoped) + blocked (role).
  - **Severity/Priority:** — / p2 · **Status:** OPEN. **Found:** 2026-07-23.

- **S07 unauthorized access (ERR-003 `message.notAuthorized`) — blocked by mock auth**
  - **What's wrong:** nothing testable today. S07 needs an actor **without** the scaler-search permission to
    hit the not-authorized page. Mock auth grants only `SCS_SYS_ADMIN`, so the no-permission branch is
    unreachable from the browser.
  - **Register / classification:** Coverage gap · blocked (mock auth grants only SCS_SYS_ADMIN).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `blocked`. Revisit with multi-role auth. **Found:** 2026-07-23.

- **Sort ordering (primary/secondary) not asserted**
  - **What's wrong:** nothing. The form exposes primary/secondary Sort options (a new-app `SortOptions`
    control); the resulting row ordering is not asserted — only that searches return the right rows. UI
    nicety, not a legacy S01-S07 requirement.
  - **Register / classification:** Coverage gap · deferred (UI nicety).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `deferred`. **Found:** 2026-07-23.
