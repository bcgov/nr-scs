# Coverage — UC-CCQ-001 Maintain Inspection Question

> New to these files? See [`coverage-guide.md`](../../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `create.feature`, `view.feature`, `update.feature`, `delete.feature` + `UC-CCQ-001-slices.md`
(control/message matrix, S01-S09) + `UC-CCQ-001-technical.md` (ERR-001..008 catalog, Gaps/TODOs), against
the app's write path (`QuestionsAdminPage`/`QuestionsModal` client validation + `InspectionQuestionService`
server validation + `InspectionQuestionRepository`).

**Re-grounding note (screen shape):** legacy is a multi-page split layout (`.maintainQuestions` list +
distinct `.maintainQuestionsCreate`/`Update`/`View` `.do` routes). The new app is a **single route**
(`/maintenance/questions`) with the list + an in-page `Modal` that switches `create`/`edit`/`view` mode.
All slice mappings below are re-grounded onto that shape.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 Create happy path | slices.md S01 | `QuestionsAdminPage.saveMutation` → `POST /api/inspection-questions` → `InspectionQuestionService.createQuestion` | `create.feature @S01 @p0` | covered | — |
| S01/S03 "forwards to the question view" after save | slices.md S01 Expected Outcome | `saveMutation.onSuccess` now seeds the detail cache + `setModalMode('view')` (fixed 2026-07) — forwards to the read-only view | `create.feature @S01`, `update.feature @S03`/`@S07` | covered | Divergence #1 (resolved) |
| S02 View existing question | slices.md S02 | `openView` → `GET /api/inspection-questions/{id}` | `view.feature @S02 @p0` | covered | — |
| S03 Update (not used) | slices.md S03 | `saveMutation` (edit) → `PUT /api/inspection-questions/{id}` | `update.feature @S03 @p0` | covered | — |
| S04 Delete (not used) | slices.md S04 | `deleteMutation` → `DELETE /api/inspection-questions/{id}` | `delete.feature @S04 @p0` | covered | — |
| S04 Cancel the delete confirmation | slices.md S04 (mirror arm); shared `ConfirmDeleteModal` | each page wires its OWN `onCancel`/`onConfirm` into the shared modal, so the Templates equivalent cannot vouch for this one | `delete.feature` "Cancelling the delete confirmation keeps the question" @S04 @p2 | covered | — |
| S05 Required: Question blank (ERR-002) | slices.md S05 | client `validateForm` (`questionText`) | `create.feature @S05a @p1` (outline row) | covered | — |
| S05 Required: Sort Order blank (ERR-003) | slices.md S05 | client `validateForm` (`sortOrderNo`) | `create.feature @S05a @p1` (outline row) | covered | — |
| S05 Required: Comment Required blank (ERR-006) | slices.md S05 | client `validateForm` (`commentRequiredInd`) | `create.feature @S05a @p1` (outline row) | covered | — |
| S05 Required: Effective Date blank (ERR-004) | slices.md S05 | client `validateForm` (`effectiveDate`) | `create.feature @S05a @p1` (outline row) | covered | — |
| S05 Required: Expiry Date blank (ERR-005) | slices.md S05 | client `validateForm` (`expiryDate`) | `create.feature @S05a @p1` (outline row) | covered | — |
| S06 Format: Sort Order not integer (ERR-003) | slices.md S06 | client `Questions/validate.ts` (`!Number.isInteger(Number(...))` → "Sort order must be a whole number.") | `create.feature @S06a @p1` | covered | — |
| S06 Format: Effective/Expiry not a valid date (ERR-004/005) | slices.md S06 | Carbon `DateInput`/flatpickr — malformed text can't commit | — | not-applicable (flatpickr prevents a malformed date from ever committing — there is nothing to submit or assert) | re-ground |
| S06 Format: Question > 200 chars (ERR-007) | slices.md S06; technical.md Data Field Ref | **client-side again** (re-grounded 2026-09-30): `Questions/validate.ts` blocks Save with "Question cannot be greater than 200 characters." and sends nothing; the server's `@NotNull @Size(max=200)` + `InspectionQuestionService` `.length() > 200` check remain as a second line | `create.feature @S06-len @p1` | covered (+ re-grounding) | see note below |
| At-least-one Inspection Type (technical.md Gaps: enforcement path "not confirmed from source") | slices.md Deliberately-excluded list; technical.md Gaps/TODOs | **confirmed now enforced**: client `validateForm` + server `validateQuestionRequestParams` | `create.feature @S05b @p1` (outline row) | covered (+ spec-gap) | Spec gap #1 |
| At-least-one Scaling Method (same gap) | ″ | client + server, same mechanism | `create.feature @S05b @p1` (outline row) | covered (+ spec-gap) | Spec gap #1 |
| At-least-**two** Valid Responses (same gap, but new app requires 2, not 1) | ″ | client + server (`validResponseCodes.size() < 2`) | `create.feature @S05b @p1` (outline row) | covered (+ spec-gap) | Spec gap #1 |
| Expiry before Effective date (technical.md Gaps: "no cross-field date-order validation found... excluded pending live app confirmation") | slices.md Deliberately-excluded list | **confirmed now enforced**: client `validateForm` (expiry >= effective) + server `SCSUtils.requireDateOrder` | `create.feature @S06-order @p1` | covered (+ spec-gap) | Spec gap #2 |
| S07 Update blocked — used question (STA-002, partial edit) | slices.md S07 | `QuestionsModal isReadOnly` (fields disabled) + server `updateQuestion` forces non-Sort-Order/Expiry fields to existing values; `deleteQuestion`/`isQuestionUsed` via `INSPECTION_RESPONSE` | `update.feature @S07 @p1` | covered | — |
| S08 Delete blocked — used question (ERR-001) | slices.md S08 | server `deleteQuestion` → `BadRequestException` when `questionUsed=true` | `delete.feature @S08 @p1` | covered | — |
| S09 Non-administrator denied (ERR-008) | slices.md S09 | `@RequiresPermission(MAINTAIN_QUESTIONS_*)` on every handler (`@IsScsEditor` no longer exists) + the route guard on `/maintenance/questions` | `features/security/*/api-access.feature` + `*/url-access.feature` (per role) | covered elsewhere | Coverage gap #1 — CLOSED 2026-09-08 |
| Legacy per-button permission-hiding (STA-003/STA-004: Edit/Delete hidden when lacking WebADE permission) | slices.md S02 | **now exists** — `Questions/index.tsx:194,215,216` passes `addPermission`/`editPermission`/`deletePermission` into `MaintenanceListPage`/`MaintenanceFormModal` | `features/security/maintenance-controls/maintenance-control-sweep.feature` (the Questions rows) | covered elsewhere | Coverage gap #2 — CLOSED 2026-09-08 |

