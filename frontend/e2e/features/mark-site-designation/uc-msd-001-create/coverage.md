# Coverage — UC-MSD-001 Create Mark Site Designation

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-MSD-001-S01..S10.feature` + `UC-MSD-001-slices.md` (control/message
matrix) + `UC-MSD-001-technical.md` (ERR-001..021 catalog), against the app's write path
(`pages/Create/MarkSiteDesignation/index.tsx` client validation; `MarkSiteDesignationService`
create validators; PL/SQL `scs_hauling_mark_authorztn_pkg.insert_rec`).

**Scope note:** the create *happy path* (S01/S02) needs a creatable mark (satisfying BOTH the mark-holder
view AND `HAULING_AUTHORITY` membership) + a searchable scale site — none exist in the raw extract, so it
is **seed-backed** by `scs-real-test-data-patches/msd/msd-create-mark.sql` (mark `ES20R4` + region
`1904` → site `520` searchable; validated live → HTTP 201, DB-cleaned on teardown). The remaining slices
are **no-seed**: client-side validations (which never POST) and the mark-rejection server path (404).
Ground-truthed against the live stack 2026-07-20. Concrete values pinned in `fixtures/msd/msd-test-data.ts`
(creatable `ES20R4`/site `520`; absent mark `ZZZQ999`, absent site `99999999`; Reg/Dist `1831`); dates are
today-relative via `fixtures/common/dates.ts`.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Timber Mark required (ERR-001) | technical.md:132 | index.tsx `validateMarkSiteBasics` L112 | validation.feature `@S04` (Timber Mark) | covered | — |
| Timber Mark not found (ERR-002) — server reject | technical.md:133 | `MarkSiteDesignationService` create → 404 | mark-not-found.feature `@S03` (Save…persists nothing) | covered | — |
| Timber Mark not found (ERR-002) — lookup surface | technical.md:133 / slices S03 | index.tsx `lookupTimberMarkHolder` → banner (gate fixed to show `formError` immediately) | mark-not-found.feature `@S03` | covered | defects.md Divergence #1 (FIXED 2026-08-04) |
| Reg / Dist required (ERR-003) | technical.md:134 | `validateMarkSiteBasics` L115 | validation.feature `@S04` (Reg / Dist) | covered | — |
| Effective Date required (ERR-004) | technical.md:135 | `validateMarkSiteBasics` L113 | validation.feature `@S04` (Effective Date) | covered | — |
| Expiry Date required (ERR-005) | technical.md:136 | `validateMarkSiteBasics` L114 | validation.feature `@S04` (Expiry Date) | covered | — |
| Effective/Expiry format 'yyyyMMdd' (ERR-006/007) | technical.md:137-138 | (none — Carbon date picker emits YYYY-MM-DD; no free-text format check) | — | not-applicable | legacy free-text-only mechanic |
| Expiry ≥ Effective (ERR-008) | technical.md:139 | `validateMarkSiteBasics` L118 | validation.feature `@S05` | covered | — |
| Max auth period N years (ERR-009) | technical.md:140 | (none — not enforced server-side) | — | divergence | defects.md Divergence #3 (log-only) |
| District Wide required (ERR-010) | technical.md:141 | `validateMarkSiteBasics` L116 | validation.feature `@S04` (District Wide?) | covered | — |
| ≥1 Scale Site when District Wide=N (ERR-011) | technical.md:142 | index.tsx `validateMarkSiteSave` L137 + backend `validateCreateCommand` (server-side guard added 2026-08-07) | advanced-validation.feature `@S08` | covered | see UC-MSD-002 defects.md Divergence #1 |
| Site # required (ERR-012) | technical.md:143 | index.tsx `addScaleSiteById` L221 | advanced-validation.feature `@S06 @ERR-012` | covered | — |
| Scale Site not found (ERR-013) | technical.md:144 | index.tsx `addScaleSiteById` L232 | advanced-validation.feature `@S06` | covered | — |
| Duplicate Mark+Site (ERR-014) | technical.md:145 | `hauling_mark_site` UNIQUE key (DB) — raw exception, not friendly msg | — | divergence | defects.md Divergence #2 (log-only) |
| Condition # numeric (ERR-016) | technical.md:147 | `AuthorizationConditionsSection.onAddConditionById` L135 (shared) | advanced-validation.feature `@S10 @ERR-016` (re-grounded wording "…valid number.") | covered | — |
| Condition # required (ERR-015) | technical.md:146 | Add disabled while `#condition-id` blank → UI-unreachable | — | not-applicable | button-gated (defects.md Coverage gap #3) |
| Expiry Notification required (ERR-017, internal BO) | technical.md:148 | (none — internal, no create-screen control) | — | not-applicable | internal BO field |
| Template required (ERR-018) guard | technical.md:149 | Apply disabled without a template selection → UI-unreachable | — | not-applicable | button-gated (defects.md Coverage gap #3) |
| Est. Volume integer (ERR-019) | technical.md:150 | index.tsx `onAddConditions` L820 | validation.feature `@S04` (Est. Volume) | covered | — |
| Est. Truck Loads integer (ERR-020) | technical.md:151 | index.tsx `onAddConditions` L823 | validation.feature `@S04` (Est. Truck Loads) | covered | — |
| Field max-length, 4 free-text areas | UC-MSD-002 technical.md:138-141 (not in this UC's ERR catalog — spec gap; the legacy `HaulingMarkAuthorizationValidator.checkFieldLengths` ran on create too) | `onAddConditions` / `validateMarkSiteSave` → shared `utils/markSiteDesignationLengths.ts`; mirrored server-side in `MarkSiteDesignationService` (**FIXED 2026-09-18**) | validation.feature `@S04 @ERR-019 @ERR-020 @ERR-021 @ERR-022` (+ the at-limit boundary) | covered | UC-MSD-002 defects.md Divergence #4 |
| Not authorized (ERR-021) | technical.md:152 | `@IsScsEditor` (backend) | — | blocked | defects.md Coverage gap #2 (mock auth) |
| Species required (species-content control) | slices.md control matrix | index.tsx `addSpeciesRow` L524 | advanced-validation.feature `@S02` (species) | covered | — |
| Species content-required / integer (species control) | slices.md control matrix | index.tsx `addSpeciesRow` L525-529 | advanced-validation.feature `@S02` (no-content / non-integer) | covered | — |
| Species duplicate / valid-species (species control) | slices.md control matrix | Species `<Select>` filters added + offers only valid → UI-unreachable | — | not-applicable | defensive-only (defects.md Coverage gap #4) |
| Happy-path create, District Wide=Y (S01) | slices.md S01 | `MarkSiteDesignationService.createMarkSiteDesignation` + read-back | create.feature `@S01 @p0` | covered | seed: msd-create-mark.sql |
| Happy-path create, District Wide=N + scale site (S02) | slices.md S02 | create write path + `hauling_mark_site` child | create.feature `@S02 @p0` | covered | seed: msd-create-mark.sql |
| Apply condition template (S10) — positive flow | slices.md S10 | `AuthorizationConditionsSection.onApplyTemplate` | — | deferred | defects.md Coverage gap #3 (cross-domain conditions pass) |

**Symmetry check:** create District Wide Y (S01) / N+site (S02) — both arms covered. original/check n/a
(no such matrix on MSD create). Date pair (effective/expiry): required + order both covered. Scale-site
guards: both arms covered — not-found (ERR-013) + required (ERR-012). Species guards: required +
content-required + content-integer all covered; duplicate/valid-species are UI-unreachable (Select
filters) → not-applicable. Conditions (shared component): numeric guard (ERR-016) covered here once;
required (ERR-015) + template-required (ERR-018) button-gated → not-applicable; only the *positive*
template-apply (S10) remains deferred to the cross-domain conditions pass.

**Positive section flows (added 2026-08-04 — `positive-flows.feature`):** the create screen's interactive
sections, previously covered only on their negative arms, now have positive coverage:

| Source item | App enforcement point | Scenario (tags) | Status |
|---|---|---|---|
| Timber-mark "Update" lookup SUCCESS → mark-holder fields populate | `lookupTimberMarkHolder` → `#mark-holder-name`/`#mark-status` | `positive-flows.feature` `@S03 @p1` (ES20R4 → "MANAGEMENT ABEYANCE"/"HI") | covered |
| Species add (valid) / list / add-multiple / remove | `SpeciesContentSection` `addSpeciesRow`/`removeSpeciesRow` | `positive-flows.feature` `@p2` (AL+BA add, remove AL) | covered |
| Scale Sites add-multiple / duplicate rejected / remove | `ScaleSitesSection` `addScaleSiteById`/`onRemoveScaleSite` — a duplicate is **rejected with a message** (was a silent client de-dup until **2026-09-08**) | `positive-flows.feature` `@p2 @ERR-015` (520+525, re-add 520 → error + still 1, remove 520) | covered |

**Shared Conditions section positive flow (added 2026-08-04 — `conditions.feature`):** the positive side of
the shared `AuthorizationConditionsSection` — previously only its negative numeric guard (`@S10 @ERR-016`)
was covered — is now covered ONCE here for the whole component (embedded identically in MSD create/edit +
Scaler/Scale-Site auth):

| Source item | App enforcement point | Scenario (tags) | Status |
|---|---|---|---|
| Mandatory conditions auto-load + mandatory-remove-blocked | `loadDefaults` (ministryStandardInd Y) + `onRemoveCondition` guard (remove btn disabled) | `conditions.feature` `@p1` (185 loaded + remove disabled) | covered |
| Add a valid condition by number, then remove it | `onAddConditionById` success + `onRemoveCondition` | `conditions.feature` `@p1` (190 add/remove) | covered |
| Condition not-found (ERR-014) | `onAddConditionById` → "Condition N was not found." | `conditions.feature` `@p1 @ERR-014` (999999) | covered |
| Condition duplicate (ERR-015) | `onAddConditionById` rejects an already-listed condition; wording comes from the per-host `duplicateConditionMessage` prop, so MSD shows `errors.dup_condition` rather than the authorization default (**FIXED 2026-09-08**) | `conditions.feature` `@p1 @ERR-015` (re-add mandatory 185 — QA's repro) | covered |
| Apply a condition template (S10 positive) | `onApplyTemplate` → `getScaleAuthTemplateConditions` | `conditions.feature` `@S10 @p1` (template 443 → 190,191) | covered |
| Add a condition via the search modal | `openConditionSearch` → `ConditionSearchModal` → `handleConditionSelect` | `conditions.feature` `@p2` (194) | covered |

This **closes** the S10 `deferred` row below and Coverage gap #3 (positive apply/remove) — and satisfies
UC-MSD-002 Coverage gap #1 (ERR-014) + gap #3 (positive apply) for the shared component. This also closes
the create-side positive gaps for the lookup + Species + Scale Sites sections. The
Exceptions `ActiveMultiSelect` was previously not covered (a suspected defect — never included in the save
payload). As of 2026-09-02 it is **wired through** create/update + DTO + view — see defects.md
**Divergence #4 (now RESOLVED)** — so its persistence is now a **deferred** positive gap a `@S`
scenario can pin, not a logged no-op.

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`; the ERR-021
not-authorized branch is unreachable from the browser) — see Coverage gap #2.

**Status values:** `covered` · `covered (+ spec-gap)` · `not-applicable` (legacy-only) · `deferred` (see Coverage gaps) · `blocked` (env/auth/data) · `divergence` / `bug` (a genuinely-failing `@discovered-divergence` / `@discovered-bug` test — see this UC's `defects.md`).
