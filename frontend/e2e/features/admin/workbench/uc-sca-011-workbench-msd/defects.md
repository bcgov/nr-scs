# Defects — UC-SCA-011 Work Bench: Expiring Mark Site Designations

> How this log works: [`defects-guide.md`](../../../../defects-guide.md)

## Bug / Regression
_None found._

## Divergence
_None._ Re-grounded behaviour (Add=renew→navigate; Remove confirm "…remove this record from the list")
matches the built app.

## Coverage gap

### Coverage gap #1 — S05/S06 permission-gating (blocked by single-role mock auth)
- `workbenchMSDAuthManagement` cannot be withheld under mock auth (only `SCS_SYS_ADMIN` exists). Status:
  OPEN (`blocked`).

### Coverage gap #2 — S04 empty-state is real-data-dependent
- The "Zero records found" scenario holds only while the real extract has 0 expiring MSDs (true as of
  2026-07-29). Status: OPEN (`informational`).

### Coverage gap #3 — new-app behaviours with no legacy slice (edge-case review 2026-07-29)
Same rationale as UC-SCA-009 defects.md #3/#4 (tests stay grounded in the legacy spec): row detail-link
navigation, renew/remove server-error banners (+ null-`newAuthorizationId`), and the "Removed from list."
info banner are built-app behaviours with no UC-SCA-011 gherkin slice → not authored. UC-SCA-012 (District
Manager) is covered-by-sibling (same actions; actor gate blocked by single-role mock auth). Status: OPEN.

## Spec gap
_None._

## Verified — not a defect
- **Seeding + cleanup confirmed** (2026-07-29): a District-Wide `ES20R4` MSD with an in-window expiry
  appears in `GET /api/mark-site-designations/workbench`; two District-Wide creates do NOT collide (no
  `hauling_mark_site` unique key); DB cleanup removes the seed and the renewed clone.
- **Environment prerequisite:** the `msd-create-mark.sql` patch must be applied so ES20R4 is creatable; if
  the seed step 500s/404s with "No mark holder found…", re-apply via `scripts/apply-patches.sh`.
