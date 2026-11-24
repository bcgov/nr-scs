# Defects — UC-INS-003 Record Compliance/Enforcement Issue on Inspection

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

**Bug / Regression:** _none observed._ (But see the scope question below — a whole legacy feature area is
absent; whether that's a bug or an intended descope is a BA/QA call.)

**Divergences:** _none_ — there is no new-app behaviour to compare against the legacy compliance/enforcement
spec, so nothing is asserted RED. The absence is logged as a coverage gap + a scope question instead.

**Coverage gaps (not tested yet — no app problem to reproduce):**

- **#1 — Compliance/enforcement issue capture (S01–S04, S06) has no new-app equivalent.**
  - **Why not:** the legacy "record a compliance or enforcement issue against an inspected method" was a
    set of `siteInspectionDto.complianceIssue.*` / `enforcementIssue.*` fields on the inspection **edit**
    screen, validated by `SiteInspectionComplianceIssueValidator` / `SiteInspectionEnforcementIssueValidator`
    and persisted via the CIMS save. The new app has **none of it**: the edit/update path
    (`ScaleSiteInspectionUpdateRequest`, `pages/Edit/ScaleSiteInspection`) exposes only the header fields
    + question responses and *"intentionally contains only the legacy edit-mode writable inspection
    fields."* A full source sweep found no compliance/enforcement DTO field, validator, service,
    repository, endpoint, or UI control; the shared-schema `INSPECTION_COMPLIANCE` / `COMPLIANCE_*` /
    `ENFORCEMENT_*` tables are never referenced by SCS. So S01/S02 (record), S03/S04 (compliance/enforcement
    field + CIMS-client validation), and S06 (CIMS save error) have nothing to exercise.
  - **The nearest surviving concept is NOT equivalent:** per-question **follow-up** fields (Required? /
    Action / Due Date / Complete?) are a different thing (a follow-up action on a question answer), not a
    compliance/enforcement issue (warning/violation tickets, offence #, client #). Do not conflate them.
  - **Future action:** none until the feature is (re)built; if it is, author a full UC-INS-003 suite then.
  - **Status:** OPEN. Found 2026-07-16. (No scenario authored — the feature does not exist.)

- **#2 — The inspection EDIT flow (header + question responses) is untested — no legacy UC to re-ground.**
  - **Why not:** the new app has a working edit page + PUT `/scale-sites/inspection/{id}` that updates
    `inspectionDate` / `inspector` / `siteOperatorPresentInd` / `comments` and the question responses
    (with the follow-up cross-field validation — legacy S05 / ERR-014/015). The only legacy INS UC that
    reaches the edit screen is UC-INS-003, and it does so to capture compliance/enforcement (not built),
    so this edit-of-header/questions capability has no legacy Gherkin to re-ground onto. The create arm
    of the follow-up validation is already covered by UC-INS-001 `validation @S07`.
  - **Future action:** author a dedicated app-only "Edit Inspection" suite (update header + question
    responses + edit-side follow-up validation + read-back), independent of the compliance/enforcement UC.
  - **Status:** OPEN. Found 2026-07-16. (No scenario authored — app-only capability, deferred.)

- **#3 — Can't test the CE Technician restricted menu (S08 / STA-001).**
  - **Why not:** legacy `MenuUtils.getCeTechnicianMenus()` rendered a role-filtered Struts menu (Queries /
    Reports / Handheld Management only). The new React shell has no equivalent role-filtered menu, and
    mock auth grants only the single `SCS_SYS_ADMIN` role, so the CE-Technician menu state can't be
    produced (same limit as UC-INS-001/002 role gaps).
  - **Future action:** revisit once finer-grained roles + nav-visibility exist; cover as a component test.
  - **Status:** OPEN. Found 2026-07-16. (No scenario authored — the state is not reproducible.)

**Spec gaps (the Gherkin is missing scenarios its own docs list):** _none._ The S01–S08 `.feature` set,
`-slices.md`, and `-detailed.md` were reconciled against the new app; every slice maps to a disposition
in `coverage.md`. Nothing was silently dropped.

**Verified — not a defect (confirmed, so nobody re-investigates):**

- **The compliance/enforcement absence was confirmed deliberate in the API contract.**
  `ScaleSiteInspectionUpdateRequest.yaml` explicitly documents that the update payload *intentionally*
  carries only the writable header fields + question responses. Combined with the zero-hit source sweep,
  this is a scoped-out feature, not an accidental omission in one layer. (Verified 2026-07-16.)

**⚑ Scope question for BA/QA (needs a product decision, not a test):**

- Legacy SCS let a **CE Technician** record compliance/enforcement findings (warning/violation tickets,
  offence #, client #, action descriptions) against an inspection. The new app has **no** such capability
  in any layer. Is this an **intended descope** (like HND/TCR/Waste-RSK) or a **missing requirement**?
  It is not listed in either the "to be built" (RSK/PRF) or the "descoped" lists in the project plan. Please
  confirm scope so this either closes as WONT-BUILD or opens a build story (which would then get a full
  UC-INS-003 E2E suite). Raised 2026-07-16.
