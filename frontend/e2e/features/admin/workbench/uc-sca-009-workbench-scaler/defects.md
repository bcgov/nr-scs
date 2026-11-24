# Defects — UC-SCA-009 Work Bench: Expiring Scaler Authorizations

> How this log works: [`defects-guide.md`](../../../../defects-guide.md)

## Bug / Regression
_None found._

## Divergence
_None._ The re-grounded behaviour (Add=renew→navigate; Remove confirm text "…remove this record from the
list") matches the built app; no behaviour differs from the (legacy) spec beyond expected re-grounding.

## Coverage gap

### Coverage gap #1 — S05/S06 permission-gating (blocked by single-role mock auth)
- Legacy S05 (Remove/Add hidden without `workbenchScalerAuthManagement`) and S06 (direct
  management-action call denied) can't be exercised — the local mock-auth stack grants only
  `SCS_SYS_ADMIN`, so a session lacking the permission cannot be produced. Status: OPEN (`blocked`).

### Coverage gap #2 — S04 empty-state is real-data-dependent
- The "Zero records found" scenario asserts the scaler section is empty, which holds only while the real
  extract has **0** expiring scaler authorizations (true as of 2026-07-29). If a real scaler auth expiring
  within 30 days appears, this scenario would need re-grounding (e.g. assert-reflects-API instead). Status:
  OPEN (`informational`).

### Coverage gap #3 — new-app behaviours with no legacy slice (edge-case review 2026-07-29)
An adversarial edge-case pass surfaced these built-app behaviours; per "tests stay grounded in the legacy
spec," they are **not** authored (no UC-SCA-009 gherkin slice specifies them). Logged so the decision is
explicit, not silently dropped:
- **Row detail-link navigation** — the Authorization # / Scaler Licence # cells are `RouterLink`s to the
  record views. No legacy slice; not tested (the legacy S01 only enumerates the columns). Author only if a
  BA adds a slice.
- **Renew / Remove server-error banners** — the page has `onError` branches ("Renew failed.", "Remove
  failed.", the null-`newAuthorizationId` "…did not return a new authorization id.") and per-section
  load-error banners. These are new-app error handling with no legacy scenario; reachable only via
  fault-injection. Not authored.
- **"Removed from list." info banner** after a successful remove — asserted only via row-absence + API
  read-back, not the banner text (cosmetic; no legacy slice). Status: OPEN (`deferred` — out of legacy scope).

### Coverage gap #4 — UC-SCA-012 (District Manager) covered by this suite's actions
UC-SCA-012 ("Approve Authorizations at Workbench — District Manager") is a **sibling** of UC-SCA-009/010/011:
the SAME renew/remove actions scoped to a different actor. The actor distinction can't be exercised under
single-role mock auth, and the actions themselves are covered here. Status: OPEN (`blocked` — actor gate;
covered-by-sibling for the behaviour).

## Spec gap
### Spec gap #1 — S07 (menu access) is not a Work Bench action
- Legacy S07 verifies the District Scaling Manager's menu access, not a Work Bench behaviour. Out of scope
  for this suite; menu/role visibility is a SEC/navigation concern. Status: OPEN (informational).

## Verified — not a defect
- **The seeding recipe is confirmed** (2026-07-29): a scaler auth with `expiry_date` in (today, today+30]
  and `expiry_notification_ind='N'` appears in `GET /api/scaler-authorizations/workbench`; renew returns a
  new id (extended dates, so it does not re-appear); remove sets the notification flag. See the DB views
  `scs_scaler_auth_wb_vw`.
