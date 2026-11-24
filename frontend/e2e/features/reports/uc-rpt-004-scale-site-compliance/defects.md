# Defects — UC-RPT-004 Generate Scale Site Compliance Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

**No bugs or divergences found on this screen.** It has no date parameters, so it is unaffected by the
date-validation divergence that hits the six other parameter screens, and its Reset correctly preserves the routed
inspection context.

Two coverage gaps and the suite-wide environment blocker.

---

## Coverage gaps

### #1 — Role-gated Reports menu is not automatable

- **What's missing.** The legacy role-gated-menu slice needs a user **without** the report permission.
- **Why.** The new app recognizes a single authority (`SCS_SYS_ADMIN`) and mock auth grants it to every session;
  gating is at the route level (`ProtectedRoute`), not the menu. Same blocker across every RPT UC.
- **Status: OPEN** (test author, once finer-grained roles land — the mock auth is single-role).

### #2 — The in-context launch (inspection screen → compliance report) is not covered

- **What's missing.** This is the only report reached **in context** rather than from the Reports tab, so "does the
  link on the site-inspection screen carry the right inspection id?" is a real behaviour. The scenarios here
  navigate to `/reports/scale-site-compliance/{id}` directly and therefore cannot catch a broken or wrongly-wired
  launch link.
- **Why deferred.** The link's origin belongs to the INS (site inspection) screens, whose suites live in
  `features/ins/`; asserting it here would mean this UC driving another UC's screen. It is a genuine hole either
  way, not a non-issue.
- **How to close it.** Add a scenario that opens a real inspection view (INS fixtures already pin site 520 and its
  inspections) and clicks through to the compliance report, then asserts the resulting route id — either here or
  in the INS suite, whichever the BA prefers as the owner.
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

### Reset does not clear the inspection

Every other report screen's Reset clears all of its parameters; this one leaves the inspection in place. That is
correct and intentional — the inspection is not a parameter, it is the route (`useParams`), and the screen's own
comment says so ("the inspection context is carried by the route and preserved"). `report.feature` asserts it
explicitly by re-submitting after a Reset and checking the id is still sent. Not a defect.

### The invalid-id guard hides the whole form rather than disabling Send

A non-numeric route id renders an error notification **instead of** the parameter form, so there is no disabled
Send button to find. Checked because "no form at all" can look like a routing failure; it is a deliberate early
return in `ScaleSiteCompliancePage` (and `payload` is `null` in that state, so no request could be built even if
Send existed). Not a defect.
