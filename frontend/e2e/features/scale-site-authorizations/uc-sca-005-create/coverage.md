# Coverage — UC-SCA-005 Create Scale Site Authorization

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `create.feature` + `validation.feature` + `UC-SCA-005-slices.md` (10 slices S01–S10) +
`UC-SCA-005-technical.md`, against the new-app write path (`pages/Create/ScaleSiteAuthorization` +
`components/Form/AuthorizationConditionsSection` client-side; `ScaleSiteAuthorizationService.validateCreateRequest`
server-side; `POST /api/scale-site-authorizations`; read-back `GET /api/scale-site-authorizations/{id}`).

**Re-grounding:** the legacy Gherkin targets a two-PAGE Struts flow (`.createScaleSiteAuthorization` P060/P061);
the new React screen is a single route `/scale-site-authorizations/create` with a two-STEP reveal (basics →
"Add Conditions" → "Save Record"). Messages are the new app's copy. Data pinned in
`fixtures/sca/sca-test-data.ts` (site 520, condition 462, absent site 9999), ground-truthed 2026-08-19
(probe create → 201, delete → 204).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy — create authorization (S01) | slices.md S01 | `POST /api/scale-site-authorizations`; read-back `GET .../{id}` | create.feature `@S01 @p0` | covered | — |
| Happy — create with a condition (S01/S10 add) | slices.md S01/S06 | condition add → payload `conditions[]` | create.feature `@S01 @p1` | covered | — |
| Reset clears the form (S02) | slices.md S02 | create page `Reset` | validation.feature `@S02` | covered | — |
| Back to page 1 from conditions (S03) | slices.md S03 | new app: in-place two-step reveal, not a page-1/page-2 nav | — | not-applicable | new-app single-route flow; no retained-page-values step |
| Back to list without saving (S04) | slices.md S04 | `Back` = `navigate(-1)` | — | deferred | CG#1 (nav-only, low value) |
| Required — Scale Site # (ERR-001) | slices.md S05 | `validateBasics` required | validation.feature `@S05` | covered | — |
| Required — Effective Date (ERR-003) | slices.md S05 | `validateBasics` required | validation.feature `@S05` | covered | — |
| Required — Expiry Date (ERR-005) | slices.md S05 | `validateBasics` required | validation.feature `@S05` | covered | — |
| Required — Expected Annual Scale Volume (ERR-007) | slices.md S05 | `validateBasics` required | validation.feature `@S05` | covered | — |
| Date order — expiry before effective (both arms reject) | new-app client rule | `validateBasics` `exp <= eff` | validation.feature `@S05` outline row `before` | covered | — |
| Date order — expiry EQUALS effective (client rejects, server allows) | new-app client rule | `validateBasics` `exp <= eff` | validation.feature `@S05` outline row `equal to` | covered | client stricter than server — defects.md Divergence #1; this is the only case the two rules disagree, now explicitly asserted (was previously untested) |
| Volume non-numeric / negative | new-app client rule | `validateBasics` number / `>= 0` | validation.feature `@S05` | covered | — |
| Condition # non-numeric (ERR-010) | slices.md S06 | `AuthorizationConditionsSection` add guard | validation.feature `@S06` | covered | — |
| Condition # not found (ERR-011) | slices.md S06 | condition search → not-found | validation.feature `@S06` | covered | — |
| Duplicate condition (ERR-012) | slices.md S06 | add-guard dedupe | — | deferred | CG#2 (low value) |
| Template required (ERR-013) | slices.md S10 | Apply button DISABLED until a template is selected | — | not-applicable | CG#3 — guard unreachable (button disabled) |
| Apply template populates conditions (S10) | slices.md S10 | `getTemplateConditions` → add | — | deferred | CG#4 (happy template-apply; low value) |
| Mandatory condition cannot be removed (ERR-014, S09) | slices.md S09 | remove-guard `ministryStandardInd` | — | deferred | CG#5 — no mandatory SIA condition in the extract to trigger it |
| Final save server validation — scale site not found (S07) | slices.md S07 | server `validateScaleSiteExists` → HTTP 400 | validation.feature `@S07` | covered | — |
| Final save server validation — window exceeds max length (SALM) | server rule (system setting SALM, years) | `validateMaxAuthorizationLength` → HTTP 400 "…cannot exceed N years." | validation.feature `@S07` (window-exceeding scenario) | covered | rule was previously absent from every gap list; client does NOT enforce it, so the POST fires and the server rejects; scenario uses a ~100-year window + substring assert to stay value-independent; confirmed green 2026-08-21 (server 400s on create with the "cannot exceed" message) |
| Unauthorized — Add Authorization hidden / URL blocked (S08) | slices.md S08 | server `@RequiresPermission`; no per-element UI gate | — | blocked | CG#6 (mock auth) |

**Symmetry check:** the two client validators are both covered — "Add Conditions" (basics: required ×4,
date-order, volume numeric/non-negative) and the conditions-section add (non-numeric, not-found). The
create happy path is covered both minimal and with a condition. The server arm (S07) proves the create is
**rejected server-side with a 400** — the error is shown and the user stays on the form. Non-persistence is
*inferred* from the 400 (the existence check precedes the insert), not asserted by a read-back: a create that
never succeeds returns no id to GET, and the fixture auto-capture only registers a 2xx create's id for teardown.

**SALM (max authorization length):** the happy-path window is pinned to ~180 days — well inside the server's
`validateMaxAuthorizationLength` cap — so a future SALM reduction can't silently 400 every create. The cap
itself is now exercised by the window-exceeding `@S07` scenario (a ~100-year window, matched on the "cannot
exceed" message substring so it holds for any SALM value). The exact live SALM should be pinned on the next
probe (see the fixture comment); it was provably > ~1.1 years at the 2026-08-19 ground-truthing.

**Role / permission coverage:** blocked by mock auth — the harness grants only `SCS_SYS_ADMIN` and the new
app has no per-element permission model, so S08 (Add Authorization hidden / notAuthorized) cannot be
exercised. Endpoint enforcement IS present (`@RequiresPermission(SCALE_SITE_AUTHORIZATION_CREATE)`); treat
S08 as **waived**. See Coverage gap #6.

**Status values:** `covered` · `not-applicable` · `deferred` (see Coverage gaps) · `blocked` (env/auth).
