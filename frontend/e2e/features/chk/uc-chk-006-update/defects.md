# Defects — UC-CHK-006 Update Summary Check Scale

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

**Bug / Regression:**

- **#1 — A species row can no longer be deleted: the delete always fails.** — **ROOT-CAUSED + FIX
  WRITTEN 2026-09-01; awaiting redeploy for end-to-end verification.**
  - **What's wrong:** on the Summary Check Scale update screen, deleting a Species/Product/Grade row
    fails. The user gets an "Action failed" banner and the row stays. No workaround on the screen — a row
    added by mistake cannot be removed; only the whole record can be deleted and re-entered.
  - **Regression, not a re-grounding:** green when the UC was authored (2026-07-22), red since.
  - **Correction to the first write-up.** It said "500 for every input". That is wrong, and the wrong
    detail sent the first investigation at the service logic. It fails only when the composite key
    contains a **blanked (single-space) product or grade** — which is every SFP row, so the feature is
    unusable for that return type, but a non-blank grade works fine:

    | `scaleGradeCode` | result |
    |---|---|
    | `" "` (what SFP rows store) | 500 |
    | `"X"` | 404 — binding fine, the handler runs |

  - **Root cause.** `DELETE /api/summary-check-scales/{id}/spg-rows` carried the composite key as
    **query parameters**. PR **#265 "Bugfix/query filters bugfixes" (2026-08-25)** added
    `RequestParamTrimmingAdvice`, a global `@ControllerAdvice` registering `StringTrimmerEditor(true)`,
    which trims every String query parameter **and converts a whitespace-only value to null**. So
    `scaleGradeCode=%20` arrived as `null` on a `required=true` parameter, Spring raised
    `MissingServletRequestParameterException` ("present but converted to null") *before the handler
    ran*, and — because `GlobalApiExceptionHandler` does not extend `ResponseEntityExceptionHandler`
    and has no mapping for it — it fell through to the catch-all as a 500.
  - **Why the collision:** the SPG key stores **a single space** for a non-applicable product/grade (the
    columns are NOT NULL with an xref FK); the OpenAPI description said so outright — *"a single space
    for blanked rows"*. The advice's own javadoc states the assumption that breaks here: *"a caller's
    surrounding whitespace is never meaningful in SCS."* For this key it is not surrounding whitespace,
    it **is** the value. A fix for whitespace in search filters broke the one endpoint where whitespace
    is data.
  - **Why no test caught it:** the controller test drove the endpoint with `.param(...)` under
    standalone MockMvc, which registers no `@ControllerAdvice` — so the trimming that broke production
    never ran in the unit test. Production and unit behaviour diverged precisely at the advice.
  - **Fix applied (option 1 of four considered):** the composite key moved from query parameters into
    the **request body** (`SummaryCheckScaleSpgRowKey`), which Jackson deserializes without the data
    binder, so the space survives. Changed: the OpenAPI path + new schema, the regenerated
    `SummaryCheckScaleApi`, `SummaryCheckScaleController.deleteSummaryCheckScaleSpgRow`, and the
    frontend `summaryCheckScales.service.ts` (`params` -> `data`). Backend tests updated to the body
    form and extended with a blanked-grade arm — **43 green** (11 controller + 32 service).
    Trimming was rejected as a fix (`StringTrimmerEditor(false)`) because `" "` would then bind as `""`
    and fail the composite-key match — trimming at all breaks this endpoint's semantics.
  - **Status: CLOSED (2026-09-03).** Verified end-to-end against the redeployed app — S03 green 3/3
    (`--repeat-each=3`). The `@discovered-bug` tag has been dropped and the scenario now stands as the
    regression guard for the body-key fix.
  - **Priority / env:** p1 · branch `test/check-scale-e2e-full-coverage` · local seeded DB · nr-scs
    `f758354`.
  - **Test:** `summary-check-scale-update-spg.feature` (S03).

- **#2 — A missing required request parameter returns 500 instead of 400 (whole API).**
  - **What's wrong:** `GlobalApiExceptionHandler` is a plain `@ControllerAdvice`, not a
    `ResponseEntityExceptionHandler` subclass, and carries no mapping for
    `MissingServletRequestParameterException`. Any request omitting a required query parameter answers
    *"An unexpected error occurred. Please try again later."* with a 500, instead of a 400 naming the
    parameter.
  - **How we caught it:** while diagnosing Bug #1 — omitting `scaleGradeCode` returned 500. Had the
    mapping existed, Bug #1 would have surfaced immediately as *"Required request parameter
    'scaleGradeCode'…"* instead of a generic 500 that needed a server-side stack trace to crack.
  - **Scope:** the team has hand-mapped several Spring MVC exceptions individually
    (`HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`,
    `HandlerMethodValidationException`), so this is a gap in that list rather than a blanket failure —
    but the same gap exists for every unlisted Spring MVC exception.
  - **Action:** **BA/QA to raise a Jira ticket** — small, independent of Bug #1.
  - **Status:** OPEN. Found 2026-09-01.
  - **Test:** none yet (no scenario asserts it; it is a cross-cutting API-shape concern, not a CHK-006
    behaviour).

