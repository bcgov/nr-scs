# Defects — UC-SCA-006 Update Scale Site Authorization

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

## Divergences

- **Expiry-after-effective client/server mismatch** — same as UC-SCA-005 (the edit form runs the same
  `validateBasics`). See [uc-sca-005-create/defects.md](../uc-sca-005-create/defects.md) Divergence #1. OPEN · 2026-08-19.

## Verified — not a defect (kept under a regression guard)

- **An edit-save may silently drop the record's existing conditions (destructive update + conditions-section race)**
  - **Outcome (2026-08-21 live run):** the guard **passed** — after an unrelated-field edit the record still
    reads back condition 462, so the edit preserves conditions and the suspected data-loss **did not
    reproduce**. Downgraded from suspected-sev2 to *observed-safe*. Caveat: the mechanism below is a **render
    race**, so a single green run shows the record load reliably wins in practice, not that the losing
    ordering is impossible — the guard (`@S01 @p1`) is retained precisely to catch a regression, and the
    one-line hardening (pass `loadDefaults={false}` on the edit page's conditions section, as the View page
    already does) remains worth applying to remove the race entirely.
  - **What's wrong (mechanism):** `updateScaleSiteAuthorization` is destructive by design — it
    `deleteSiteAuthorizationConditions(existing)` then `addConditions(request)`. So the PUT body's condition
    list *replaces* the stored one; if the form submits the wrong list, the existing conditions are lost.
    The edit form looks primed to do exactly that: `pages/Edit/ScaleSiteAuthorization/index.tsx` renders
    `AuthorizationConditionsSection` **without** `loadDefaults={false}` (the View page passes it, Edit does
    not). `loadDefaults` defaults `true`, so the section's mount effect runs `setConditions(mandatoryConditions ?? [])`
    (`AuthorizationConditionsSection/index.tsx:83`) and races the record load's `setConditions(nextDetail.conditions)`.
    The section isn't gated on `record`, so it mounts first — an edit-save could ship the defaulted (empty /
    mandatory-only) list and drop the record's real conditions.
  - **Guard:** `update.feature @S01 @p1` seeds a record **with** condition 462, edits only the expiry, saves,
    and asserts the read-back still contains 462.
  - **If the guard ever flips red:** the condition was dropped → promote to a **sev2 data-loss** defect, tag
    the scenario `@discovered-bug`, exclude it from the green run via
    `--grep-invert "@discovered-divergence|@discovered-bug"`, and apply the `loadDefaults={false}` hardening.
  - **Register / classification:** Verified — not a defect (regression guard retained)
  - **Severity/Priority (if it regresses):** sev2 / p1
  - **UC / Gherkin slice:** UC-SCA-006-S01
  - **Environment / build:** local seeded Docker DB (:1525); nr-scs `main`; branch `test/e2e-scale-site-auth-crud`
  - **Data fixture:** `fixtures/sca/sca-test-data.ts` (`siaConditionBody`, seeded via `seedScaleSiteAuthorization([siaConditionBody])`)
  - **Status:** VERIFIED (guard green) · **Found:** 2026-08-21 · **Confirmed:** 2026-08-21

## Coverage gaps

- **CG#1 — Cancellation date/reason edit not tested.** Always-editable `#cancellation-date` /
  `#cancellation-reason`; the cancel flow is low value versus the core field-update already covered. `deferred`. OPEN · 2026-08-19.
- **CG#2 — Letter-lock branch not tested.** When `letterExists`, the edit form disables all fields except
  cancellation and short-circuits validation; no `letterExists=true` record is obtainable (letter creation
  is env-blocked). `deferred`. OPEN · 2026-08-19.
- **CG#3 — Unauthorized update blocked by mock auth.** Single `SCS_SYS_ADMIN`, no per-element UI gate;
  endpoint `@RequiresPermission` present → waived. `blocked`. OPEN · 2026-08-19.
