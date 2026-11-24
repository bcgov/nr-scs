# Coverage — UC-INS-001 Create Site Inspection

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

> **Correction (2026-09-09).** Two statements below are **stale**. (1) The rows citing "no frontend
> element-permission mechanism" / "the Add Inspection button always renders" (coverage gaps #1/#2) and
> the **Role / permission coverage** line's "blocked by mock auth (grants only `SCS_SYS_ADMIN`)" both
> predate the eleven-role roll-out: the app now gates individual controls with `PermissionGate` and every
> handler with `@RequiresPermission`, and per-role GUI/URL/API coverage lives in
> [`features/security/`](../../security/) (the Add Inspection control specifically is swept via
> `fixtures/security/role-columns.ts`). (2) The edit-screen capability referred to from UC-INS-003 is now
> authored — see [`../inspection-edit/`](../inspection-edit/). The scenario table below has **not** been
> re-reconciled against the role model; that is its own task. See
> [`../inspection-edit/defects.md`](../inspection-edit/defects.md) VN-1.

Sources reconciled: `gherkin/UC-INS-001-S01..S10.feature` + `UC-INS-001-slices.md` (control/message/field
matrix) + `UC-INS-001-technical.md` (ERR-001..013 catalog), against the new app's two-stage create path:
`pages/Create/ScaleSiteInspection/index.tsx` (`validateStageOneValues` / `validateFormValues`),
`components/Form/ScaleSiteInspectionDetails`, `components/Form/ScaleSiteInspectionQuestions`,
`services/scaleSiteInspections.service.ts` (GET `/scale-sites/{id}/inspections/create`,
POST `/scale-sites/{id}/inspections`, GET `/scale-sites/inspection/{id}`), and the backend
`ScaleSiteInspectionService.createScaleSiteInspection` / `InspectionValidator`. Endpoints + write path
were ground-truthed by hand on 2026-07-15 (create-init → create → detail → delete).

**Test data (real, 2026-07-15, see `fixtures/ins/ins-test-data.ts`):** site **520** (owner in
`forest_client`, so the read-back's INNER JOIN resolves), inspection type **MIN** + site type **W**
(a real, small active question set), inspector GUID `SEEDED.inspectorGuid` (an inspector present in
`scs_user_info_vw`; local-only value, see `fixtures/common/seededValues.ts`). S04 uses site **16H** (also forest_client-backed, never mutated) for a reliably
empty list. The happy path answers **every rendered question dynamically** (no hard-coded ids/count),
so it survives a question-library change.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path create end-to-end (+ read-back) | S01 | stage1 → stage2 → POST create → `/view/{id}` + GET read-back | create `@S01 @p0` | covered | — |
| Add Inspection button rendered (STA-001) | S01/S04 controls | InspectionsTab `renderAddInspectionAction` | navigation `@S04 @p1`/`@p2` | covered | — |
| Inspection Type dropdown, required (ERR-001) | S01/S05 | `validateStageOneValues` (index.tsx:277) | validation `@S05 @p1` (Next blocked, "Inspection Type is required.") | covered | — |
| Site Type checkbox group, ≥1 required | S01/S05 | `validateStageOneValues` (index.tsx:281) | validation `@S05 @p1` (block + message visibility) | covered | Divergence #1 (resolved) |
| Next advances stage 1 → stage 2 | S01 control | `handleStageOneNext` | choose step (all scenarios) | covered | — |
| Question set loaded from CCQ library (BR-INS-001-03) | S01 / BR-003 | create-init `InspectionQuestionAssembler` intersection | create `@S01` (answers every rendered question) | covered | — |
| Question Answer required per question (ERR/radio→Select) | S01/S05 | `validateFormValues` per-row (index.tsx:329-330, "Answer is required.") | validation `@S05 @p1` (blank save asserts "Answer is required." + spy=0) | covered | — |
| Site Operator Present required (ERR-004) | S05 | `validateFormValues` (index.tsx:310) | validation `@S05 @p1` | covered | — |
| Inspection Date required (ERR-002) | S05 | `validateFormValues` (index.tsx:315) | validation `@S05 @p1` | covered | — |
| Inspection Date not future (ERR-005) | S06 | `validateFormValues` (index.tsx:319) + backend `InspectionValidator` | validation `@S06 @p1` | covered | — |
| Inspection Date format yyyyMMdd (ERR-006) | S06 / technical | Carbon flatpickr (dateFormat Y-m-d) — free-format entry not reachable | — | not-applicable (re-ground) | verified-not-defect #2 |
| Inspector # — euser GUID, honoured | S05 / technical | submitted inspector GUID is stored (legacy semantics), format-validated | create `@S01` types a real GUID (honoured) | covered | verified #1 (fixed) |
| Follow-up required → Action/Due/Complete required (ERR-009) | S07 | `validateFormValues` conditional (index.tsx:337-352) | validation `@S07 @p1` | covered | — |
| Follow-up populated when NOT required (ERR-008) | S07 | UI clears + DISABLES the fields when Required=N → not reachable | — | not-applicable (re-ground) | verified-not-defect #3 |
| Back returns to stage 1 with selections (S02) | S02 | `handleStageTwoBack` retains `stageOneValues` | navigation `@S02 @p2` | covered | — |
| Reset restores stage 2 initial state (S03) | S03 | `handleReset` from `initialValues` | navigation `@S03 @p2` | covered | — |
| Scale site with no inspections → empty list (S04) | S04 | InspectionsTab empty state | navigation `@S04 @p1` | covered | — |
| Automated type → site type forced to W (S10) | S10 | `handleInspectionTypeChange` + `validateStageOneValues` (index.tsx:285) | navigation `@S10 @p1` | covered | — |
| Follow-up to Inspection # positive-integer | (app-only — not in legacy slices) | `validateFormValues` (index.tsx:302-308) | — | deferred (app-only rule, p2) | coverage gap #4 |
| Compliance/enforcement issue validators fire (BR-INS-001-02) | BR-002 / AF1 | no new-app equivalent — folded into per-question follow-up fields | — | not-applicable (re-ground) | coverage gap #3 (see UC-INS-003) |
| Add Inspection hidden — permission denied (S08 / STA-001) | S08 | no per-element permission mechanism in the new app — the Add Inspection button always renders | — (no equivalent) | not-applicable | coverage gap #1 |
| Direct-URL / wrong-role unauthorized (S09 / ERR-013) | S09 | endpoint role-denial IS enforced (`@IsScsEditor`); the single-role mock auth just can't produce a denied user | — (no reproducible state) | blocked | coverage gap #2 |

**Symmetry check:** no numeric/original-vs-check matrix exists on this screen. The relevant symmetry is
the per-question follow-up group (Required? → Action / Due Date / Complete?): the "required when Y" arm
is materialized (S07); the "not-allowed when N" mirror arm is enforced by the UI disabling the fields,
so it is not user-reachable (logged, not a gap). Every question row is answered by ONE dynamic loop, so
all rendered questions are exercised regardless of the library's exact set.

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`) + no frontend
element-permission mechanism — S08 (Add-Inspection gating) and S09 (role denial) are not reproducible;
logged in Coverage gaps #1 and #2. No @skip scenarios authored (the state cannot be produced at all).

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` (legacy-only / not UI-reachable) ·
`blocked` (env/auth) · `divergence` (see defects.md). Divergence #1 (Site Type required message hidden
from sighted users) is **RESOLVED** (fixed in nr-scs; the scenario is now a normal green assertion) — no
open divergences.
