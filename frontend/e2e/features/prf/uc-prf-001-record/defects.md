# Defects — UC-PRF-001 Record Scaler Performance Remark

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).
> BA/QA own triage and Jira; this file is the queue that feeds it. Ids/values cite
> `fixtures/prf/performance-remark-test-data.ts` — treat a DB re-extract as a sweep of this file for stale
> values.

## Divergences

_None found._ Every validation rule and the create/persist path behave correctly in the new app; the only
differences from the legacy Gherkin are the message-text re-grounding and the structurally-impossible
"both selected" case, both recorded under Verified — not a defect below.

## Bug / Regression

_None found._

## Coverage gaps

- **Permission-driven gating (hidden Add/Edit/Delete, notAuthorized) is not testable yet**
  - **What's wrong:** Legacy S05 hid the "Add Performance Remark", "Edit" and "Delete" controls for users
    without the matching WebADE permission (STA-001..004) and returned notAuthorized (ERR-010) on direct-URL
    access. This can't be exercised in the current environment.
  - **Expected vs actual:** N/A (not an app defect) — the new app has no per-element permission mechanism
    (grep of `pages/View/Scaler` finds no `PermissionGate` on these tabs), and LOCAL mock auth authorizes
    every request as the single role `SCS_SYS_ADMIN`, so a permission-denied user cannot be produced.
  - **How we caught it:** Reconciling S05 against the app — no frontend gate exists; the mock request filter
    grants only `SCS_SYS_ADMIN`.
  - **Register / classification:** Coverage gap · blocked
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-PRF-001-S05
  - **Status:** OPEN · **Found:** 2026-08-17 — revisit when the coming RBAC rework introduces real roles.
  - **Test:** none (state not reproducible under single-role mock auth).

- **Session-tombstone-null "LicenceNo not found" (ERR-009) has no equivalent in the stateless new app**
  - **What's wrong:** Legacy S11 covered submitting the create when the session scaler tombstone was null →
    `SCSException("LicenceNo not found")`.
  - **Expected vs actual:** N/A (not an app defect) — the new app is stateless: the scaler licence is a URL
    path param (`/scalers/{scalerLicenceNo}/performance-remarks`), so there is no session tombstone to lose.
  - **Register / classification:** Coverage gap · not-applicable (re-ground)
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-PRF-001-S11
  - **Status:** OPEN · **Found:** 2026-08-17
  - **Test:** none (legacy session-state mechanic has no new-app equivalent).

- **Description > 4000 chars (ERR-007) is a hard input cap, not asserted**
  - **What's wrong:** Legacy ERR-007 fired on submit when Description exceeded 4000 chars. The new app caps it
    at input time (`TextArea maxLength=4000`), so the error is not browser-reachable. The cap itself is not
    asserted by a scenario (low value; the slice catalog also declined a distinct length slice —
    `UC-PRF-001-slices.md:39`).
  - **Expected vs actual:** N/A (not an app defect) — the constraint is enforced, just at input time.
  - **Register / classification:** Coverage gap · deferred
  - **Severity/Priority:** sev4 / p3
  - **UC / Gherkin slice:** UC-PRF-001-S07 (ERR-007)
  - **Status:** OPEN · **Found:** 2026-08-17 — add a maxLength-cap assertion if desired.
  - **Test:** none (deferred).

- **Date/suspension invalid-FORMAT (ERR-008) constrained by the date picker, not asserted**
  - **What's wrong:** Legacy ERR-008 fired on a malformed date string. The new app uses a Carbon DatePicker
    that constrains entry to a valid `YYYY-MM-DD`, so a malformed value is not enterable through the UI. The
    format-validation branch (`validatePerformanceRemarkForm` rules 2/7/8) is therefore not UI-reachable and
    is not asserted.
  - **Expected vs actual:** N/A (not an app defect) — malformed input is prevented at the widget.
  - **Register / classification:** Coverage gap · not-applicable (re-ground)
  - **Severity/Priority:** sev4 / p3
  - **UC / Gherkin slice:** UC-PRF-001-S06 (ERR-008)
  - **Status:** OPEN · **Found:** 2026-08-17
  - **Test:** none (widget prevents the state).

## Spec gaps

_None._ The `.feature` scenarios reconcile against their `-slices.md`/`-technical.md` sources; nothing the
source enumerates is missing from the app-side coverage beyond the re-grounded items logged above.

## Verified — not a defect

- **Client-side validation messages are re-grounded — the legacy ERR-### strings do not appear**
  - **What's wrong:** Nothing. The new app enforces the same rules as the legacy validator but with its own
    message text, so the legacy Gherkin strings are intentionally NOT asserted. Mapping (legacy → new):
    ERR-004 "Logged Timestamp is required." → **"Date of Incident is required."**; ERR-005 "The Suspend From
    Date must be less than  or equal to the Suspend To Date." → **"Suspension start date must be on or before
    the suspension end date."**; ERR-006 "A Check Scale for {0} does not exist in the system." → server
    **"A check scale could not be found for {id}."**; ERR-002 future-date wording matches by coincidence
    ("Date of Incident cannot be in the future.").
  - **Expected vs actual:** Expected behaviour (rule enforced) is preserved; only the wording changed. The
    tests assert the NEW strings (pinned in `fixtures/prf/performance-remark-test-data.ts` `messages`).
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-PRF-001-S06/S07/S09/S10
  - **Status:** verified 2026-08-17
  - **Test:** `features/prf/uc-prf-001-record/validation.feature` (the client-side validation outline).

- **"Both Action and Outcome selected" (ERR-001) is structurally impossible in the new UI**
  - **What's wrong:** Nothing. Legacy S08 could set BOTH the Action and Outcome drop-lists and expected
    ERR-001. The new form has a single "Issue Type" `Select` (ACTION|OUTCOME) that shows only the matching
    code field and clears the other on change — so both can never be sent, and the exactly-one-of rule is
    enforced by UI shape rather than a submit-time message. Only the "code missing for the selected type" arm
    survives ("Action is required." / "Outcome is required.").
  - **Expected vs actual:** The exactly-one-of guarantee is preserved (in fact strengthened). The "neither"
    legacy arm re-grounds to the selected-type "required" message, which is covered.
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-PRF-001-S08 (ERR-001)
  - **Status:** verified 2026-08-17
  - **Test:** `features/prf/uc-prf-001-record/validation.feature` (action/outcome code-missing arms).
