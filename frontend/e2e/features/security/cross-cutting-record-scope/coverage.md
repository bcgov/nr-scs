# Coverage — the cross-cutting client-scope seam (SEC-11)

**Spec:** `roles-permissions.md` §1 (the `(ltd)` legend) and §4's per-role prose, as implemented by
`ClientScopeInterceptor` + `ClientScopeGuard`.

**This ledger's axis is an enforcement mechanism, not a role and not a screen.** Rows below are
*endpoints* and the guard that covers each, so the citation is a source location rather than a matrix
cell or a `-slices.md` line. That is the third axis this suite family has used, and it exists because the
property under test belongs to no single role: it is a property of how an endpoint is addressed.

## Why this suite exists

Client scoping has two enforcement paths, and only one of them is automatic:

| Path | Where | Covers | Can it be forgotten? |
|---|---|---|---|
| Path-variable interceptor | `ClientScopeInterceptor.preHandle` | Every endpoint whose URL carries `scalerLicenceNo` or `scaleSiteIdNmbr` — ~34 today, plus every one added later | **No.** Keyed on the URL template, so a new endpoint opts in by existing |
| Hand-called guard | four services calling `ClientScopeGuard` | Endpoints addressed by any *other* id | **Yes.** Nothing about the URL shape says a guard is needed |

The role suites cannot catch a dropped hand-guard. Each of them tests one column of the permission
matrix; a missing scope guard is invisible there, because the role still holds the permission and the
call still returns 200 — just with somebody else's record in it.

## Why one level, not three

The other SEC suites assert GUI, URL and API because *offering*, *routing* and *enforcing* fail
independently. A record fetched by id has one enforcement point — the server — and the screens that
reach these records are already swept by the two external role suites. A GUI level here would repeat
`industry-scaler-role` and `scale-site-owner-role` rather than add anything. The data-scoping pairing
discipline is kept in full: every row has an entitled anchor and an unentitled one.

## The seam — endpoints addressed by a non-scoped id

| Endpoint | Id variable | Guard | In-scope anchor | Out-of-scope anchor | Verdict |
|---|---|---|---|---|---|
| `GET /scaler-authorizations/{id}` | `scalerAuthorizationId` | `ScalerAuthorizationService:157` → `assertRecordScalerInScope` | `147851` (→ `001B` → `00048273`) | `143648` (→ `653D` → `00027212`) | ✅ |
| `GET /scale-site-authorizations/{id}` | `scaleSiteAuthorizationId` | `ScaleSiteAuthorizationService:159` → `assertRecordSiteInScope` | `239313` (→ site `019V`) | `237889` (→ site `561` → `00001402`) | ✅ |
| `GET /scale-sites/inspection/{id}` | `inspectionId` | `ScaleSiteInspectionService:105` → `assertRecordSiteInScope` | `400091` | `400043` (→ site `561`) | ✅ |
| `GET /mark-site-designations/{id}` | `authorizationId` | *(none — no client axis exists)* | — | `1101` | SG-1 |
| `GET /scale-site-risk-assessments/{id}` | `riskQuestionnaireId` | `ClientScopeGuard.assertRecordSiteInScope`, in `ScaleSiteRiskAssessmentService` | ✅ | `1822` (site `614`), **refused** | ✅ V1 closed |

Each allow/deny pair is joined by a third scenario reading the **refused** record as an unrestricted
administrator. Without it a 403 is unreadable — a dead record refuses everyone equally.

**Anchor drift is guarded in preflight.** Every row above asserts a *relationship* between an id and a
forest client, not just that an id resolves — so a re-extract breaks it in a way no status code
explains: the scenario gets 200 where it expected 403, and reads as a security regression.
`preflight/anchors.setup.ts` → *"SEC-11 cross-cutting scope anchors resolve"* asserts those
relationships directly (each authorization's owning client, each inspection's site, the risk
assessment's site, and that the latent-seam site belongs to a **third** client), so a shifted anchor
fails once, up front, with a re-ground pointer. It is also what makes
`fixtures/security/cross-cutting-test-data.ts` load-bearing rather than a comment — the feature files
carry the same ids as literals, and preflight is what keeps the two honest.

## The invariants

| Invariant | Why it belongs to no role | Where asserted | Verdict |
|---|---|---|---|
| Scoping follows **client-restriction, not role** — `preHandle` branches on `isClientRestricted()` and never reads the role | Proving it needs a caller that is scoped but *not* permission-limited: an administrator carrying a client header. No role suite can produce that identity | `scope-invariants.feature`, first two outlines + the owner-side pair | ✅ |
| **No existence oracle** — a scoped caller gets 403 for an id that exists nowhere; an internal caller gets 404 | It is a property of the guard's ordering (scope lookup precedes the handler), identical for every scoped caller | `scope-invariants.feature`, last four outlines — asserted on the path-keyed *and* by-other-id endpoints | ✅ |

The role-independence invariant is the load-bearing one: it is what makes enabling a twelfth role safe
by default. Were scoping keyed on the two external role names instead, a new external role would arrive
unscoped, silently, and every existing role suite would still pass.

## Symmetry check — where each denial's contrast lives

| Denial | Its contrast |
|---|---|
| Out-of-scope record refused (3 endpoints) | The same id read by an unrestricted administrator, one scenario each |
| Administrator + client header refused | The identical role and id with the header removed |
| Nonexistent id → 403 | The identical id → 404 for an unrestricted administrator |
| Owner-side site refused (`561`) | The owner-side site admitted (`019V`), same caller, same endpoint shape |

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| ~~CG-0~~ | ~~Which client a MULTI-client external user acts as~~ — **CLOSED 2026-09-04** | Both external role suites logged this (each as "the multi-client external user is not covered") and neither could close it, because `ActiveClientResolver` is role-blind. Now `active-client.feature` in this folder: default selection (lowest-numbered, sorted), an entitled switch, a **403** for an unentitled one paired against an entitled one in the same scenario, the internal user's header being ignored in both directions, and the single-client regression guard. Observable through `GET /api/welcome`'s `userOrganization`, which names the client that won |
| CG-1 | Org-unit scoping of designations — the axis MSD actually has | see the private security findings log |
| CG-2 | Cross-record leakage *within* an in-scope parent — e.g. `/scale-sites/019V/contacts/{id}` with a contact belonging to another site | Not probeable from the extract: `SCALE_SITE_CONTACT` holds **2 rows**, both on `019V`. Needs a seed patch with a `CLIENT_CONTACT` parent |
| CG-3 | Write verbs across the seam (`PUT`/`DELETE` on inspections) | Neither external role holds a write permission, so a refusal would be the permission gate, not the scope guard — vacuous for this suite's axis. Belongs to a role suite |
| CG-4 | Risk-assessment **list** endpoints (`/scalers/{id}/risk-assessments`, `/scale-sites/{id}/risk-assessments`) | They answer 500 for **every** caller in this build, so no assertion on them can distinguish a scope decision. The by-id reads work and **are** covered — see `defects.md` V1 |

## Spec gaps

### SG-1 — moved to the team's private security findings log
