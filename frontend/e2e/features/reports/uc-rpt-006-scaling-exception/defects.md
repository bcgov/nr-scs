# Defects — UC-RPT-006 Generate Scaling Exception Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

No bugs or divergences are unique to this screen. One coverage gap and the suite-wide environment blocker.

---

## Divergences

### Date-window validation — **FIXED 2026-08-11** (was cross-referenced to the archetype)

This screen had neither the From-after-To check nor the unparseable-date check that legacy enforced. Both were
filed against the archetype (single repro by design) and **both are now closed**:

- **Divergence #1** (inverted window accepted) — **FIXED**. The ordering rule is now enforced here too, via the
  shared `utils/reportDateRange.validateReportDateRange` helper that all eight report screens use; the submit
  is blocked before dispatch. Message: "To Date must be on or after From Date." (the new app's own wording —
  a deliberate re-grounding, see the archetype entry).
- **Divergence #2** (mistyped date silently dropped) — **CLOSED as accepted**: the Carbon DatePicker discards
  unparseable text before it reaches the screen, so no bad date can reach the report; reporting an error would
  mean changing a component 39 files depend on.
- Detail, rationale and the closing evidence:
  [`../uc-rpt-010-scaler-register/defects.md`](../uc-rpt-010-scaler-register/defects.md) #1 and #2.
- **Status: CLOSED** (no ticket needed).
---

## Coverage gaps

### #1 — Role-gated Reports menu is not automatable

- **What's missing.** The legacy role-gated-menu slice needs a user **without** the report permission.
- **Why.** The new app recognizes a single authority (`SCS_SYS_ADMIN`) and mock auth grants it to every session;
  gating is at the route level (`ProtectedRoute`), not the menu. Same blocker across every RPT UC.
- **Status: OPEN** (test author, once finer-grained roles land — the mock auth is single-role).

---

## Environment blockers — **RESOLVED 2026-08-11**

Jasper report generation used to return HTTP 500 on the running stack, so no report rendered end-to-end. The
local report engine now works and this report was verified rendering for real — see
[`../uc-rpt-010-scaler-register/defects.md`](../uc-rpt-010-scaler-register/defects.md) **#3** (closed) for the
detail, and **#4** for the render-time/concurrency limits that replaced it as the live constraint.
**Status: CLOSED** (environment; no ticket needed). Generation is now covered by this UC's
`generation.feature`.

---

## Verified — not a defect

### The date controls are named for the domain but the payload fields are generic

The controls are `from-scale-date` / `to-scale-date` (every sibling report screen uses `from-date` / `to-date`)
while the request body still carries `fromDate` / `toDate`. Checked because a name mismatch across a boundary is
a common wiring bug — here the mapping is correct and deliberate (the label "From Scale Date" is the domain term
for this report). `report.feature` asserts the control ids and the payload fields together, so a future
mis-wiring would fail. Not a defect.
