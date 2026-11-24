# Defects & Findings — Scale Site view "Authorized Scalers" tab (UC-SCA tabs, Tier 3)

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB. Anchor pinned
in `fixtures/sca/sca-test-data.ts` (`tabAuthorizedScalersSiteId=520`). Ground-truthed 2026-08-05. No
`@discovered-*` red tests — the tab lists, links, and filters as expected.

---

## Divergence

_None._ The list, the Authorization #→view and Licence #→scaler links, the no-prefill Add path, and the
status filter all behave as the re-grounded expectations.

---

## Coverage gaps

### Coverage gap #1 — whole-list empty state — `not-applicable` (same EmptySection exercised via the filter)
- The "no authorized scalers at all" EmptySection needs a site that *exists* with zero authorized scalers; a
  scan of real site ids found none that return `[]`+200 (they either 404 = don't exist, or carry rows), and a
  seeded authorization does not surface in this view (different linkage). The identical EmptySection
  (`filteredAuthorizedScalers.length===0`) is exercised deterministically via the status-filter path (`@S03`:
  filter Active on site 520 → 0 rows → "…for the selected status"). **Status:** OPEN — documented; no separate
  test needed.

### Coverage gap #2 — loading / error tab states — `deferred`
- `isPending` (skeleton) and `isError` (EmptySection "Could not load authorized scalers") are transient/fault
  states not reachable without request fault-injection. **Status:** OPEN — `deferred`.

### Coverage gap #3 — district-scope / role gating — `not-applicable` / `blocked`
- The Add button and links are not district-gated in the new app (org-unit scoping deferred →
  `not-applicable`); no role branch is reachable under single-role mock auth (`blocked`). **Status:** OPEN —
  revisit with multi-role auth.

---

## Verified — not a defect

### Seeded authorizations do NOT appear in this view (design, not a bug)
- Probed 2026-08-05: POST a scaler authorization (District-Wide=No, `scaleSites:["520"]`) → 201, then GET
  `/api/scale-sites/520/authorized-scalers` — the site's row set was unchanged (stable 8 rows, all Expired);
  the seeded id did not appear. The authorized-scalers view reads a different linkage than a scaler
  authorization's scale-site list, so this tab is driven against pre-existing data and its links asserted by
  href pattern. Recorded so a future author doesn't treat the "seed didn't show up" as a defect.

### Skeleton-until-loaded needed a longer ready gate (not a defect, not flake)
- The Scale Site view renders behind summary + tombstone + two LOV queries; under 4-worker parallel load the
  default 10s expect timeout lapsed before the "Add Authorization" gate (the initial failure here). Raised the
  `open()` ready gate to 30s. Stress ×3 under default parallelism: green (`--grep @tab --repeat-each=3` → 26
  passed 2026-08-05). Environmental load-time, not an app fault.

### Site 520 anchor is data-pinned — re-verify on extract refresh
- `@S03` relies on site 520's authorized scalers all being Expired so the Active filter empties the list.
  Pinned with the discovery query in the fixture; if a re-extract gives site 520 an active authorized scaler,
  the empty-for-status assertion needs a new anchor. Re-verify the SCA tab anchors when the extract is refreshed.
