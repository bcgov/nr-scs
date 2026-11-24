# Defects — UC-SCA-007 View Scale Site Authorization

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

## Coverage gaps

- **CG#1 — Read-only Conditions table not separately asserted.** Rendered from the same record the read-back
  already covers; low value. `deferred`. OPEN · 2026-08-19.
- **CG#2 — Action-button presence not separately asserted.** Edit is exercised by UC-SCA-006 and Delete by
  UC-SCA-008 (both navigate from this view). `deferred`. OPEN · 2026-08-19.
- **CG#3 — Unauthorized view blocked by mock auth.** Single `SCS_SYS_ADMIN`, no per-element gate; endpoint
  `@RequiresPermission` present → waived. `blocked`. OPEN · 2026-08-19.
