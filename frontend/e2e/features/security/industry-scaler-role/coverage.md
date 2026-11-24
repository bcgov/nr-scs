# Coverage — SEC-8 / `SCS_INDUSTRY_SCALER` role scoping

**Source of truth for every row:** the roles & permissions matrix §3 column `IND`
(the permission matrix) and §4 (the plain-language role summary). Enforcers:
`RolePermissions.industryScaler()` + `@RequiresPermission` (backend), `permissions.ts` +
`ProtectedRoute` + `navigation.ts` (frontend), `ClientScopeInterceptor` / `ClientScopeGuard` (client
scoping). How to read this file: [`coverage-guide.md`](../../../coverage-guide.md).

> **This ledger is shaped by role, not by use case.** Every other `coverage.md` in the suite reconciles
> one screen's use case; this one reconciles one **role's column of the matrix** across every screen.
> The rows are therefore matrix cells, and the citation is the matrix section rather than a `-slices.md`
> line.

---

## 1. The three levels, and why all three exist

The role is asserted at three independent levels. They are not redundant — each can pass while another
fails, and the failure modes are different in kind:

| Level | Question it answers | What a gap here means | Feature file |
|---|---|---|---|
| **GUI** | Does the app *offer* the action? | A user is walked into a 403 (or shown a control that does nothing). A usability failure. | `gui-access.feature` |
| **URL** | Can the route be *entered by address bar*? | A bookmark, an emailed link, or a remembered path reaches a screen the role must not see. Hiding the menu entry did not contain it. | `url-access.feature` |
| **API** | Does the *server* refuse the call? | The permission model is decoration. Anyone can issue the request by hand. A security failure. | `api-access.feature` |

**Client scoping** (`client-scoping.feature`) is a second, orthogonal axis — not *what* the role may do
but *whose rows* it may see — and is asserted on all three of the same levels, each with a paired
allow/restrict example.

---

## 2. Matrix — role gating

| Source item (matrix cell) | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| SCS Home Page — `R` | §3.A | `routePaths.tsx` `/welcome` (no permission) | url-access `@p0` outline | covered | — |
| Work Bench — `-` | §3.A | `WORKBENCH_QUERY` withheld | url-access `@p0` outline (`/workbench`); api-access `@p0` outline | covered | — |
| Queries – Clients (+ Results) — `R (ltd)` | §3.B | `CLIENT_QUERY` | gui-access `@p0`; url-access `@p0`; api-access `@p0` | covered | — |
| Queries – Scalers (+ Results) — `R (ltd)` | §3.C | `SCALER_QUERY` | gui-access `@p0`; url-access `@p0`; api-access `@p0` | covered | — |
| Scaler – Create — `-` | §3.C | `SCALER_CREATE` withheld | url-access `@p0` outline (`/scalers/create`); api-access `@p0` outline (`POST /api/scalers`) | covered | — |
| Scaler Record – Summary — `R (ltd)` | §3.C | `SCALER_READ` | gui-access `@p0` (tab list); api-access `@p0` | covered | — |
| Scaler Record – Summary – Edit — `-` | §3.C | `SCALER_UPDATE` withheld | gui-access `@p0` outline (no `Edit Record`); api-access `@p0` outline (`PUT`) | covered | — |
| Scaler Record – Address — `R (ltd)` | §3.C | `SCALER_ADDRESS_READ` | gui-access `@p0` (tab); api-access `@p0` | covered | — |
| Scaler Record – Authorizations — `R (ltd)`, no `C` | §3.C | `SCALER_AUTHORIZATION_QUERY` granted; `_CREATE` withheld | gui-access `@p0` (tab + no `Add Authorization`); api-access `@p0` (list allowed, `POST` refused) | covered | — |
| Scaler Authorization (single) — `R (ltd)` | §3.E | `SCALER_AUTHORIZATION_READ` | api-access `@p0` (`/api/scaler-authorizations/147851`) | covered | — |
| Scaler Record – Check Scales — `R (ltd)` | §3.C | `SCALER_CHECK_SCALE_QUERY` | gui-access `@p0` (tab + no `Add Check Scale`); api-access `@p0` | covered | — |
| Scaler Record – Exams / Upgrades — `R (ltd)` | §3.C | `SCALER_EXAM_QUERY` granted; `_CREATE/_UPDATE` withheld | gui-access `@p0` (tab + no `Add Exam / Upgrade`); api-access `@p0` | covered | — |
| Scaler Record – Appointments — `R (ltd)` | §3.C | `SCALER_APPOINTMENT_QUERY` only | gui-access `@p0` (tab + no `Add Appointment`); api-access `@p0` | covered | — |
| Scaler Record – Performance Remarks — `R (ltd)` | §3.C | `SCALER_PERFORMANCE_REMARK_QUERY` only | gui-access `@p0` (tab + no `Add Performance Remark`); api-access `@p0` | covered | — |
| Queries – Scale Sites — `-` | §3.D | `SCALE_SITE_QUERY` withheld | gui-access `@p0` (no nav entry); url-access `@p0`; api-access `@p0` | covered | — |
| Scale Site Record – Summary — `-` | §3.D | `SCALE_SITE_SUMMARY_READ` withheld | api-access `@p0` (`/scale-sites/520/summary` refused) | covered | — |
| Scale Site Record (openable) — implied by §4 | §3.D note in `RolePermissions.industryScaler()` | `SCALE_SITE_READ` granted | client-scoping `@p0` (entitled site opens) | covered | — |
| Scale Site Record – Check Scales — `R` | §3.D | `SCALE_SITE_CHECK_SCALE_QUERY` | client-scoping `@p0` (site record loads) | covered (parity) | Coverage gap #1 |
| Scale Site Record – Software Use — `R` | §3.D | `SCALE_SITE_SOFTWARE_QUERY` | — | deferred | Coverage gap #1 |
| Query – Mark Site Designations (+ Results) — `R` | §3.F | `MSD_QUERY` | gui-access `@p0`; url-access `@p0`; api-access `@p0` | covered | — |
| Mark Site Designation (single) — `R` | §3.F | `MSD_READ` | — | deferred | Coverage gap #2 |
| Mark Site Designation – Create/Edit — `-` | §3.F | `MSD_CREATE`/`MSD_UPDATE` withheld | url-access `@p0` outline (`/mark-site-designations/create`) | covered | — |
| Site Inspections — all `-` | §3.H | `SCALE_SITE_INSPECTION_*` withheld | api-access `@p0` (site sub-resources refused) | covered | — |
| Check Scales — all `-` | §3.I | `CHECK_SCALE_*` withheld | url-access `@p0`; api-access `@p0` | covered | — |
| Reference-data maintenance — all `-` | §3.J | every `MAINTAIN_*` withheld | gui-access `@p0` (no Administration menu); url-access `@p0` (5 routes); api-access `@p0` (7 endpoints) | covered | — |
| Reports — not in §3 for `IND` | §3 (absent) + `navigation.ts` | `REPORT_READ` withheld | gui-access `@p0` (no Reports menu); url-access `@p0`; api-access — | covered | — |
| Scaler risk assessment — `R (ltd)`, **from the record only** | §3.1 (client, 2026-09-02; narrowed 2026-09-03) | `SCALER_RISK_RATING_QUERY` + `_ASSESSMENT_READ`; **no `_ASSESSMENT_QUERY`** | gui-access `@p1` (Risk Rating tab offered); url-access `@p0` (`/scaler-risk-assessments` **refused**); api-access `@p0` (rating tab allowed, search 403) | covered | — |
| Scale-site risk assessment — `-` | §3.1 — the site subject is `OWN`'s | withheld | url-access `@p0` (register refused); api-access `@p0` (search + rating tab 403) | covered | — |
| The `(ltd)` on the rows above — cross-client refusal | §3.1 | `ClientScopeGuard` in `ScalerRiskAssessmentService` + own-client search override | **not here** — proven in `cross-cutting-record-scope` | covered elsewhere | — |
| Client-scoped role held with no forest client grants nothing | `Roles.isClientScoped` + `expandAuthorities` | `hasWelcomeAccess` / `RolePermissions` | url-access `@p1`; api-access `@p1` | covered | — |
| §4 "Apply for exams / authorizations / appointments" | §4 IND prose | **not built** — legacy issued printed forms, never SCS writes (recorded in `RolePermissions.industryScaler()`) | — | not-applicable | Spec gap #1 |

