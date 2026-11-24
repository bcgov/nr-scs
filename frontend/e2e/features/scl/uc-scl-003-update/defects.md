# Defect log — UC-SCL-003 Update Scaler

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment for all entries below: branch `test/scl-e2e`, frontend `http://localhost:3000` + backend
`:8080` (mock auth `SCS_SYS_ADMIN`, `security.jwt.enabled=false`), seeded Docker DB
`THE/…@localhost:1525/DBDOCK_01`. The edit write path needs **no seed patch** — real extracted clients
satisfy it. Ground-truthed live 2026-07-31. Real data is non-deterministic — re-verify pinned anchors on
any DB re-extract.

---

## Divergence

_None identified for the authored slices — the app's behaviour matched the re-grounded edit-mode
expectations for S01/S02/S03/S04/S06/S08/S09 and the expiry-before-effective rule. (The legacy full-page
`.scalerUpdate` screen is replaced by the "Scaler Record - Edit" modal, and the legacy ERR- message TEXT
differs from the new React copy, but those are the re-grounded truth asserted directly — see Verified V1.)_

---

## Bug / Regression

### Bug #1 (shared with UC-SCL-002) — concurrent scaler creates collide on the generated SCALER_LICENCE_NO
- **What's wrong (plain):** two scaler creates running at the same time collide on the non-atomically
  generated `SCALER_LICENCE_NO`; the loser fails with a DB unique-key violation (surfaced as **HTTP 409
  "Database Exception: A record already exists with the same unique key."**) and rolls back. Filed in full
  with the isolation repro in [UC-SCL-002 defects.md](../uc-scl-002-create/defects.md) Bug #1.
- **How it shows up here:** UC-SCL-003's happy-path/reset slices seed a scaler via the API
  (POST /api/scalers). `@mode:serial` serialises WITHIN `update.feature`, but **not across files** —
  `create.feature` (UC-SCL-002) and `update.feature` both create scalers, so under load (e.g.
  `--repeat-each`) a cross-feature race returns the spurious 409. Observed 2026-07-31: an `@scl
  --repeat-each=3` run failed one UC-SCL-003 seed with the 409 while 65 others passed.
- **Suite handling (NOT a mask):** `seedScaler` retries **only on HTTP 409** (bounded, 6 attempts) — the
  same pattern `seedMarkSiteDesignation` uses for the identical MSD bug. This hardens the SEED scaffolding
  around the known app bug; it never wraps a behaviour under test, and the bug stays red-repro'd/documented
  in UC-SCL-002. After the retry, `@scl --repeat-each=3` is **68/68 green, 0 flaky** (2026-07-31).
- **Severity/priority:** `@p1`. **Status:** OPEN (app fix tracked under UC-SCL-002 Bug #1) — dev to make
  `SCALER_LICENCE_NO` generation atomic/concurrency-safe.

---

## Coverage gap

### Coverage gap #1 — "neither Appointment nor Exam" (legacy S05 / ERR-007) is UI-unreachable on update
- **What's not tested (plain):** legacy S05 (Scaling licence type + NEITHER an appointment nor an exam →
  "You must select an Appointment or an Exam.") can't be reached.
- **Why:** the app enforces the appointment-XOR-exam requirement **only when the scaler has no prior
  appointment or exam** — `ScalerEditModal.tsx:58-61` computes `enforceApptExamXor = !detail.appointment &&
  !detail.exam`, and `validateScalerForm` gates the ERR-007 branch on it (`ScalerForm/index.tsx:191`). Every
  scaler we can seed (or open) already owns exactly one appointment/exam (create enforces XOR), so
  `enforceApptExamXor` is always `false` and the branch never fires. Reaching it would require a scaler with
  neither — only producible by first deleting its appointment/exam (sibling UCs SCL-006/009).
- **Status:** OPEN — `not-applicable` (UI-unreachable for any seedable/openable scaler). Revisit if the
  appointment/exam-delete UCs land (a scaler stripped of both would expose it).

### Coverage gap #2 — role / permission (legacy S10 Not Authorized, ERR-005) blocked by mock auth
- **What's not tested (plain):** S10 (a user without `scalerUpdate` permission is refused). Mock auth grants
  **only** `SCS_SYS_ADMIN` to every request, so the not-authorized branch (`@IsScsEditor` on `updateScaler`
  / the route guard) can't be reached from the browser.
- **Status:** OPEN — `blocked` by mock auth. Revisit if the harness gains multi-role auth.

### Coverage gap #3 — status → authorization eligibility (BR-SCL-003-01) not asserted directly
- **What's not tested (plain):** the legacy rule that an update propagates to authorization eligibility
  (`ScalerDelegate.updateScaler` → `generateLicense()` / `removeLicense()` after the DB update).
