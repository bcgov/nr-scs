# Defects — UC-RPT-015 Generate Scaling Administration Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

No bugs or divergences are unique to this screen. One coverage gap and the suite-wide environment blocker.

---

## Divergences

### Date-window validation is missing on this screen too — single repro on the archetype

An inverted From/To window is accepted and a mistyped date is silently discarded. Same omission as five
sibling report screens, reproduced **once** on the archetype rather than as six identical reds:

- **Divergence #1** (inverted window accepted) and **Divergence #2** (mistyped date silently dropped) →
  [`../uc-rpt-010-scaler-register/defects.md`](../uc-rpt-010-scaler-register/defects.md), reproduced by
  `../uc-rpt-010-scaler-register/date-validation-divergence.feature`.
- A fix must be applied to `pages/Reports/ScalingAdministration/index.tsx` as well as the archetype.
- **Status: OPEN** (tracked in the archetype entry; no separate ticket needed).

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

### This endpoint is the suite-wide Jasper probe

`POST /api/reports/scaling-administration` is the endpoint used to re-confirm the Jasper blocker (it is the
simplest body to hand-craft: `{"regDist":"ALL","outputFormat":"PDF","preview":true}`). Its 500 is the
same environment blocker as every other report endpoint — not something specific to this report. Recorded so a
reader who finds this endpoint named in probe notes does not treat it as a uniquely broken report.

