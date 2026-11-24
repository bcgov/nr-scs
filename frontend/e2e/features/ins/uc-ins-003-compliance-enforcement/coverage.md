# Coverage — UC-INS-003 Record Compliance/Enforcement Issue on Inspection

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

**Outcome: no executable scenarios.** UC-INS-003's core — capturing a **compliance** or **enforcement
issue** against an inspection — **has no equivalent in the new SCS app**. This folder therefore holds
only this `coverage.md` + a `defects.md`; there are no `.feature`/step files, because the feature the
Gherkin describes was not built. Verified by source sweep + DB + running-endpoint probe on 2026-07-16.

Sources reconciled: `gherkin/UC-INS-003-S01..S08.feature` + `UC-INS-003-slices.md` + `UC-INS-003-detailed.md`
(ERR-001..015 / STA-001..005 catalog), against the new app's inspection edit/update path:
`pages/Edit/ScaleSiteInspection/index.tsx`, `components/Form/ScaleSiteInspectionDetails` / `…Questions`,
`services/scaleSiteInspections.service.ts` (PUT `/scale-sites/inspection/{id}`),
`openapi/schemas/ScaleSiteInspectionUpdateRequest.yaml`, and backend `InspectionValidator` /
`ScaleSiteInspectionService`.

## Why there's no equivalent (evidence)

- **No writable compliance/enforcement fields.** `ScaleSiteInspectionUpdateRequest.yaml` states it
  *"intentionally contains only the legacy edit-mode writable inspection fields and the submitted
  question responses"* and exposes only `inspectionDate`, `inspector`, `siteOperatorPresentInd`,
  `comments`, `questionResponses`. The Edit page's form values match exactly — no `complianceIssue.*` /
  `enforcementIssue.*` fields (grep of `pages/Edit/ScaleSiteInspection` = 0 hits).
- **No entity / validator / endpoint.** A full `nr-scs` main-source search for
  `compliance|enforcement|violationTicket|warningTicket|offenceNumber|clientLocationCode|deliveryMethod`
  returns only boilerplate (LICENSE/README/AGENTS/CODE_OF_CONDUCT), an unrelated `ScalerService` comment,
  and OpenAPI examples where `"Compliance"` is a sample *inspection-type description* (not an issue
  field). There is no `SiteInspectionComplianceIssue*` / `…EnforcementIssue*` domain, DTO, validator,
  service, repository, or route — the legacy `SiteInspectionComplianceIssueValidator` /
  `SiteInspectionEnforcementIssueValidator` have no counterpart.
- **DB tables exist but are unused by SCS.** The shared NR Oracle schema has `INSPECTION_COMPLIANCE`,
  `COMPLIANCE_*`, `ENFORCEMENT_*` tables, but the new SCS backend never references them (0 hits in
  main source). Presence in the shared schema ≠ the SCS app using them.

## Slice-by-slice disposition

| Slice | Legacy intent | Disposition | Where / why |
|---|---|---|---|
| S01 Record compliance issue (happy path) | write `complianceIssue.*` on edit + save | **not-applicable (not built)** | no compliance fields/entity/endpoint — Coverage gap #1 |
| S02 Record enforcement issue | write `enforcementIssue.*` on edit + save | **not-applicable (not built)** | no enforcement fields/entity/endpoint — Coverage gap #1 |
| S03 Compliance field max-length validation (ERR-003..006) | server length checks on compliance fields | **not-applicable (not built)** | the fields don't exist to validate — Coverage gap #1 |
| S04 Enforcement client not found in CIMS (ERR-011..013) | `ClientBo.validateClient()` on enforcement client # | **not-applicable (not built)** | no enforcement client field / CIMS client check — Coverage gap #1 |
| S05 Follow-up fields inconsistent (ERR-014/015) | cross-field follow-up validation on question rows | **covered elsewhere (re-ground)** | the new app DOES enforce this (`InspectionValidator.validateFollowUpFields`); the create arm is covered by **UC-INS-001 `validation @S07`**; the edit arm is now covered by **`inspection-edit` `validation @S07 @p1`** (authored 2026-09-09) |
| S06 CIMS API error during save (ERR-002) | `CIMSException` → error banner | **not-applicable (re-ground)** | no CIMS save wrapper for compliance/enforcement; generic API-error surfacing differs — Coverage gap #1 |
| S07 Inspection not found (ERR-001) | `NullCimsRecordException` → back to list w/ error | **covered elsewhere (re-ground)** | same not-found behaviour proven by **UC-INS-002 `not-found @S02`** ("Could not load inspection") |
| S08 CE Technician menu restricted (STA-001) | `getCeTechnicianMenus()` → 3 menus only | **blocked** | mock auth grants only `SCS_SYS_ADMIN`; no Struts role menu — Coverage gap #3 |

## App-only capability noticed (not in the legacy INS UC set)

The new app **does** have an inspection **edit** flow (`/scale-sites/:id/inspections/edit/:id`, PUT
`/scale-sites/inspection/{id}`) that updates the header (`inspectionDate` / `inspector` /
`siteOperatorPresentInd` / `comments`) and question responses. The only legacy INS UC that reaches the
edit screen is UC-INS-003, and it does so purely to capture compliance/enforcement — which wasn't built.
So the edit-of-header/questions is a real capability with **no legacy UC to re-ground against**
(Coverage gap #2).

> **Update (2026-09-09): that suite is now authored** — [`../inspection-edit/`](../inspection-edit/)
> (13 scenarios: happy-path update + API read-back, the Edit Record entry hop, Back/Reset abandon paths,
> six client-validation rules, and the three unavailable-record branches). It is app-only, so it carries
> no `-slices.md` chain; its inventory is reconciled against the app's own write path in
> [`../inspection-edit/coverage.md`](../inspection-edit/coverage.md). This closes the authoring action
> this section raised; **S05's edit arm** (the follow-up cross-field rule on the edit screen), previously
> "app-only (Coverage gap #2)", is now covered there by `validation @S07 @p1`.

**Status values:** `not-applicable (not built)` · `covered elsewhere (re-ground)` · `blocked`. **No
scenarios authored** — the compliance/enforcement feature does not exist to exercise. See `defects.md`
for the gap register and the **scope question flagged to BA/QA** (is dropping compliance/enforcement
capture an intended descope or a missing requirement?).
