# Defects — UC-RPT-013 Generate District Check Scale Performance Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

**No bugs or divergences found on this screen.** It is one of only two report screens that validate their date
window, and all four rules behave as the legacy spec requires (required From/To, ordering, one-year cap,
errors clearing on correction) — all covered green in `date-validation.feature`.

One coverage gap and the suite-wide environment blocker.

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

### The same date rules are enforced twice (client and backend)

`ReportService.fetchDistrictPerformanceResponse` throws HTTP 400 for a null request, missing dates,
from-after-to, and a range over one year — the same four rules the screen enforces client-side. This looked like
a redundancy worth questioning; it is correct defence-in-depth (the endpoint is callable directly, not only from
this screen). The consequence for testing is that the backend branches are **unreachable from the browser**, so
they are covered in `ReportServiceTest` rather than here — a deliberate layer split, not a coverage miss.

### Cross-field date messages render once, on the To Date field

An invalid window shows its message in the To Date field's `invalidText` and nowhere else:
`validateReportDateRange` mirrors its cross-field `rangeError` onto `toError`, and the screen renders only
that. Checked because a cross-field rule with no form-level banner can look like a missing message; it is
deliberate — attaching it to the input associates it via `aria-describedby`, and an earlier version of these
screens *did* print a separate `role="alert"` paragraph, which showed the same sentence twice on the page.
`date-validation.feature` asserts it through the same field step as the required messages. Not a defect.

> **Corrected 2026-08-17.** This entry previously claimed the message rendered **twice** (field + banner) and
> that the suite asserted both. That was stale: the banner is gone, and the assertion that targeted it
> (`p[role="alert"]`) matched nothing, so three scenarios here were red while the docs called them covered.
> The only `role="alert"` paragraph left under the Reports tab is `ReportOutputOptions`' email error.

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