- **Why deferred:** the S01 licence-fields save exercises the write path (adding Waste), but the downstream
  authorization-eligibility side effect is not observable through the scaler read-back — asserting it needs
  the Authorizations surface (a sibling UC). Low value in isolation.
- **Status:** OPEN — `deferred`. Fold into an Authorizations-tab UC if/when authored.

### Coverage gap #4 (shared with UC-SCL-002) — appointment/exam sub-field required guards — deferred
- **What's not tested (plain):** the conditional-required guards inside the chosen section (Province Wide,
  Appointment Effective Date, Appointment / Exam / Upgrade / Completed By) — `ScalerForm/index.tsx:201-223`.
  S04 fills both sections positively (so the fields work); the required-guards themselves aren't asserted.
- **Reviewer note (raise the rank):** these blocks contain the form's only *cross-clearing* logic — each
  section deletes the other's `nextErrors.*` (`index.tsx:210-223`), which is genuinely branch-y, not just
  another `required(...)`. A ~5-row outline (blank one sub-field at a time) would close it, but needs
  `fillAppointment` to take a `Partial<>` signature like `fillCore` so a single sub-field can be left blank.
- **Status:** OPEN — `deferred`, but upgraded from "low-risk"; worth doing alongside UC-SCL-004.

### Coverage gap #5 — Delete Record (edit-modal delete flow) is untested through the UI
- **What's not tested (plain):** the "Delete Record" button on the edit modal — its confirm dialog, the
  DELETE, the redirect to the create screen on success, and the ORA-02292 child-record rejection banner
  (`ScalerEditModal.tsx:121-146`).
- **Why here:** deleting a scaler is a **behaviour on the update surface**, not the display-only STA-002 the
  legacy slice implies. The DELETE endpoint is even exercised at API level (it's the suite's own cleanup),
  but never driven through the UI.
- **Status:** OPEN — `deferred`. Belongs to the scaler-delete work (branch `feat/scl-15-scaler-delete` /
  UC-SCL-012); author it there, not in this UC. Logged so it isn't lost between UCs.

### Coverage gap #6 — no edit negative reaches the backend (server-reject path uncovered)
- **What's not tested (plain):** every edit validation slice is blocked CLIENT-SIDE (asserts the PUT spy
  === 0), so no edit scenario lets a PUT reach the backend and get rejected. The edit-path server-error
  mapping (`resolveServerErrors` + `EDIT_VISIBLE_FIELD_KEYS`, `ScalerEditModal.tsx:113-117`) therefore has
  zero coverage — whereas create has S08 (client-not-found) exercising its server-reject path.
- **Why deferred:** the edit client-validation catches every input the form can produce, so there is no
  deterministic edit input that passes the client and fails the server (the one candidate, a duplicate
  licence attribute = legacy S11, is itself not-applicable — no reliable UI trigger).
- **Status:** OPEN — `deferred` / hard-to-trigger. Revisit if a server-only edit rejection becomes reachable.

---

## Spec gap (gherkin-incomplete-vs-source)

### Spec gap #1 — the expiry-before-effective rule is enforced by the app but absent from the UC-SCL-003 spec
- **What's missing (plain):** the edit form rejects an Expiry Date earlier than the Effective Date with
  **"Scaler effective date must be on or before the licence expiry date."** (`ScalerForm/index.tsx:168-174`).
  This rule appears **nowhere** in `UC-SCL-003-slices.md` or `-technical.md` (the legacy date slice S07 only
  covers free-text `yyyyMMdd` format, which is itself not-applicable under the Carbon DatePicker).
- **Covered anyway:** yes — `validation.feature` scenario "Save is blocked when the expiry date is before
  the effective date".
- **Status:** OPEN — `spec gap`. **ACTION: BA to regenerate `UC-SCL-003` slices/technical from source to
  include the expiry-vs-effective ordering rule** (Gherkin ⊄ its own source / the app).

---

## Verified — not a defect

### V1 — the edit validation wording differs from the legacy ERR- catalog, and the update surface is a modal
- Legacy UC-SCL-003 describes a full `.scalerUpdate` page (P009) and ERR-001..011 texts. The new app edits
  through the "Scaler Record - Edit" **modal** (PUT /api/scalers/{no}) and returns the edit-mode copy
  ("Reg / Dist is required.", "You must select at least 1 Licence Type.", "Either the Appointment section
  or the Exam section is required but not both.", …). These are the re-grounded truth, asserted directly —
  not defects, recorded so they aren't re-investigated. (The edit-mode copy also differs from the
  create-mode copy — e.g. "Reg / Dist is required." vs create's "District is required." — by design; see
  `validateScalerForm` mode branches.)
