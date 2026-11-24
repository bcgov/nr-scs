# Defects & Findings — Scaler view "Authorizations" tab (UC-SCA tabs, Tier 3)

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB. Anchors pinned
in `fixtures/sca/sca-test-data.ts` (`tabScalerLicenceNo=001A`, `tabScalerOnlyAuthId=147850`). Ground-truthed
2026-08-05. No `@discovered-*` red tests — the tab lists, links, prefills, and filters as expected.

---

## Divergence

_None._ The list, the Authorization #→view link, the licence-prefilled Add path, and the status filter all
behave as the re-grounded expectations.

---

## Coverage gaps

### Coverage gap #1 — per-row "View Letter" — `deferred` (no letterExists=true record)
- The Authorization Letter column renders a "View Letter" button only when `letterExists` is true; no
  authorization the API reports `letterExists=true` for is obtainable (historical letter rows resolve to
  `false`; letter creation env-blocked — see UC-RPT-007 defects.md). Same blocker as the CRUD UCs.
  **Status:** OPEN — `deferred`.

### Coverage gap #2 — whole-list empty state — `not-applicable` (same EmptySection exercised via the filter)
- The "no authorizations at all" EmptySection needs a scaler that *exists* but has zero authorizations; the
  probed non-existent licences 404 (error state, not empty), and real scalers carry ≥1 authorization. The
  identical EmptySection (`filteredAuthorizations.length===0`) is exercised deterministically via the
  status-filter path (`@S03`: filter Active on 001A → 0 rows → "…for the selected status"). **Status:** OPEN —
  documented; no separate test needed.

### Coverage gap #3 — loading / error tab states — `deferred`
- `isPending` (skeleton) and `isError` (EmptySection "Could not load authorizations") are transient/fault
  states not reachable without request fault-injection. **Status:** OPEN — `deferred`.

### Coverage gap #4 — district-scope / role gating — `not-applicable` / `blocked`
- The Add button and row links are not district-gated in the new app (org-unit scoping deferred →
  `not-applicable`); no role branch is reachable under single-role mock auth (`blocked`). **Status:** OPEN —
  revisit with multi-role auth.

---

## Verified — not a defect

### Skeleton-until-loaded needed a longer ready gate (not a defect, not flake)
- The Scaler view renders behind summary/tombstone queries; under 4-worker parallel load the default 10s
  expect timeout occasionally lapsed before the "Add Authorization" gate. Raised the `open()` ready gate to
  30s (matching the suite's other heavy views). Stress ×3 under default parallelism: green
  (`--grep @tab --repeat-each=3` → 26 passed 2026-08-05). This was environmental load-time, not an app fault.

### 001A anchor is data-pinned — re-verify on extract refresh
- `@S03` relies on 001A having only expired authorization(s) so the Active filter empties the list. Pinned
  with the discovery query in the fixture; if a re-extract gives 001A an active authorization, the
  empty-for-status assertion in `@S03` would need a new anchor. Re-verify the SCA tab anchors when the extract
  is refreshed.
