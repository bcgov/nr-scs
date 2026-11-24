# Coverage — SEC-9 / `SCS_OWNER` role scoping

**Source of truth for every row:** the roles & permissions matrix §3 column `OWN`
(the permission matrix) and §4 (the plain-language role summary). Enforcers:
`RolePermissions.scaleSiteOwner()` + `@RequiresPermission` (backend), `permissions.ts` + `ProtectedRoute`
+ `navigation.ts` (frontend), `ClientScopeInterceptor` / `ClientScopeGuard` (client scoping). How to read
this file: [`coverage-guide.md`](../../../coverage-guide.md).

> **This ledger is shaped by role, not by use case.** Every other `coverage.md` in the suite reconciles one
> screen's use case; this one reconciles one **role's column of the matrix** across every screen. The rows
> are therefore matrix cells, and the citation is the matrix section rather than a `-slices.md` line.

> **Read alongside the industry-scaler ledger.** `SCS_OWNER` is the mirror image of
> `SCS_INDUSTRY_SCALER`: this role lives on the **scale-site** record and holds `SCALE_SITE_QUERY`, while
> that one lives on the **scaler** record and reaches a site only through its own authorizations. Several
> rows below exist purely to pin that inversion, and are marked *(inversion)*.

**Run state (2026-08-20):** `npm test -- --grep "@OWN"`. Both client-scoping rules were replaced this day
after PR review — **site scope → the sites my client owns, and nothing else; scaler scope → the scalers
authorized at those sites, and nothing else** — and the scaler search was bound to the same population as
the record rule, which is why the Scalers query page's client field is no longer locked for this role.

Three consequences for whoever runs this next:
1. **A backend built after that change is required.** Against an older WAR the scaler scenarios fail on the
   detail read — see `defects.md` Divergence #2.
2. **`IB60` is no longer readable by this owner** and is asserted refused. The role-gating suites therefore
   read `4313` with an authorization seeded per scenario; see `permissionProbeScalerLicenceNo`.
3. Also rewritten as a consequence: the scaler half of the server-side-override pair, which no longer has
   an override to assert.

No `@discovered-divergence` scenarios remain open.

---

## 1. The three levels, and why all three exist

| Level | Question it answers | What a gap here means | Feature file |
|---|---|---|---|
| **GUI** | Does the app *offer* the action? | A user is walked into a 403 (or shown a control that does nothing). A usability failure. | `gui-access.feature` |
| **URL** | Can the route be *entered by address bar*? | A bookmark, an emailed link, or a remembered path reaches a screen the role must not see. Hiding the menu entry did not contain it. | `url-access.feature` |
| **API** | Does the *server* refuse the call? | The permission model is decoration. Anyone can issue the request by hand. A security failure. | `api-access.feature` |

**Client scoping** (`client-scoping.feature`) is a second, orthogonal axis — not *what* the role may do but
*whose rows* it may see — asserted on all three of the same levels with paired allow/restrict examples.

The URL matrix was **derived, not hand-written**: every `path:` in `routePaths.tsx` was matched to its
`ProtectedRoute permission=` and classified against `SCALE_SITE_OWNER_PERMISSIONS` — **9 permission-gated
routes resolve** for this role, 49 are refused, 5 carry no permission. The feature file exercises all 9
plus `/welcome`, so the allowed set is complete; the refused set samples every area. Two of the nine
(`/scalers/summary`, `/scale-site-authorizations`) have no side-nav entry pointing at them, so the URL
level is the only place they can be caught regressing.

---

## 2. Matrix — role gating

