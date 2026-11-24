# Defects & Findings — UC-SCA-004 Delete Scaler Authorization

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB. Data pinned
in `fixtures/sca/sca-test-data.ts`. Ground-truthed 2026-08-05. No `@discovered-*` red tests.

---

## Divergence

_None._ Delete is a confirm-gated hard delete (real DELETE endpoint) matching the re-grounded expectations —
unlike MSD (whose "delete" is a soft workbench-remove), a Scaler Authorization confirm actually removes the
record (GET → 404), asserted green.

---

## Coverage gaps

### Coverage gap #1 — letter-issued delete-block (S03/S04) — `deferred` (no letterExists=true record)
- Legacy S03 blocks delete with a UI alert when a letter exists; S04 is the server guard if a letter appears
  between load and submit. Both need an authorization the API reports `letterExists=true` for — which is not
  obtainable: the extract's `SCALER_AUTHORIZATION_LETTER` rows resolve to `letterExists:false` via the API
  (the flag requires a stored blob those historical rows lack), and letter creation is env-blocked (Jasper;
  UC-RPT-007). The delete-block `window.alert` (`DELETE_LETTER_BLOCK_ALERT` in ScalerAuthorizationViewPage) is
  wired and ready to assert once such a record exists. **Status:** OPEN — `deferred`.

### Coverage gap #2 — district-scope (S05) / role (S06) gating — `not-applicable` / `blocked`
- Legacy hid Delete for out-of-district users (S05) and forwarded users lacking `scalerAuthorizationDelete`
  to Not-Authorized (S06). The new app does not district-gate the Delete button (org-unit scoping deferred),
  and every authenticated user satisfies the endpoint's `@IsScsEditor` under single-role mock auth. **Status:**
  OPEN — revisit with multi-role auth.

---

## Verified — not a defect

### Confirm text matches legacy CNF-001 verbatim
- `Are you sure you want to delete this record?` — identical to legacy CNF-001. Asserted green
  (`delete.feature` `@S01`/`@S02`). Cancel early-returns with no DELETE (`scalerAuthDeleteCalls === 0`).
