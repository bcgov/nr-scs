# Defects & Findings — UC-MSD-006 Pull Hauling/Harvesting Authority Data

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: branch `iman/e2e-tests-for-MSD-domain`, frontend `:3000` + backend `:8080` (mock auth
`SCS_SYS_ADMIN`) + seeded Docker DB `THE/default@localhost:1525/DBDOCK_01`. Ground-truthed 2026-07-22.
**No E2E tests are authored for this UC** — see the Coverage gaps below for why.

---

## Coverage gaps

### Coverage gap #1 — HarvestingAuthority slices (S02/S04/S05/S06) — `not-applicable` (descoped TCR)

- **What's not tested (plain):** The harvesting-authority half of this UC (search returns records / cutting
  permit not found / read-by-HVA-Skey null / read returns >1 row → SQLException) exclusively serves
  **UC-TCR-001, Create Timber Cruise Plan**. TCR (Timber Cruise) is on the project's **do-not-build** list
  (HND / TCR / Waste RSK / Cruise RSK), and — confirmed 2026-07-22 — no `HarvestingAuthority` class or
  endpoint exists anywhere in `nr-scs`. There is nothing to drive and, by scope, nothing to build.
- **Status:** OPEN (documented, permanent) — `not-applicable`. Excluded from the coverage denominator.

### Coverage gap #2 — UC is a backend DAO/integration concern with no UI — Hauling behavior covered via UC-MSD-001

- **What's not tested (plain):** UC-MSD-006 describes SCS querying the forestry source systems' authority
  DAOs (Oracle packages `scs_hauling_authority_pkg` / `scs_harvesting_authority_pkg`). It has **no screen
  and no dedicated endpoint** in the new app — a browser E2E suite tests through the UI/API, not DAOs in
  isolation, so there is no standalone surface to author against.
- **Why it's still adequately covered:** the *only* user-observable behavior — a timber mark resolving (or
  not) via the source system during MSD create — is exercised by **UC-MSD-001**:
  - S01 (record found → mark valid) → `create.feature @S01`/`@S02` (mark `ES20R4` resolves the holder view
    → create HTTP 201).
  - S03 (no rows → "Timber Mark could not be found") → `mark-not-found.feature @S03` (server-reject: GET/POST
    `timberMark=ZZZQ999` → HTTP 404 "No mark holder found for timber mark…" + record absent). The
    re-grounded message wording is logged under UC-MSD-001 "Verified — not a defect" (V1).
- **Status:** OPEN (documented, permanent) — `not-applicable` as a standalone E2E; behavior covered via the
  named UC-MSD-001 scenarios above.

---

## Verified — not a defect

### The in-scope (hauling) behavior is covered by UC-MSD-001 — recorded so it is not re-investigated

- SCS's use of forestry authority data for timber-mark validation is observable only through the MSD create
  flow, and both arms (found → create proceeds; not-found → 404 + no save) are asserted green there. No new
  app surface exists for the DAO layer itself, and the harvesting side is descoped (TCR). Nothing here is a
  defect; this UC contributes **zero** red tests.