## 3. Matrix — client scoping

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Scaler search results limited to own client | §3 `(ltd)` + SEC-7 AC 3 | `ScalerService.searchScalers` override | client-scoping `@p0` (GUI: locked filter + own-client-only results) | covered | — |
| Search filter cannot be widened | SEC-7 AC 7 | `pages/Queries/Scalers` `clientReadOnly` | client-scoping `@p0`; contrast `@p1` (admin free) | covered | — |
| Own scaler record readable | §4 "their own record" | `ClientScopeInterceptor` allows | client-scoping `@p0` (URL + API) | covered | — |
| Another client's scaler record refused | SEC-7 AC 4 | `ClientScopeGuard.assertScalerInScope` → 403 | client-scoping `@p0` (URL card + API 403) | covered | — |
| Scale site the client is authorized at is readable | §4 "scale sites they are authorized to scale at" | `ClientScopeGuard.assertScaleSiteInScope` (authorization branch) | client-scoping `@p0` (URL + API, self-seeded entitlement) | covered | — |
| Scale site the client is not authorized at refused | same | same, deny branch | client-scoping `@p0` (URL + API) | covered | — |
| Client search NOT scoped server-side, but filter locked in UI | SEC-7 AC 3/7 deviation | `pages/Queries/Client` `clientReadOnly` (added 2026-08-17) | — | deferred | Spec gap #2 |
| Multi-client user (active-client switcher) | `ActiveClientResolver` | `X-Active-Client` header | — | deferred | Coverage gap #3 |

---

## 4. Footer notes

**Status values:** `covered` · `covered (parity)` · `deferred` · `not-applicable`.

**Symmetry check.** Every deny assertion in this suite is paired with the same assertion run as
`SCS_SYS_ADMIN`, so no refusal can pass because a screen, control, selector, or endpoint was simply
broken or renamed. The pairing is explicit in `gui-access.feature` (contrast outlines),
`url-access.feature` (administrator-reaches outline) and `api-access.feature` (baseline outline). Client
scoping is paired differently but for the same reason: an entitled anchor beside an unentitled one, so
"refused" cannot be the screen refusing everything.

**Role / permission coverage — this suite closes a standing gap.** Every other `coverage.md` in this
suite carries rows marked `blocked` with the reason *"mock auth grants only `SCS_SYS_ADMIN`, so
wrong-role denial cannot be produced"*. That is no longer true: the role model shipped, and
`pages/security/RoleSessionPage` seeds any role + forest client before the app boots. **Those `blocked` rows
are now unblocked and should be revisited** — see `defects.md` Coverage gap #4.

**Not asserted here, on purpose.** This suite asserts *reachability*, never payloads or screen
behaviour: what a screen does once open is owned by that screen's own UC suite, and duplicating it here
would create a second copy to drift. The one exception is the locked client filter, which is a scoping
control rather than screen content.
