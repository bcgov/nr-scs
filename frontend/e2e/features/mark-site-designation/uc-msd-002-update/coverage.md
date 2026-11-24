# Coverage — UC-MSD-002 Update Mark Site Designation

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-MSD-002-S01..S10.feature` + `UC-MSD-002-slices.md` (control/message
matrix) + `UC-MSD-002-technical.md` (ERR-001..025 / STA-001..006 catalog), against the app's write path
(`pages/Edit/MarkSiteDesignation/index.tsx` `validateSave` client validation; `MarkSiteDesignationService.updateMarkSiteDesignation`
+ `validateUpdateCommand` server validators; PL/SQL `HAULING_MARK_AUTH_PKG` update). Update endpoint:
`PUT /api/mark-site-designations/{id}`; routes `/mark-site-designations/edit/:authorizationId` (edit) and
`…/view?haulingMarkAuthorizationId=` (post-save).

**Scope note:** every functional scenario **API-seeds its own fresh record** (mark `ES20R4`, made creatable
by `scs-real-test-data-patches/msd/msd-create-mark.sql`) then edits it — independent + self-cleaning
(removed at the DB on teardown; no DELETE endpoint). S04 (restricted mode) is asserted READ-ONLY against a
real extract record that already has a letter (`letterMarkSiteDesignationId` = 1390). Concrete values pinned
in `fixtures/msd/msd-test-data.ts`; dates today-relative via `fixtures/common/dates.ts`. Ground-truthed
against the live stack 2026-07-20. **A confirmed backend concurrency bug (letterless MSD intermittently
renders locked) is filed as defects.md Bug #1** and worked around in the edit page object (documented, not
masked).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path update of editable fields (S01) | slices.md S01 | `updateMarkSiteDesignation` + full read-back | update.feature `@S01 @p0` | covered | — |
| Effective Date required (ERR-001) | technical.md:120 | `validateSave` L129 | validation.feature `@S02` (Effective Date) | covered | — |
| Expiry Date required (ERR-002) | technical.md:121 | `validateSave` L121 | validation.feature `@S02` (Expiry Date) | covered | — |
| Reg / Dist required (ERR-003) | technical.md:122 | `validateSave` L130 | validation.feature `@S02` (Reg / Dist) | covered | — |
| District Wide required (ERR-004) | technical.md:123 | `validateSave` L131 | validation.feature `@S02` (District Wide?) | covered | — |
| Effective/Expiry format 'yyyyMMdd' (ERR-005/006) | technical.md:124-125 | (none — Carbon date picker emits YYYY-MM-DD; no free-text format check) | — | not-applicable | legacy free-text-only mechanic |
| Expiry ≥ Effective (ERR-007) | technical.md:126 | `validateSave` L134; backend `requireDateOrder` | validation.feature `@S03` | covered | — |
| Max auth period N years (ERR-008) | technical.md:127 | (none — not enforced client or server) | — | divergence | defects.md Divergence #4 (log-only) |
| Est. Volume integer (ERR-009) | technical.md:128 | `validateSave` L137 | validation.feature `@S02` (Est. Volume) | covered | — |
| Est. Truck Loads integer (ERR-010) | technical.md:129 | `validateSave` L140 | validation.feature `@S02` (Est. Truck Loads) | covered | — |
| ≥1 Scale Site when District Wide=N (ERR-011) | technical.md:130 | `validateSave` (edit — rule ported from create 2026-08-04) + backend `validateUpdateCommand`/`validateCreateCommand` (2026-08-07) | scale-site-required-divergence.feature `@S02 @ERR-011` | covered | defects.md Divergence #1 (FIXED client + server) |
| Condition # numeric guard (ERR-013) | technical.md:132 | shared `AuthorizationConditionsSection.onAddConditionById` L135 | covered via UC-MSD-001 advanced-validation.feature `@S10 @ERR-016` (same shared component) | covered | — |
| Condition # required (ERR-012) | technical.md:131 | Add disabled while `#condition-id` blank → UI-unreachable as an error | — | not-applicable | defects.md Coverage gap #1 |
| Condition duplicate (ERR-015) | technical.md:134 | shared `AuthorizationConditionsSection.onAddConditionById` — rejects with MSD's own `errors.dup_condition` wording via the `duplicateConditionMessage` prop (**FIXED 2026-09-08**) | covered via UC-MSD-001 conditions.feature `@p1 @ERR-015` (same shared component) | covered | defects.md Divergence #5 — was wrongly `not-applicable` ("silent dedup by design") |
| Condition not-found (ERR-014) | technical.md:133 | `onAddConditionById` search → "Condition N was not found." | — | deferred | defects.md Coverage gap #1 (cross-domain conditions pass) |
| Site # required (ERR-016) | technical.md:135 | `onAddScaleSite` — message now displays at add time (submit gate lifted **2026-09-08**) | — | not-applicable | Add is reachable with a blank field, but the guard returns before any lookup; asserted indirectly by the ERR-017/015 scenarios sharing the same ungated display |
| Scale Site not found (ERR-017) — rejection | technical.md:136 | `onAddScaleSite` (site not appended) | validation.feature `@S09 @ERR-017` | covered | — |
| Scale Site not found (ERR-017) — message surface | technical.md:136 | displays at add time; `invalid` no longer gated behind `submitAttempted` (**FIXED 2026-09-08**) | validation.feature `@S09 @ERR-017` | covered | defects.md Divergence #2 — CLOSED |
| Scale Site duplicate — already added | UC-MSD-002 §198 (`MarkSiteAssembler.addScaleSite`); legacy `scaleSiteAuthorization.duplicateScaleSite` | `onAddScaleSite` rejects a site already in the list instead of silently returning `prev` (**FIXED 2026-09-08**) | validation.feature `@S09 @ERR-015` | covered | defects.md Divergence #5 |
| Template required (ERR-018) guard | technical.md:137 | Apply disabled without a template selection → UI-unreachable | — | not-applicable | defects.md Coverage gap #3 (positive apply still deferred) |
| Field max-length (ERR-019/020/021/022) | technical.md:138-141 | `validateSave` → shared `utils/markSiteDesignationLengths.ts` (legacy `errors.maxlength` wording, per-field `invalid`); mirrored server-side in `MarkSiteDesignationService` (**FIXED 2026-09-18**) | validation.feature `@S02 @ERR-019 @ERR-020 @ERR-021 @ERR-022` | covered | defects.md Divergence #4 — length half CLOSED; ERR-009 max-period still open |
| Timber Mark not found on save (ERR-023) | technical.md:142 | Timber Mark is read-only on edit — cannot change → unreachable | — | not-applicable | legacy race-only path (per slices.md exclusion) |
| No record found on open (ERR-024) | technical.md:143 | edit page load → 404 → load-error notification | validation.feature `@ERR-024` | covered | — |
| Not authorized (ERR-025 / STA-003 gate) | technical.md:144 | `@IsScsEditor` (backend) + Edit-Record button gate | — | blocked | defects.md Coverage gap #2 (mock auth) |
| Restricted edit when letter exists (STA-002, S04) | slices.md S04; technical.md:115 | `Edit/…index.tsx` `locked`; backend expiry-only path | restricted-edit.feature `@S04 @STA-002` | covered | — |
| Reset to last-saved (S05) | slices.md S05 | `Edit/…index.tsx` `resetForm` (client) | update.feature `@S05` | covered | — |
| Add scale site during update (S06) | slices.md S06 | `onAddScaleSite` + read-back child row | update.feature `@S06` | covered | — |
| District Wide N→Y clears sites (S10) | slices.md S10; STA-006 | `district-wide onChange` `setScaleSites([])` + save | update.feature `@S10` | covered | — |
| District Wide=Y "sites will be deleted" warning (STA-006) | technical.md:119 | (none — sites cleared silently, no confirm alert) | — | divergence | defects.md Divergence #3 (log-only) |
| Species content guards on edit (required / content-required / content-integer) | slices.md control matrix | `Edit/…index.tsx` `addSpeciesRow` L180-185 (ungated display) | validation.feature `@S02` (edit enforces species content guards) | covered | — |
| Species duplicate / invalid-species guards on edit | slices.md control matrix | Species `<Select>` filters added + offers only valid → UI-unreachable | — | not-applicable | defensive-only (mirror of create) |

