# Defect log — UC-SCL-002 Create Scaler

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment for all entries below: branch `test/scl-e2e`, frontend `http://localhost:3000` + backend
`:8080` (mock auth `SCS_SYS_ADMIN`, `security.jwt.enabled=false`), seeded Docker DB
`THE/…@localhost:1525/DBDOCK_01`. Create needs **no seed patch** — real extracted clients satisfy the
write path. Ground-truthed live 2026-07-30. Real data is non-deterministic — re-verify pinned clients on
any DB re-extract.

---

## Divergence

_None identified for the authored slices — the app's behaviour matched the re-grounded expectations for
S01/S02(→S06)/S03/S04/S08. (The legacy FLD-/ERR- message TEXT differs from the new React copy, but that is
the re-grounded truth asserted directly, not a divergence — see Verified V1.)_

---

## Bug / Regression

### Bug #1 — concurrent scaler creates collide on the generated SCALER_LICENCE_NO (observed)
- **What's wrong (plain):** When two Create Scaler requests run at the same time, one fails with a DB
  unique-key violation — surfaced to the user as **"Please fix the errors below. Database Exception: A
  record already exists with the same unique key."** — and rolls back. A single create always succeeds. So
  two users creating scalers (for *different* clients) concurrently can hit a spurious failure.
- **Expected vs actual:** Expected — two independent creates for different clients both succeed. Actual —
  the second collides on the generated `SCALER_LICENCE_NO`.
- **How we caught it:** the two happy paths (`create.feature` S01 client `00001481`, S06 client `00001490`
  — *different* clients, so NOT a `SCLR_UK`/client collision) failed **only when run in parallel**; S01
  passes ALONE (verified 2026-07-30). The failing scaler never persisted (its client had no scaler row),
  so the violated key is the scaler PK / licence-no, not `SCLR_UK`.
- **Evidence / root cause:** `scs_scaler_pkg.insertScaler` generates `SCALER_LICENCE_NO` (a mixed
  numeric/alphanumeric licence number — the DB has both `9999` and `430A`-style values, so it is NOT a
  plain sequence). It is assigned **non-atomically** (compute-next-then-insert), so two overlapping creates
  compute the same next value and the second violates the `SCALER` PK. (Same failure family as UC-MSD-001
  Bug #1 — a thread-unsafe create path; here the unique key is the lucky catch.)
- **Impact on the suite:** the create scenarios (`create.feature` — S01, S06, and the duplicate-rule test
  whose API seed also inserts a scaler) are `@mode:serial` so they never race each other; the pure-
  validation slices (`validation.feature`) never generate a licence no, so they stay parallel. This makes
  the suite deterministic WITHOUT masking the defect (logged here with the isolation repro). Not kept as a
  `@discovered-bug` test — a concurrency race is not a stable red.
- **Severity/priority:** `@p1` (a real multi-user data-entry failure; intermittent under load).
- **Status:** WON'T-FIX — accepted as a pre-existing legacy defect. The race lives in the **immutable**
  Oracle package `scs_scaler_pkg.insertScaler` (non-atomic licence-no generation), which the new app calls
  unchanged, so legacy carries the identical latent race — this is not a rebuild regression. Per project
  policy the Oracle package cannot be changed, so the only available fix is a Java-layer workaround
  (serialize/retry server-side); triaged as not worth it given scaler creation is low-volume admin data
  entry that legacy tolerated. No Jira ticket raised. The suite stays deterministic via `@mode:serial` on
  the create scenarios, so the defect is documented without being masked.

---

## Coverage gap

### Coverage gap #1 — Waste licence type + Expiry (legacy S05/ERR-003) and licence-type-required (FLD-006) are UI-unreachable on create
- **What's not tested (plain):** legacy S05 (selecting **Waste** with no Expiry Date → ERR-003) and FLD-006
  ("Licence Type is required.") can't happen on the new create form.
- **Why:** the new React create form (`components/Form/ScalerForm`, `mode="create"`) renders the
  Scaling/Waste licence-type checkboxes and the Expiry Date field **only in edit mode** (`edit ?` gates at
  `ScalerForm/index.tsx:406,449`); create hard-codes `licenceTypes:['SCS']` (`:258`). So Waste can't be
  selected and a licence type is always present. The server rules still exist (`ScalerService.validateWrite`
  L306-309) but are unreachable from the Create UI as shipped.
- **Status:** OPEN — `not-applicable` (UI-unreachable **on create** by design). Possibly worth a BA note
  (is Waste-on-create intentionally dropped?).
- **Now covered elsewhere:** the Waste licence type + Expiry Date + licence-type-required behaviour IS
  reachable on the **edit** form and is covered by **UC-SCL-003** — the Waste+Expiry positive save
  (update.feature S01 licence-fields), no-licence-type (validation.feature S03), and Waste-with-no-expiry
  (validation.feature S06). This gap remains only about their absence from the **create** UI.

### Coverage gap #2 — role / permission (legacy S09 Not Authorized, ERR-005) blocked by mock auth
- **What's not tested (plain):** S09 (a user without `scalerCreate` permission is refused). Mock auth grants
  **only** `SCS_SYS_ADMIN` to every request (`MockRequestFilter`), so the not-authorized branch
  (`@IsScsEditor` / route guard) can't be reached from the browser.
- **Status:** OPEN — `blocked` by mock auth. Revisit if the harness gains multi-role auth.

### Coverage gap #3 — Back without saving (legacy S07) — no Back control on the new create form
- **What's not tested (plain):** S07 (clicking **Back** discards the create and returns to welcome, no
  record created). The new create form has **no Back button** — only **Reset** (clears the form in place)
  and **Save Record** (`ScalerForm/index.tsx:588,592`). There is no navigate-away-without-saving control to
  assert, and Reset is an in-place clear (a sibling behaviour), not the legacy Back→welcome flow.
