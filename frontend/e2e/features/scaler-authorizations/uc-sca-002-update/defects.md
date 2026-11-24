# Defects & Findings — UC-SCA-002 Update Scaler Authorization

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB. Data pinned
in `fixtures/sca/sca-test-data.ts`. Ground-truthed 2026-08-05. No `@discovered-*` red tests.

---

## Divergence

_None._ The edit validation/save behaves as the re-grounded expectations.

---

## Coverage gaps

### Coverage gap #1 — letter-lock (S07) — `deferred` (no letterExists=true record)
- When a letter exists the edit screen disables every field except Expiry Date and `validate()` requires
  only Expiry Date (the letter-lock branch), and Delete becomes alert-only. This needs an authorization the
  API reports `letterExists=true` for, which is not obtainable (historical `SCALER_AUTHORIZATION_LETTER`
  rows resolve to `letterExists:false`; letter creation env-blocked — see UC-SCA-003 defects.md #2 /
  UC-RPT-007). The lock code + `disabled={letterExists}` are wired and ready to assert once such a record
  exists. **Status:** OPEN — `deferred`.

### Coverage gap #2 — legacy validations not ported (max-years, site-within-district, yyyyMMdd) — `not-applicable`
- Legacy S04 (max authorization years, ERR-004), S05 (site outside district, ERR-006), and S03 (yyyyMMdd
  date format, ERR-002) have **no new-app enforcement**: `validateUpdateRequest` (→ `validateCreateRequest`)
  checks required fields + Y/N + date order only; dates are typed. Nothing to assert against. **Status:**
  OPEN (documented, permanent). Flag to BA/QA if the max-period / district-boundary rules are required.

### Coverage gap #3 — district-scope (S08) / role (S09) gating — `not-applicable` / `blocked`
- S08 (out-of-district hides Edit/Delete/Create-Letter) has no new-app equivalent (org-unit scoping
  deferred); S09 (lacks `scalerAuthorizationUpdate`) is unreachable under single-role mock auth (every user
  satisfies `@IsScsEditor`). **Status:** OPEN — revisit with multi-role auth.

---

## Verified — not a defect

### Update validation reuses the create validator
- `ScalerAuthorizationService.validateUpdateRequest` delegates to `validateCreateRequest`, and the edit
  screen's client `validate()` mirrors create's (required fields + date order + ≥1 job function + ≥1 site
  when District Wide=No + SFP-when-'S'). The required-field + date-order arms are asserted here (S02); the
  business rules are covered once on create (UC-SCA-001). Recorded so they are not re-investigated per host.
