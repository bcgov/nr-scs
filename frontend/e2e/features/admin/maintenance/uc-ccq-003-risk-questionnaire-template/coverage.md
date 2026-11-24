# Coverage — UC-CCQ-003 Maintain Templates (Scale Authorization Templates)

> New to these files? See [`coverage-guide.md`](../../../../coverage-guide.md) at the e2e root for the column
> + status-flag legend.

**Outcome: authored — the page is BUILT and now has an E2E suite.** UC-CCQ-003 was previously deferred as
an "unbuilt RSK risk-questionnaire-template feature". That was a misread: the built React page at
`/maintenance/templates` (`pages/Administration/Maintenance/Templates`) maintains **Scale Authorization
Templates** — a Name + a Type (`scaleConditionClassCode`) + a Reg/Dist (`orgUnitNo`), with bound
conditions. The recovered legacy gherkin (`scaleAuthTemplateDto.scaleAuthTemplateName`,
`scaleConditionClassCode`, "bind conditions", `MaintainTemplatesAction`, `/maintainTemplates.do`, screens
`.viewTemplate`/`.createTemplate`/`.selectTemplate`) matches this page exactly. The doc *title* "Risk
Questionnaire Template" and the brief's "bundle questions" are the misnomer; the gherkin (ground truth) is
condition-binding, which is built.

> **⚑ Merge reconciliation (2026-07-28, main ← this branch) — BA/QA please confirm.** A 2026-07-27
> main-branch deep re-scan concluded UC-CCQ-003 had "no template-maintenance UI (templates are
> DB-managed)" and left it deferred/`not-applicable`. That conclusion followed the UC *title/brief* and
> correctly found that the **RSK risk-questionnaire-template** — a *different* entity that bundles
> **questions** (`risk_questionnaire_template_id`, backend `RiskQuestionnaireService` which only *consumes*
> templates read-only; the table was updated in Delivery via a DB script, not a screen) — genuinely has
> **no** maintenance screen. This suite instead covers the entity UC-CCQ-003's **gherkin** actually
> describes: the **Scale Authorization Templates** page (`/maintenance/templates`, binding **conditions**),
> which IS built and routed — the suite below runs green against it. Both facts are true about two
> different "templates"; kept the build-and-authored disposition as primary. **If UC-CCQ-003 was intended
> to mean the DB-managed risk-questionnaire-template, its title/brief should be split from this suite.**

**Re-grounding headlines** (full detail in `defects.md`):
- Required-field validation (legacy S08 ERR-001/002/003) re-grounds to **Save is disabled while a required
  field is blank** — the new app gates client-side (`isFormValid`) and never renders per-field messages.
- Legacy S09 length limit 200 → the new app caps at **100** (`@Size`), rejecting cleanly with a 400. The
  scenario asserts the app's real boundary; the 100-vs-200 gap is Divergence #1.
