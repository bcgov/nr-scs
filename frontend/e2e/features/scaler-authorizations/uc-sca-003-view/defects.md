# Defects & Findings — UC-SCA-003 View Scaler Authorization

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB. Data pinned
in `fixtures/sca/sca-test-data.ts`. Ground-truthed 2026-08-05. No `@discovered-*` red tests.

---

## Divergence

_None._ The read-only view renders as the re-grounded expectations.

---

## Coverage gaps

### Coverage gap #1 — district-scope (S06) / role (S08) gating — `not-applicable` / `blocked`
- Legacy hid Edit/Delete/Create-Letter for out-of-district users (S06, STA-002) and forwarded unauthorized
  direct-URL access to a Not-Authorized page (S08). The new app does **not** district-gate the view buttons
  (org-unit scoping is deferred — no `userHasAccessToDistrict` equivalent), and route-level auth
  (`ProtectedRoute`) is always satisfied by the single mock role `SCS_SYS_ADMIN`. So S06 is `not-applicable`
  and S08 is `blocked`. **Status:** OPEN — revisit with multi-role auth.

### Coverage gap #2 — S07 letterExists=true (View Letter + delete-alert) — `deferred` (no obtainable record)
- S07 needs an authorization the API reports `letterExists=true` for. Empirically (2026-08-05) the
  `SCALER_AUTHORIZATION_LETTER` rows in the extract (e.g. auth 4154/4161/4170) all resolve to
  `letterExists:false` via `GET /api/scaler-authorizations/{id}` — the computed flag requires a stored
  letter blob those historical rows lack — and letter **creation** is env-blocked (Jasper; see UC-RPT-007).
  So neither a discovered nor a seeded `letterExists=true` record is available. The "View Letter" toggle and
  the delete letter-alert (UC-SCA-004 S03/S04) and edit letter-lock (UC-SCA-002 S07) are all deferred on the
  same root cause. **Status:** OPEN — `deferred`; authorable once a letter can be created (working Jasper) or
  a letterExists=true record is seeded at the DB.

---

## Verified — not a defect

### Job-function value renders as its LOV label
- The Job Functions section maps the stored code ('P') to its SCALE_METHOD_TYPE_CODE label ("Piece Scale");
  the view asserts the label appears. (The table-scoped locator by the "Job Function" column header did not
  match reliably — the page-level assertion is used instead; the value itself renders correctly.)
