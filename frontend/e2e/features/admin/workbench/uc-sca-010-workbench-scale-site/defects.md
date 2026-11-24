# Defects — UC-SCA-010 Work Bench: Expiring Scale Site Authorizations

> How this log works: [`defects-guide.md`](../../../../defects-guide.md)

## Bug / Regression
_None found._

## Divergence
_None._ Re-grounded behaviour (Add=renew→navigate; Remove confirm "…remove this record from the list")
matches the built app.

## Coverage gap

### Coverage gap #1 — S05/S06 permission-gating (blocked by single-role mock auth)
- `workbenchScaleSiteAuthManagement` cannot be withheld under mock auth (only `SCS_SYS_ADMIN` exists), so
  the hidden-buttons (S05) and direct-call-denial (S06) slices can't be exercised. Status: OPEN (`blocked`).

### Coverage gap #2 — S04 empty-state not testable (real expiring record always present)
- The scale-site workbench view always returns ≥1 real expiring authorization in the current extract
  (e.g. 239291, expiry 2026-08-21), so the "Zero records found" empty state cannot be asserted without
  mutating real data. Omitted by design; covered for scaler/MSD instead. Status: OPEN (`not-applicable`).

### Coverage gap #3 — new-app behaviours with no legacy slice (edge-case review 2026-07-29)
Same rationale as UC-SCA-009 defects.md #3/#4 (tests stay grounded in the legacy spec): row detail-link
navigation, renew/remove server-error banners (+ null-`newAuthorizationId`), and the "Removed from list."
info banner are built-app behaviours with no UC-SCA-010 gherkin slice → not authored. UC-SCA-012 (District
Manager) is covered-by-sibling (same actions; actor gate blocked by single-role mock auth). Status: OPEN.

## Spec gap
_None._

## Verified — not a defect
- **Seeding + cleanup confirmed** (2026-07-29): `POST /api/scale-site-authorizations` with an in-window
  expiry appears in the workbench; `DELETE /api/scale-site-authorizations/{id}` → 204 cleans up the seed
  and the renewed clone.