| Source item (matrix cell) | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| SCS Home Page — `R` | §3.A | `routePaths.tsx` `/welcome` (no permission) | url-access `@p0` outline | covered | — |
| Work Bench — `-` | §3.A | `WORKBENCH_QUERY` withheld | url-access `@p0` (`/workbench`); api-access `@p0` (both work benches) | covered | — |
| Queries – Clients (+ Results `R (ltd)`) | §3.B | `CLIENT_QUERY` | gui-access `@p0` (nav); url-access `@p0`; api-access `@p0` | covered | — |
| Queries – Scalers (+ Results) — `R (ltd)` | §3.C | `SCALER_QUERY` | gui-access `@p0` (nav); url-access `@p0`; api-access `@p0`; client-scoping `@p0` (locked filter) | covered | — |
| Scaler – Create — `-` | §3.C | `SCALER_CREATE` withheld | url-access `@p0` (`/scalers/create`) | covered | — |
| Scaler Record – Summary — `R (ltd)` | §3.C | `SCALER_READ` | gui-access `@p0` (tab list); api-access `@p0` | covered | — |
| Scaler Record – Summary – Edit — `-` | §3.C | `SCALER_UPDATE` withheld | api-access `@p0` (write outline) | covered | — |
| **Scaler Record – Address — `-` in §3, granted per §4** | §3.C vs §4 | `SCALER_ADDRESS_READ` granted (decision 1) | gui-access `@p0` (tab present); api-access `@p0` | covered | Spec gap #1 |
| **Scaler Record – Exams / Upgrades — `-` in §3, granted per §4** | §3.C vs §4 | `SCALER_EXAM_QUERY` granted (decision 1) | gui-access `@p0` (tab present); api-access `@p0` | covered | Spec gap #1 |
| Scaler Record – Authorizations — `-` *(inversion)* | §3.C | `SCALER_AUTHORIZATION_QUERY` withheld | gui-access `@p0` (tab hidden); api-access `@p0` | covered | — |
| Scaler Record – Check Scales — `-` *(inversion)* | §3.C | `SCALER_CHECK_SCALE_QUERY` withheld | gui-access `@p0`; api-access `@p0` (detail + summary) | covered | — |
| Scaler Record – Appointments — `-` | §3.C | `SCALER_APPOINTMENT_QUERY` withheld | gui-access `@p0`; api-access `@p0` | covered | — |
| Scaler Record – Performance Remarks — `-` | §3.C | `SCALER_PERFORMANCE_REMARK_QUERY` withheld | gui-access `@p0`; api-access `@p0` | covered | — |
| Scaler Authorization (single) — `-` | §3.E | `SCALER_AUTHORIZATION_READ` withheld | url-access `@p0` (`/scaler-authorizations/view/…`) | covered | — |
| **Queries – Scale Sites — `R`** *(inversion)* | §3.D | `SCALE_SITE_QUERY` granted | gui-access `@p0` (nav); url-access `@p0` + its own scenario; api-access `@p0`; client-scoping `@p0` | covered | — |
| Queries – Scale Sites – Results — `R (ltd)` | §3.D | `ScaleSiteService.searchScaleSites` owner override | client-scoping `@p0` (exactly the 5 owned sites) | covered | — |
| Scale Site – Create — `-` | §3.D | `SCALE_SITE_CREATE` withheld | gui-access `@p0` (no Create control); url-access `@p0` | covered | — |
| Scale Site Record – Summary — `R (ltd)` | §3.D | `SCALE_SITE_READ` + `SCALE_SITE_SUMMARY_READ` | gui-access `@p0` (tab); url-access `@p0`; api-access `@p0` | covered | — |
| Scale Site Record – Summary – Edit — `-` | §3.D | `SCALE_SITE_UPDATE` withheld | gui-access `@p0` (no `Edit Record`) | covered | — |
| Scale Site Record – Contacts — `R (ltd)`, no CRUD | §3.D | `SCALE_SITE_CONTACT_QUERY` only | gui-access `@p0` (tab, list renders, **no Actions column**, no Add); api-access `@p0` | covered | — |
| Scale Site Contact (single) — `R (ltd)` | §3.D | `SCALE_SITE_CONTACT_READ` | api-access `@p0` (`/contacts/2497`) | covered | — |
| Scale Site Contact – Create / Edit — `-` | §3.D | `_CREATE`/`_UPDATE` withheld | gui-access `@p0` (Add + row Edit absent); api-access `@p0` (bodyless DELETE) | covered | — |
| Scale Site Record – Activity Summary — `R (ltd)` | §3.D | `SCALE_SITE_ACTIVITY_READ` | gui-access `@p0` (tab); api-access `@p0` | covered | — |
| Scale Site Record – Site Authorizations — `R (ltd)`, no `C` | §3.D | `SCALE_SITE_AUTHORIZATION_QUERY`; `_CREATE` withheld | gui-access `@p0` (tab + no Add); api-access `@p0` | covered | — |
| Scale Site Authorization (single) — `R (ltd)` | §3.E | `SCALE_SITE_AUTHORIZATION_READ` | url-access `@p0` (`/view/239313`); api-access `@p0` | covered | — |
| Scale Site Authorization – Create/Edit — `-` | §3.E | `_CREATE`/`_UPDATE`/`_DELETE` withheld | url-access `@p0` (create + edit); api-access `@p0` (bodyless DELETE) | covered | — |
| Scale Site Record – Authorized Scalers — `R (ltd)`, no `C` | §3.D | `SCALE_SITE_AUTHORIZED_SCALER_QUERY` | gui-access `@p0` (tab + no Add); api-access `@p0` | covered | — |
| Scale Site Record – MSD — `R (ltd)` | §3.D | `SCALE_SITE_MSD_QUERY` | gui-access `@p0` (tab + no Add); api-access `@p0` | covered | — |
| **Standalone Mark / Site Designations — `-` throughout** | §3.F | `MSD_QUERY` / `MSD_READ` withheld | gui-access `@p0` (no nav leaf); url-access `@p0` (3 routes); api-access `@p0` | covered | — |
| Scale Site Record – Inspections — `R (ltd)`, no `C` | §3.D | `SCALE_SITE_INSPECTION_QUERY` | gui-access `@p0` (tab + no Add); api-access `@p0` | covered | — |
| Site Inspection (single) — `R (ltd)`, no `U` | §3.H | `SCALE_SITE_INSPECTION_READ`; `_UPDATE` withheld | url-access `@p0` (view allowed, edit + create refused); api-access `@p0` | covered | — |
| Scale Site Record – Check Scales — `R (ltd)` | §3.D | `SCALE_SITE_CHECK_SCALE_QUERY` | gui-access `@p0` (tab + no Add); api-access `@p0` | covered | — |
| Check Scale (standalone, all rows) — `-` | §3.I | `CHECK_SCALE_*` withheld | url-access `@p0` (view + create); api-access `@p0` | covered | — |
| Scale Site Record – Software Use — `R (ltd)` | §3.D | `SCALE_SITE_SOFTWARE_QUERY` | gui-access `@p0` (tab); api-access `@p0` | covered | — |
| Scale Site Record – Risk Rating tab — `R (ltd)` | §3.1 (client, 2026-09-02) — **overrides §3.D's `-`** | `SCALE_SITE_RISK_RATING_QUERY` | gui-access `@p1` (tab offered); api-access `@p0` (rating tab allowed) | covered | — |
| Scale-site risk assessment — `R (ltd)`, **from the record only** | §3.1 (narrowed 2026-09-03) | `_ASSESSMENT_READ`; **no `_ASSESSMENT_QUERY`** | url-access `@p0` (register **refused**, while `/scale-sites` stays reachable); api-access `@p0` (search 403) | covered | — |
| Scaler risk assessment — `-` | §3.1 — the scaler subject is `IND`'s | withheld | url-access `@p0` (register refused); api-access `@p0` (search + rating tab 403) | covered | — |
| The `(ltd)` on the rows above — cross-client refusal | §3.1 | `ClientScopeGuard` in `ScaleSiteRiskAssessmentService` + own-client search override | **not here** — proven in `cross-cutting-record-scope` | covered elsewhere | — |
| Reference-data maintenance — all `-` | §3.J | every `MAINTAIN_*` withheld | gui-access `@p0` (no Administration menu); url-access `@p0` (5 routes); api-access `@p0` (7 endpoints) | covered | — |
| Reports — not in §3 for `OWN` | §3 (absent) + `REPORT_READ` javadoc | `REPORT_READ` withheld | gui-access `@p0` (no Reports menu); url-access `@p0` | covered | — |
| Every write cell — `-` | §3 (all sections) | no `_CREATE`/`_UPDATE`/`_DELETE` held | api-access `@p0` (6 bodyless mutations, each 403 + admin reaches handler) | covered | Divergence #1 |
| Client-scoped role held with no forest client grants nothing | `Roles.isClientScoped` + `expandAuthorities` | `hasWelcomeAccess` / `RolePermissions` | url-access `@p1`; api-access `@p1` | covered | — |
| §4 "Apply for scaler / scale site authorizations" | §4 OWN prose | **not built** — legacy issued printed forms, never SCS writes | — | not-applicable | Spec gap #2 |

