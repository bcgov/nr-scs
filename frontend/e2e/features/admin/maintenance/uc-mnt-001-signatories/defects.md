# UC-MNT-001 Maintain Signatories / Signature Blocks — Defect Log

> How this log works (registers, statuses, tags): [defects-guide.md](../../../../defects-guide.md).

## Divergence
_None found._ Create/update forward to the read-only view (aligned maintenance-page behavior); the
required-field and max-length rules are enforced client-side as the source describes.

## Bug / Regression
_None found._

## Coverage gap

### Coverage gap #1 — S04 list filter by Reg/Dist not automated
- **What:** The list's Reg/Dist filter + Refresh (S04) is not automated.
- **Why deferred:** `@p2` list convenience with no persistence effect; lower risk than the CRUD +
  validation paths shipped here.
- **Status:** OPEN — write when expanding `@p2` coverage.

### Coverage gap #2 — S07 reset / S08 back not automated
- **What:** Reset-edit-form (S07) and Back-cancels-edit (S08) are `@p2` UI niceties, not yet automated.
- **Status:** OPEN — same rationale as the AppointmentTypes S10 deferral.

### Coverage gap #3 — S10 delete-permission gating
- **What:** Delete-button-hidden-without-WebADE-permission (S10) cannot be exercised.
- **Why blocked:** the local stack's mock auth grants only `SCS_SYS_ADMIN`, so no permission-denied
  session is reachable. Same limitation logged across the suite.
- **Status:** OPEN — revisit if multi-role auth becomes available.

## Spec gap (gherkin-incomplete-vs-source)
_None._ (Unlike AppointmentTypes, the signatory name/position fields have no input `maxLength` cap, so
the S06 max-length rule IS reachable on submit and is covered.)

## Verified — not a defect
_None recorded._