- **Status:** OPEN — `not-applicable` (UI redesign) for the Back→welcome flow. The create **Reset** itself
  remains an untested sibling behaviour — and note it is **not** covered by UC-SCL-003's Reset test: that
  exercises the *edit* Reset, which is a **DB refetch** (`ScalerEditModal.handleReset`), a different
  implementation from create's **in-place clear**. So the two Resets are asymmetric; a create-Reset
  scenario would still be additive (low value — no persistence involved).

### Coverage gap #4 — appointment/exam sub-field required guards — deferred
- **What's not tested (plain):** the conditional-required guards inside the chosen section — **Province Wide
  is required.**, **Appointment Effective Date is required.**, **Appointment is required.** (appointment
  path) and **Exam / Upgrade is required.**, **Completed By is required.** (exam path) —
  `ScalerForm/index.tsx:202-219`. The happy paths fill these positively (so the fields work), but the
  required-guards themselves aren't asserted.
- **Why deferred:** the S02 outline covers the *core* required fields (Client/District/Effective Date/Oath);
  the section sub-field guards are the same client-side `required(...)` mechanism and are low-risk. A
  follow-up validation outline (blank one section sub-field at a time) would close it.
- **Status:** OPEN — `deferred` (add a section-required outline).

---

## Spec gap (gherkin-incomplete-vs-source)

### Spec gap #1 — the one-scaler-per-client rule is enforced by the app but absent from the UC-SCL-002 spec
- **What's missing (plain):** the new backend enforces **one scaler per client** (`ScalerService.clientHasScaler`
  L76-79 → 400 "A scaler already exists for this client.", backed by the DB UNIQUE key `SCLR_UK` on
  `SCALER.CLIENT_NUMBER`). This rule appears **nowhere** in `UC-SCL-002-slices.md` or
  `-technical.md` (the legacy spec only lists client-not-found, ERR-004).
- **Covered anyway:** yes — `create.feature` duplicate-rule scenario ("Creating a second scaler for a client
  that already has one is rejected") seeds a scaler via the API then attempts a UI create on the same
  client and asserts the message.
- **Status:** OPEN — `spec gap`. **ACTION: BA to regenerate `UC-SCL-002` slices/technical from source to
  include the uniqueness rule** (Gherkin ⊄ its own source / the app).

---

## Verified — not a defect

### V1 — the create validation message wording differs from the legacy FLD-/ERR- catalog, and that is correct
- Legacy (Struts) e.g. FLD-001 "Scaler (Client / Loc) is required.", ERR-004 "A Scaler Client could not be
  found for {clientNumber}." The new React form/back end return "Client is required.",
  "No client found for client number {n} at location 00.", the XOR messages, and "A scaler already exists
  for this client." These are the re-grounded truth, asserted directly — not defects, recorded so they
  aren't re-investigated.
