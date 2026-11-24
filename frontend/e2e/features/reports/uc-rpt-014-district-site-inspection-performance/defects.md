# Defects — UC-RPT-014 Generate District Site Inspection Performance Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

**No bugs or divergences found on this screen.** Like its twin (UC-RPT-013) it validates its date window as the
legacy spec requires — required From/To, ordering, and the one-year cap — all covered green in `report.feature`.

Two coverage gaps and the suite-wide environment blocker.

---

## Coverage gaps

### #1 — Role-gated Reports menu is not automatable

- **What's missing.** The legacy role-gated-menu slice needs a user **without** the report permission.
- **Why.** The new app recognizes a single authority (`SCS_SYS_ADMIN`) and mock auth grants it to every session;
  gating is at the route level (`ProtectedRoute`), not the menu. Same blocker across every RPT UC.
- **Status: OPEN** (test author, once finer-grained roles land — the mock auth is single-role).

### #2 — Three arms are asserted on the twin screen but not here

- **What's missing.** Reset-clears-parameters, errors-clear-on-correction, and the **exactly one year** boundary
  case are covered on UC-RPT-013 (District Check Scale Performance) but not on this screen.
- **Why (and the trade-off, stated openly).** The two screens are clones, so this UC deliberately re-asserts the
  three *enforced* date rules locally — that is the duplication that earns its keep, because the validation logic
  is duplicated in source and could drift. The three arms above exercise the *same* duplicated logic, so adding
  them here would raise the cost of the clone without adding a distinct failure mode. **The residual risk is real
  but narrow:** if someone changed only this screen's `onReset` or only its change-mode clearing, this UC would
  not catch it. That risk is why this is logged as an OPEN gap rather than closed as "covered by UC-RPT-013" — the
  sibling Scale Site Register screen turned out to have exactly a Reset defect (UC-RPT-011 Bug #1), which is
  evidence that Reset does drift per-screen in this codebase.
- **How to close it.** Copy the three scenarios from
  `../uc-rpt-013-district-check-scale-performance/date-validation.feature` and `report.feature`, retargeted at
  this screen. Low effort; worth doing given the UC-RPT-011 precedent.
- **Status: OPEN** (test author).

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

### The duplicated date-validation logic was factored out — **RESOLVED 2026-08-11**

`DistrictSiteInspectionPerformance` and `DistrictCheckScalePerformance` used to contain byte-for-byte
equivalent `validateDates` implementations plus duplicated `rangeError` useMemos — a maintenance risk (a fix
applied to one and not the other), which is why both UCs asserted the rules independently instead of one
pointing at the other.

That duplication is **gone**: both screens now call the shared
`frontend/src/utils/reportDateRange.validateReportDateRange`, which was introduced to give the six report
screens that had NO date validation the same ordering rule (see
[`../uc-rpt-010-scaler-register/defects.md`](../uc-rpt-010-scaler-register/defects.md) #1). One implementation
now serves all eight report screens, and it has its own unit tests (`utils/reportDateRange.unit.test.ts`).

**The duplicate E2E coverage is deliberately KEPT even so.** Both UCs still assert the date rules on their own
screen, because each screen still passes its own options to the shared helper and renders its own fields — a
screen that stopped calling the helper, or called it without `required`/`maxYears`, would break silently and
only a per-screen assertion would notice. What changed is the *reason*: it is no longer guarding against two
copies drifting, it is guarding each screen's wiring to the one copy.