**Role / permission coverage: automated, elsewhere.** Both role items are now covered — the premise that
blocked them ("mock auth grants only `SCS_SYS_ADMIN`") died when the eleven-role permission roll-out
landed. Re-verified 2026-09-08:

- **S09 endpoint/route denial** — `/api/inspection-questions` and `/maintenance/questions` are asserted
  per role in the security suite's `api-access.feature` / `url-access.feature` files (`ce-technician`,
  `check-scaler`, `industry-scaler`, `read-only-internal`, `scale-site-owner`, `dist-manager`,
  `scaling-manager`).
- **Per-button hiding** — `maintenance-control-sweep.feature` asserts Add/Edit/Delete **withheld** on
  Questions for `SCS_DIST_SCALING_MANAGER`, `SCS_REGIONAL_SCALING_MANAGER` and `SCS_CE_TECHNICIAN`, and
  **offered** for `SCS_SYS_ADMIN` (the contrast that proves the locators still find real controls).

Scenarios in *this* folder therefore all run as the administrator by design; the role axis is swept once,
cross-cutting, rather than re-proved per UC.

**Symmetry note:** legacy's own slice catalog deliberately did not duplicate S05/S06 across create vs.
update ("validation fail on Update path... covered in the notes for S05/S06 rather than duplicating
slices") since `InspectionQuestionValidator` (legacy) / `validateQuestionRequestParams` (new, shared by
both `createQuestion`/`updateQuestion`) run the identical rule set either way. This suite follows the
same choice: full validation coverage lives on **create**, and `update.feature` carries one
representative validation scenario (`@S03-validation`) to confirm create/update parity without
duplicating every row.

**Reset / Back (added 2026-09-08).** `navigation.feature` covers Reset in **both** modes — create-mode
clears the form (`resetForm()` → `emptyForm`), edit-mode restores the loaded record — mirroring UC-CCQ-003.
Back has only one arm to cover: `MaintenanceFormModal` renders it for `modalMode === 'edit'` only, so
create-mode Back is `not-applicable` rather than missing.

**UC-CCQ-002 slices authored here:** CCQ-002 has no screen of its own, so its S05/S06/S07 slices act on
this screen and live in this folder as `navigation.feature` (Reset / Back) and `not-found.feature`. They
are tagged `@UC-CCQ-002` as well as `@UC-CCQ-001`; the accounting for them is in
[`../uc-ccq-002-valid-response-set/coverage.md`](../uc-ccq-002-valid-response-set/coverage.md).

**Notes:**
- **Spec gap #1** (`gherkin-incomplete-vs-source`): `-slices.md`'s own Gap Analysis flagged the
  at-least-one/at-least-two checkbox-group rules as *excluded pending confirmation the enforcement code
  path exists*. It now demonstrably exists in the new app (both client and server) — covered here, and
  logged so a BA can regenerate the slice/Gherkin to include it as confirmed, not speculative.
- **Spec gap #2**: same pattern for the Expiry-before-Effective cross-field rule — `-slices.md` explicitly
  deferred it "pending live app confirmation"; the new app enforces it (client + server). Covered + logged.
- **Question-length re-grounding**: not a divergence. Originally covered as a server-side rejection because
  the build had no client check; the client now enforces the cap (`Questions/validate.ts`, matching legacy and
  the OpenAPI `maxLength: 200`), so since 2026-09-30 the scenario asserts the inline error and that no
  create request is sent.
- The Valid-Responses **minimum of two** (not one) is a new-app-only rule with no legacy precedent to
  diverge from (legacy source never confirmed a minimum-count enforcement for this group at all) — logged
  as new coverage, not a divergence.