## 3. Matrix — client scoping

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Scale site search results limited to owned sites | §3.D `R (ltd)` | `ScaleSiteService.searchScaleSites` owner override | client-scoping `@p0` (exactly the 5 owned, the other client's absent) | covered | — |
| Owner-client filter cannot be widened | SEC-7 AC 7 | `pages/Queries/ScaleSites` `clientReadOnly` | client-scoping `@p0`; contrast `@p1` (admin free) | covered | — |
| Own scale site record readable | §4 "their scale sites" | `ClientScopeInterceptor` allows | client-scoping `@p0` (URL + API) | covered | — |
| Another client's scale site refused | SEC-7 AC 4 | `ClientScopeGuard.assertScaleSiteInScope` deny branch | client-scoping `@p0` (URL card + API 403) | covered | — |
| **Site scope is owner-only — the authorized-at branch is NOT this role's** | §4 + `assertScaleSiteInScope` per-role split | owner takes the ownership branch only | client-scoping `@p0` (one scenario each URL + API: refused → seed → still refused; API adds an industry scaler of the same client admitted on the same live row) | covered | — |
| **Scaler scope is authorized-at-a-site-I-own, and nothing else** | §4 bullet 1 + §1 legend + `assertScalerInScope` | the bridge is the whole rule — association with the caller's client is not access | client-scoping `@p0` (URL + API: refused → seed → admitted; API also asserts the detail read, which carries a second service-level guard) | covered | — |
| **Scaler search bound to the same population as the record rule** | §3.C `(ltd)` + §4 bullet 1 | `ScalerService.searchScalers` filters on `ClientScopeGuard.scalerLicencesAtOwnedSites`; client field NOT locked for this role | client-scoping `@p0` (free filter; the authorized scaler listed, the own-client scaler and a third party's both absent) | covered | — |
| Another client's scaler refused when not authorized at an owned site | SEC-7 AC 4 | `ClientScopeGuard.assertScalerInScope` → 403 | client-scoping `@p0` (URL + API, on an anchor no scenario ever seeds) | covered | — |
| **The client's own scaler refused when not authorized at an owned site** | §4 bullet 1 read strictly | association with the caller's client is not a grant — a deliberate narrowing of legacy `SecurityUtils.hasScalerAccess` | client-scoping `@p0` (URL + API, on `IB60`, which holds no in-force authorization anywhere) | covered | Spec gap #3 |
| 403 before 404 for a scoped caller | `ClientScopeInterceptor` javadoc | interceptor runs before the handler | client-scoping `@p1` (owner 403) + `@p1` (admin 404 contrast) | covered | — |
| Multi-client owner (active-client switcher) | `ActiveClientResolver` | `X-Active-Client` header | — | deferred | Coverage gap #1 |
| Legacy blanked the Inspections / MSD tabs for a non-owned site | legacy `ScaleSiteInspectionsAction:62`, `ScaleSiteMSDAction:43` | not ported | — | deferred | Coverage gap #2 |

---

## 4. Footer notes

**Status values:** `covered` · `covered (parity)` · `deferred` · `not-applicable`.

**Symmetry check.** Every deny assertion is paired with the same assertion run as `SCS_SYS_ADMIN`, so no
refusal can pass because a screen, control, selector or endpoint was broken or renamed:

| Deny assertion lives in | Its contrast lives in |
|---|---|
| gui-access — hidden nav groups | *An administrator is offered the menus…* `@p1` |
| gui-access — hidden site-record write controls | *An administrator is offered the "<control>" control…* `@p1` |
| ~~gui-access — Risk Rating tab hidden~~ | retired 2026-09-02: the tab is now **offered**, so it needs no administrator contrast |
| gui-access — scaler tabs withheld | *An administrator is offered the scaler tabs the owner is not* `@p1` |
| gui-access — no Actions column on Contacts | *An administrator gets the contacts Actions column…* `@p1` |
| gui-access — no Create Scale Site | *An administrator is offered Create Scale Site…* `@p1` |
| url-access — 23 refused routes | *An administrator reaches <route>…* `@p1` (4-route sample) |
| api-access — 21 refused GETs | *<endpoint> works for a role that holds the permission* `@p1` (5-endpoint sample) |
| api-access — 6 refused mutations | same scenario asserts the administrator is **not** refused (reaches the handler) |
| client-scoping — every restriction | paired by **anchor**: an entitled record beside an unentitled one, so "refused" cannot be the screen refusing everything |

**Sampling is deliberate** — exhaustive on the deny matrix, representative (4–5 items) on the contrast.
The contrast exists to prove the screens work at all, and does not need to be exhaustive to do that.

**Not asserted here, on purpose.** This suite asserts *reachability*, never payloads or screen behaviour:
what a screen does once open is owned by that screen's own UC suite. The exceptions are the locked client
filters and the Contacts Actions column, which are scoping/gating controls rather than screen content.

**The write coverage is shaped by a finding, not a preference.** See `defects.md` Divergence #1: a write
carrying a `@RequestBody` never reaches method security, so only bodyless mutations can demonstrate a write
denial. That is why the write rows are DELETEs and workbench-removes rather than the `POST /api/scalers`
shape the industry-scaler suite uses.