- Type & Reg/Dist are `<Select>`s → legacy ERR-005/ERR-006 (bad Type / bad Org Unit) are unreachable
  (Spec gap #1).

**Data:** seeds are class **MSD** (smallest class → class filter + page-size 50 puts a seeded row on one
page) at Reg/Dist **1826** (Cariboo-Chilcotin); the bind scenario uses MSD condition **#185**. Pinned in
`fixtures/admin/maintenance/template-test-data.ts` with the discovering queries.

| Source item (UC-CCQ-003) | Source citation | App enforcement point | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 — create a template (happy path) | S01; slices.md §S01 | `POST /api/scale-auth-templates` → forward to view | `create.feature` "creates a new template" @S01 @p0 | covered |
| S01 — bind conditions to a template (create) | S01 "selects condition bindings"; STA-002 | create modal conditions table (checkbox) → `conditions[]` in POST | `create.feature` "creates a template and binds a condition" @S01 @p1 | covered |
| S01 — bind a condition on the EDIT form | S01; the table also renders for `modalMode === 'edit'` | edit modal conditions table → `conditions[]` in PUT | `update.feature` "Binding a condition on the edit form persists it" @S01 @p1 | covered |
| S01 — UNBIND a condition on the edit form | S01 (mirror arm) | same table, box unticked → binding removed on PUT | `update.feature` "Unbinding a condition on the edit form removes it" @S01 @p1 | covered |
| S02 — select a template → read-only detail | S02; slices.md §S02 | list name link → view modal (`#view-template-*`) | `view.feature` @S02 @p1 | covered |
| S02 — edit a template's Name → save | S02; slices.md §S02 | `PUT /api/scale-auth-templates/{id}` → forward to view | `update.feature` @S02 @p0 | covered |
| S02 — edit a template's Reg / Dist | S02 (the field matrix's remaining editable arm) | `#tmpl-reg-dist` stays a live `<Select>` in edit mode | `update.feature` "changes a template's Reg / Dist" @S02 @p2 | covered |
| S02 — edit a template's Type | S02 | **immutable after creation** — `#tmpl-type` renders as a disabled TextInput when `modalMode === 'edit'` (`TemplatesModal.tsx:399-405`) | — | not-applicable |
| S03 — delete a template | S03; slices.md §S03 | view → ConfirmDeleteModal → `DELETE /{id}` | `delete.feature` "deletes a template" @S03 @p0 | covered |
| S03 — ...and its condition bindings cascade | S03 "+ condition bindings"; slices.md §S03 | `DELETE /{id}` must clear `SCALE_TEMPLATE_CONDITION` | `delete.feature` "also removes its condition bindings" @S03 @p1 (DB read of the join table) | covered |
| S04 — filter the list by Type | S04; slices.md §S04 | `#filter-type` → refetch by `scaleConditionClassCode` | `filter.feature` @S04 @p1 | covered |
| S04 — filter Type with no matches → empty list | S04 (2nd scenario); STA-002 | same filter | — | gap — Coverage gap #2 (**`blocked`**, reclassified 2026-09-08: the Type LOV has exactly three codes and real data populates all three) |
| S05 — Reset the create form | S05; slices.md §S05 | `resetForm()` (create branch) | `navigation.feature` "Reset clears the create form" @S05 @p2 | covered |
| S05 — Reset the edit form (restore original) | S05 (2nd scenario) | `resetForm()` (edit branch) | `navigation.feature` "Reset restores the edited template's saved name" @S05 @p2 | covered |
| S06 — Back from create (nothing persisted) | S06; slices.md §S06 | `setModalMode(null)` | `navigation.feature` "Back from the create form discards" @S06 @p2 | covered |
| S06 — Back from edit (detail unchanged) | S06 (2nd scenario) | `setModalMode(null)` | `navigation.feature` "Back from the edit form leaves the saved template unchanged" @S06 @p2 | covered |
| S08 / ERR-001 — Template Name required | S08; technical.md ERR-001 | Save disabled when `scaleAuthTemplateName` blank (`isFormValid`) | `create.feature` Outline "Template Name" @S08 @p1 | covered |
| S08 / ERR-002 — Type required | S08; technical.md ERR-002 | Save disabled when `scaleConditionClassCode` blank | `create.feature` Outline "Type" @S08 @p1 | covered |
| S08 / ERR-003 — Reg/Dist required | S08; technical.md ERR-003 | Save disabled when `orgUnitNo` blank | `create.feature` Outline "Reg / Dist" @S08 @p1 | covered |
| S09 / ERR-004 — Template Name too long | S09; technical.md ERR-004 | backend `@Size(max=100)` → 400 (NB: cap is 100, not 200) | `create.feature` "exceeds the maximum length" @S09 @p1 | covered (at the app boundary) + Divergence #1 |
| ERR-005 — Type code > 4 chars | technical.md ERR-005 | n/a — Type is a `<Select>` (LOV) | — | not-applicable — Spec gap #1 (unreachable in new UI) |
| ERR-006 — Org Unit not a valid Long | technical.md ERR-006 | n/a — Reg/Dist is a `<Select>` (LOV) | — | not-applicable — Spec gap #1 (unreachable in new UI) |
| S10 / STA-001 — Delete disabled when permission denied | S10; technical.md STA-001 | `PermissionGate permission={MAINTAIN_TEMPLATES_DELETE}` in `TemplatesModal.tsx:360` (Edit likewise at `:355`) | `features/security/maintenance-controls/maintenance-control-sweep.feature` (Templates Delete withheld for the scaling-manager column; offered for `SCS_SYS_ADMIN`) | covered elsewhere — Coverage gap #1 CLOSED 2026-09-08 |
| S07 — cancel the delete confirmation | S07 | ConfirmDeleteModal → Cancel | `delete.feature` "Cancelling the delete confirmation" @S07 @p2 | covered |
| STA-002 — template with no bound conditions | S01/S04; technical.md STA-002 | empty conditions table renders headers only | `create.feature` "creates a new template" @S01 @p0 — read-back now asserts zero bindings | covered |

**Role / permission coverage: automated, elsewhere (updated 2026-09-08).** The only role/permission item is
S10 (Delete gated by `MAINTAIN_TEMPLATES_DELETE`). It was blocked while the local stack issued only
`SCS_SYS_ADMIN`; the eleven-role roll-out ended that, and
`features/security/maintenance-controls/maintenance-control-sweep.feature` now asserts Delete **withheld**
on `/maintenance/templates` for the scaling-manager column and **offered** for `SCS_SYS_ADMIN`. All
scenarios in this folder still run as the admin by design — the role axis is swept once, cross-cutting.

**Note for whoever reads `Templates/index.tsx` next:** it passes `addPermission` but **no**
`editPermission`/`deletePermission` — which looks exactly like the opt-in-prop hole that sweep exists to
catch. It is not one: Templates uses its own `TemplatesModal`, not the shared `MaintenanceFormModal`, and
gates Edit and Delete with `PermissionGate` inline (`TemplatesModal.tsx:355,360`). Verified 2026-09-08.

**Ledger self-trace (2026-09-08).** Every row above was re-checked against the feature files: each cited
tag exists and is the right kind (`Scenario` vs `Scenario Outline`), and each `covered` row's scenario
actually asserts that item. One over-claim was found and fixed rather than re-worded — **STA-002** read
`covered (implicitly — happy path creates with zero conditions)`. Creating a template with no bindings is
not the same as asserting it has none, so `create.feature` @S01 now ends with an explicit read-back of an
empty `conditions` array. "Implicitly" is not coverage.

**Symmetry check:** create × update (both happy paths + forward-to-view), and the create × edit form share
the same modal; required-field gating covers all three fields; delete × cancel-delete both covered;
Reset/Back covered in create **and** edit mode; condition binding covered on create **and** edit, and on
edit in both directions (bind × unbind). The one field matrix left partly open is deliberate: Name and
Reg / Dist are editable and both covered, Type is immutable in edit mode and logged `not-applicable`. No
unmirrored arm remains.

**Net (updated 2026-09-08):** all substantive slices are covered — create, binding on create *and* edit
(bind × unbind), view, update of both editable fields, delete, the binding cascade on delete,
cancel-delete, filter, required-field gating, over-length rejection, and Reset/Back in **both** create and
edit mode. S10 is covered elsewhere (the cross-cutting maintenance-control sweep).
Exactly one row is uncovered — the S04 empty-list variant, now classed `blocked` rather than `deferred`
because real data leaves no empty Type to filter to. ERR-005/006 stay `not-applicable` (LOV Selects). Two
open Divergences, both log-only (name cap 100 vs 200; generic error banner).