**Divergences:** one shared with create — the timber-mark existence check reads a narrower source than
legacy, so a valid hauling-authority-only mark can be refused on update too (same `validateReferences` path).
Logged once, with evidence and fix, as UC-CHK-005 Divergence #1. Otherwise none. (Full lifecycle — header save, add a species row, delete the record, reset —
matches the re-grounded Gherkin. Verified by API read-back on commit `886ad2f5`; the species-row **delete**
has since regressed, see Bug #1.)

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Can't test blank drop-lists on save (S06).**
  - **Why not:** *(skipped for those fields)* the required drop-lists (Check Scale Type, Followed Good Practices, etc.) have their empty option *disabled*, so a blank value can't be picked through the UI — the browser can't select a disabled option. The validator *does* enforce them; the required *text/date* fields ARE covered.
  - **Future action:** cover the blank-drop-list branch as a component (Vitest) test.
  - **Status:** OPEN. Found 2026-07-07.
  - **Test (covers the reachable fields):** `e2e/features/chk/uc-chk-006-update/summary-check-scale-update-validation.feature` (S06 outline).

- **#2 — The old free-text date-format rule has no new-app equivalent (S07).**
  - **Why not:** legacy checked a typed date matched `yyyyMMdd`; the new app uses a date-picker, so a bad-format string can't be entered. The re-grounded rule the new app *does* enforce — "scale date can't be in the future" — IS covered. Deliberate re-grounding, **not a defect**.
  - **Status:** OPEN.
  - **Test (covers the re-grounded rule):** `e2e/features/chk/uc-chk-006-update/summary-check-scale-update-validation.feature` (S07 future-date).

- **#3 — Can't test the permission-hidden buttons (S09).**
  - **Why not:** the old app hid the row-Delete, record-Delete and Create-Letter buttons from users lacking permission.
  - **Re-scoped and re-homed (2026-09-02).** Two things had changed. The old reason ("the test login is
    always a full admin") stopped being true when PR #240 added the mock role switcher. But the real
    blocker is that **the app gates no controls on this screen** — the CHK pages call no
    `hasPermission` — so there is no hidden state to assert, which makes this `not-applicable` rather
    than blocked. `sec` does not cover it either: its control sweep is *tab*-scoped
    (`{record, tab, control}`), so it never reaches the check-scale detail screens. The permanent
    `@skip` placeholder was therefore **removed** — a skip implies "we could test this but the
    environment won't let us", which misdescribed the situation and made role coverage look absent when
    it is comprehensive one directory over.
  - **The open product question is recorded ONCE**, for the whole domain, in
    `uc-chk-004-delete/defects.md` Coverage gap #3: should a screen hide or disable a control the role
    cannot use? If the answer is yes, the work belongs in `sec` — extend its control sweep from record
    tabs to the detail screens — not back into this UC.
  - **Status:** OPEN (awaiting that product answer), but no longer carrying a skipped scenario.
  - **Future action:** revisit when per-element permissions are built.
  - **Test:** none — scenario removed; see the coverage row's `not-applicable` verdict.

- **#4 — Can't test the "wrong role is denied" case (S10).**
  - **Why not (historical):** the same single-admin-role limit as the other CHK UCs.
  - **Re-homed, not lost (2026-09-02).** This is a role × level property, and it is asserted per role in
    the `sec` suites — `sec/*/url-access.feature` for the route and `sec/*/api-access.feature` for the
    endpoint, across all eleven role columns. Restating it inside each UC would repeat one app-wide fact
    ~140 times, so the placeholder scenario was **removed** and the coverage row now reads
    `covered elsewhere`. Nothing became untested.
  - **Status:** CLOSED (covered in `sec`). Closed 2026-09-02.
  - **Future action:** component (Vitest) test for the guard; revisit once finer-grained roles exist.
  - **Status:** OPEN.
  - **Test:** `sec/*/url-access.feature` + `api-access.feature` (all eleven role columns).

**Spec gaps (the Gherkin is missing scenarios its own docs list):**

- **#1 — the `.feature` listed only 3 required fields; the source docs list ~14.**
  - **What's missing:** `UC-CHK-006-S06.feature` wrote required-blank scenarios for only Check Scale Type, Followed Good Practices and Scale Site #, but the source docs (`UC-CHK-006-slices.md:308-314`, `-technical.md:119-132`) enumerate the full required set (both scaler licences, timber mark, both dates, both returns, etc.).
  - **The app is correct:** `validateHeader` enforces every one; we covered all the UI-reachable ones (the drop-lists are Coverage gap #1). Paperwork mismatch, not a bug.
  - **Future action:** a BA regenerates `UC-CHK-006-S06.feature`.
  - **Status:** OPEN. Found 2026-07-07.
  - **Test (covers the reachable additions):** `e2e/features/chk/uc-chk-006-update/summary-check-scale-update-validation.feature` (S06 outline).

**Verified — not a defect:**

- **Required-field messages drop the trailing "?".** e.g. "Followed Good Practices is required." (legacy had the "?"). Deliberate label rewording carried into the assertions. (Verified 2026-07-07.)
