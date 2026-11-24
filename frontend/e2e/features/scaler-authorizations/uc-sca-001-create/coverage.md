# Coverage — UC-SCA-001 Create Scaler Authorization

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCA-001-S01..S08.feature` + `UC-SCA-001-slices.md` (control/message matrix)
against the new app's write path (`pages/Create/ScalerAuthorization/index.tsx` client `validateBasics`/`validate`;
`ScalerAuthorizationService.validateCreateRequest`; POST `/api/scaler-authorizations`). Single-page two-step
reveal: basics → **Add Conditions** (client `validateBasics`, no POST) → advanced (Job Functions / SFP /
Scale Sites / Conditions) → **Save Record** (POST → navigate `/scaler-authorizations/view/{id}`).

**Data:** licence `8437` (real scaler), Reg/Dist `1831`, job function "Piece Scale" (P), scale site `520`,
absent site `99999999`,
pinned in `fixtures/sca/sca-test-data.ts` (ground-truthed 2026-08-05: POST → 201; DELETE → 204). Happy paths
create + read back via the API and clean up via `DELETE /api/scaler-authorizations/{id}` (createdScalerAuthIds).
`@mode:serial` on the happy-path creates (shared licence/dates/Reg-Dist differing only by District Wide).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 happy create → view (District Wide=Y) | S01; slices.md | `onSaveRecord` → POST → read-back | create.feature `@S01 @p0` | covered | — |
| S01 create District Wide=N + ≥1 scale site | S01/S07 | POST incl. `scaleSites` | create.feature `@S01 @p0` (site 520, read-back incl. site) | covered | — |
| S07 District Wide=Y hides Scale Sites panel | S07 | `ScaleSitesSection` returns null when `districtWideInd==='Y'` | validation.feature `@S07 @p1` | covered | — |
| S02 ERR-001 Licence # required | S02; ERR-001 | `validateBasics` L155 | validation.feature `@S02 @p1` (`Licence # is required`) | covered | wording re-grounded (no period) |
| S02 ERR-002 Reg/Dist required | S02; ERR-002 | `validateBasics` | validation.feature `@S02 @p1` (`Reg / Dist is required.`) | covered | — |
| S02 ERR-003 District Wide required | S02; ERR-003 | `validateBasics` | validation.feature `@S02 @p1` | covered | — |
| S02 ERR-004 Effective Date required | S02; ERR-004 | `validateBasics` | validation.feature `@S02 @p1` | covered | — |
| S02 ERR-005 Expiry Date required | S02; ERR-005 | `validateBasics` | validation.feature `@S02 @p1` | covered | — |
| Expiry must be after Effective | S02 (date rule) | `validateBasics` date check | validation.feature `@S02 @p1` (`Expiry Date must be after Effective Date.`) | covered | — |
| ≥1 Job Function (business rule) | S01 body | `validate` L115 | validation.feature `@S01 @p1` | covered | — |
| ≥1 Scale Site when District Wide=N | S01 body | `validate` L118 | validation.feature `@S01 @p1` | covered | — |
| SFP required when "Special Forest Product" job fn ('S') | S01 body | `validate` L123-126 | validation.feature `@S01 @p1` | covered | — |
| S08 create with no conditions (optional) | S08 | conditions optional | covered by create.feature `@S01` (no conditions added) | covered | — |
| S02 ERR-006/007 date FORMAT (yyyyMMdd) | S02; ERR-006/007 | (none — DateInput/API take typed dates) | — | not-applicable | legacy free-text-only mechanic |
| S03 ERR-012a scale site not found (add-by-number) | S03 | `onAddScaleSite` L225-233 (site search → `Scale site {id} was not found.`) | validation.feature `@S03 @p1` (absent site `99999999`) | covered | wording differs from MSD's ("Scale site N…" vs "Site N…") |
| S03 ERR-012b scale site outside the authorization's district | S03 | (none — no site-within-district check in `validateCreateRequest`) | — | not-applicable | defects.md Coverage gap #2 (legacy validation not ported) |
| S06 ERR-011 save throws SCSException | S06 | server error path | — | deferred | defects.md Coverage gap #3 (not deterministically triggerable) |
| S05 ERR-013 not authorized (`scalerAuthorizationCreate`) | S05 | `@IsScsEditor` (endpoint) | — | blocked | defects.md Coverage gap #1 (mock auth) |

**Symmetry check:** District Wide Y (S01 no-site) / N (S01 + site) — both arms covered. Required-field matrix
(licence/dates/reg-dist/district-wide) + date order all covered. The three business rules (job-function /
scale-site / SFP) all covered. The two validators are exercised on both arms: `validateBasics` via Add
Conditions (required + date order), `validate` via Save (business rules). Conditions section positive flow
is the shared `AuthorizationConditionsSection` (classCode `SCA`), already covered once for the component via
UC-MSD-001 `conditions.feature` — not re-litigated per host.

**Role / permission coverage:** blocked by single-role mock auth (`SCS_SYS_ADMIN` only; every authenticated
user passes `@IsScsEditor`, so the S05 not-authorized branch is unreachable). District-scope hiding
(`userHasAccessToDistrict`) has no new-app equivalent (org-unit scoping deferred).

**Coverage gate (over coverage-eligible items, excluding `not-applicable`/`blocked`/`deferred`):** S01
(both arms) + S07 + S02 (5 required + date order) + the 3 business rules + the S03 site not-found guard —
all covered. **P0 100% · P1 100%.** Excluded: S05 (mock auth), S03 site-within-district + date-format (not
ported), S06 (non-deterministic) — handed off as Coverage gaps.

**Status values:** `covered` · `not-applicable` (legacy-only / not ported) · `deferred` · `blocked` (env/auth).
No divergence red — the create behaves as the re-grounded expectations (all green).