**Symmetry check:** create/update mirror — required fields + date order both covered on update; **ERR-011
was the broken arm** (create enforced the ≥1-site rule, edit did not) → **FIXED 2026-08-04** by porting the
rule to the edit `validateSave` (Divergence #1 now a normal passing test; optional backend hardening noted). District Wide Y↔N both exercised (S06 add-under-N, S10 N→Y clear).
Restricted (letter) vs normal edit modes both covered (S04 vs S01). Scale-site guards: not-found rejection
covered (S09); the not-found/required *messages* are a divergence (Divergence #2). Field-length + max-period
(the create/edit-shared validation gaps) logged (Divergence #4), not dropped. Species content guards now
covered on edit (mirror of create); the shared `AuthorizationConditionsSection` numeric guard is covered
once in UC-MSD-001 (not re-litigated per host). The only residual conditions scope is the *positive*
template-apply/remove flow + the condition not-found message — a cross-domain shared-component pass
(Scaler/Scale-Site auth share the exact component), deferred, not dropped.

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`; the ERR-025
not-authorized / Edit-Record-hidden branch is unreachable from the browser) — see Coverage gap #2.

**Concurrency note:** `letterExists` intermittently false-positives under load, wrongly locking letterless
records (defects.md Bug #1). The functional edit scenarios recover via a fresh-login re-open (documented in
`pages/msd/MarkSiteDesignationEditPage.openForEditingUnlocked`); S04 asserts genuine letter records lock.

**Status values:** `covered` · `covered (+ spec-gap)` · `not-applicable` (legacy-only) · `deferred` (see Coverage gaps) · `blocked` (env/auth/data) · `divergence` / `bug` (a genuinely-failing `@discovered-divergence` / `@discovered-bug` test, or a log-only entry — see this UC's `defects.md`).
