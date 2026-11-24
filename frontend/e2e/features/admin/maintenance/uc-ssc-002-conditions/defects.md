# UC-SSC-002 Maintain Conditions — Defect Log

> How this log works (registers, statuses, tags): [defects-guide.md](../../../../defects-guide.md).

## Divergence

### Divergence #1 — an SCA condition cannot be created through the UI (client/server contradiction) — FIXED
- **Resolution (2026-07-24):** Fixed in `nr-scs`. The Conditions page now treats Site Type as applying
  **only to SIA**: `Conditions/index.tsx` (`isSia` gate on `validate` + `handleFieldChange`) and
  `ConditionsModal.tsx` (`siteTypeApplies`/`showSiteType` → `isSia`) hide the field and clear the value for
  MSD **and SCA**, and `buildPayload` sends `siteMethodTypeCodes: null` for non-SIA (`conditions.service.ts`
  request types widened to `string[] | null`). The E2E scenario flipped from a `@discovered-divergence` red
  to a green create-happy (create.feature `@S06 @p1`), verified against the live app + the Conditions
  browser tests. No backend change (its rule was already correct).
- **What's wrong (plain, original):** For a condition of type **SCA** (Scaler Authorization), the create form showed a
  "Site Type" field and requires the administrator to pick at least one. But the backend rejects *any*
  Site Type on an SCA condition. So the form forces the user to pick a Site Type, and the server then
  refuses to save it — there is no way to create an SCA condition through the screen at all.
- **Expected vs actual:**
  - *Expected* (server rule + legacy S06/ERR-010 intent): SCA (like MSD) has **no** Site Type. The form
    should hide/omit Site Type for SCA, and saving an SCA condition without a Site Type should succeed.
  - *Actual:* the client `validate()` requires ≥1 Site Type whenever the type is **not MSD** (so SCA is
    caught), and the form renders the Site Type multiselect for SCA. If the user does supply one, the
    server rejects it: `POST /api/conditions` (SCA + `siteMethodTypeCodes:["P"]`) → **HTTP 400** `{"code":
    "BAD_REQUEST","message":"Site Type is only valid for scale site conditions."}`. If they leave it empty,
    the client blocks the save with "Site Type is required." Either way the SCA condition cannot be saved.
- **How we caught it:** create.feature `@S06 @discovered-divergence` selects Type SCA, fills every other
  field, leaves Site Type empty (the server-valid shape), saves, and asserts the condition reaches the view
  (RED — the client blocks with "Site Type is required.", never POSTing). Reproduced directly against the
  API: `POST` SCA **with** a Site Type → 400 (message above); `POST` SCA **without** a Site Type → 201
  created. So the server-valid path is exactly the one the client forbids.
- **Supporting detail:** client rule at `Conditions/index.tsx validate()` (`!isMsd(classCode) &&
  siteMethodTypeCodes.length === 0`) and `ConditionsModal.tsx` (`siteTypeApplies = !isMsd(...)`); server
  rule at `ConditionService.validateSiteMethodTypeCodes` (SIA requires; MSD **and SCA** forbid). The fix is
  to treat SCA like MSD in the client (hide Site Type, don't require it).
- **Severity/priority:** @p1. **Environment:** local mock-auth stack, seeded Docker DB, 2026-07-24.
  **Data fixture:** ad-hoc SCA body (no persisted row — the create is blocked/rejected).
- **Status:** CLOSED (fixed in this branch, 2026-07-24 — client now hides + omits Site Type for SCA/MSD,
  matching the backend). No Jira ticket required.

## Bug / Regression
_None found._

## Coverage gap

### Coverage gap #1 — S04 filter list by type (as an assertion)
- `@p2` list filter. The filter path *is* exercised — `openViewInClass` uses it to reach a row — but its
  own filtering behavior is not asserted as a dedicated scenario (pagination-fragile under parallel load).
  Status: OPEN.

### Coverage gap #2 — S09 reset / S10 back on the edit form
- `@p2` UI niceties (Reset = `crud.resetForm`, Back = `crud.cancelEdit`). Not automated. Status: OPEN.

### Coverage gap #3 — permission gates (STA-001..004)
- Blocked by single-role mock auth (no non-admin session): filter/add/edit/delete WebADE action gates.
  Status: OPEN.

## Spec gap (gherkin-incomplete-vs-source)

### Spec gap #1 — S08 date-format (ERR-011/012) and S12 empty-id load (ERR-014) not reachable in the new UI
- **What:** Legacy S08's invalid-date-format branch and S12's empty-`scaleAuthConditionId` load are
  submit-/request-time validations in the source. The new app prevents both at the control: dates use a
  Carbon date picker (no free-text bad format) transported as ISO `LocalDate`, and the detail view opens
  from a row button that always carries the id (no empty-id request path exists).
- **Status:** OPEN — informational; the `.feature` intentionally omits S08-format and S12 scenarios.

## Verified — not a defect
- **Sort-order range message re-grounded** — legacy ERR-006 "Sort Order cannot be negative." + ERR-007
  "Sort Order is invalid." (>9999) are collapsed into one client rule "Sort Order must be between 0 and
  9999." (server: "Sort order must be between 0 and 9999."). The rule holds; only the wording changed.
- **Expiry-order message re-grounded** — legacy ERR-013 "Expiry Date is invalid." is now the clearer
  "Expiry Date must be on or after Effective Date." Same rule, better message. Covered green.
- **MSD hides Site Type** — the client hides + clears Site Type for MSD, so legacy ERR-009 (Site Type
  invalid for MSD) is unreachable by design; MSD conditions create cleanly without a Site Type (covered).
- **Delete-blocked warning is correct** — a dependent-having condition (MSD/188) shows the "…cannot be
  deleted…" warning and is not removed (verified live); the rule + message are correct.
