# Defects — UC-SCA-008 Delete Scale Site Authorization

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

## Coverage gaps

- **CG#1 — Letter-issued delete-block not tested.** When `letterExists`, `handleDelete` pops a blocking
  `window.alert` instead of deleting; no `letterExists=true` record is obtainable (letter creation is
  env-blocked). `deferred` (revisit if a letter-issued record becomes seedable). OPEN · 2026-08-19.
- **CG#2 — Unauthorized delete blocked by mock auth.** Single `SCS_SYS_ADMIN`, no per-element gate; endpoint
  `@RequiresPermission(SCALE_SITE_AUTHORIZATION_DELETE)` present → waived. `blocked`. OPEN · 2026-08-19.
