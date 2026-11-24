# Coverage — UC-SCL-003 Update Scaler

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCL-003-S01..S11.feature` + `UC-SCL-003-slices.md` (control/message matrix)
+ `UC-SCL-003-technical.md` (ERR-001..011 / STA catalog), against the app's edit write path
(`pages/View/Scaler/components/ScalerEditModal.tsx` → `components/Form/ScalerForm/index.tsx`
`validateScalerForm(values, 'edit', …)` client validation; `ScalerController.updateScaler` `@IsScsEditor` →
`ScalerService.updateScaler`; PL/SQL `scs_scaler_pkg`).

**Re-grounding — the new app has NO update page.** The legacy `.scalerUpdate` (P009) full page is replaced by
the **"Scaler Record - Edit" modal** opened from the View Scaler screen's Summary tab ("Edit Record"),
saving with **PUT /api/scalers/{licenceNo}** (same body as create). Appointment and Exam are managed on
their own tabs (sibling UCs SCL-004..009); on this edit form the Appointment/Exam sections are "add new"
(never prefilled). Messages asserted are the NEW form's edit-mode copy (the legacy update-screen texts),
distinct from the create-mode copy.

**Scope note:** validation + address slices open a REAL anchor scaler READ-ONLY (their saves are blocked
client-side, so no PUT fires — nothing mutates); the happy-path + reset slices seed their OWN scaler via
the API and DELETE it on teardown. Concrete values pinned in `fixtures/scl/scaler-edit-test-data.ts`
(anchor `001A`; seed client `00001034`; changed district `56`). Ground-truthed live 2026-07-31; real data
is non-deterministic — re-verify pins on any DB re-extract.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy path — update identity fields (Reg/Dist, Oath) (S01) | slices.md S01 | `ScalerService.updateScaler` (PUT /api/scalers/{no}) + read-back | update.feature `@S01 @p0` | covered | — |
| Happy path — update licence fields (Waste + Expiry) (S01) | slices.md S01 | edit-only Scaling/Waste checkboxes + Expiry (ScalerForm `edit ?` L406-463); PUT persists licenceTypes ['SCS','WA'] | update.feature `@S01 @p1` | covered | closes UC-SCL-002 Coverage-gap #1 |
| Reg / Dist required (ERR-001) | technical.md ERR-001 | ScalerForm L145-149 ("Reg / Dist is required.") | validation.feature `@S02` (Reg / Dist) | covered | — |
| Effective Date required (ERR-002) | technical.md ERR-002 | ScalerForm L150 ("Effective Date is required.") | validation.feature `@S02` (Effective Date) | covered | — |
| Scaler Oath Taken? required (ERR-004) | technical.md ERR-004 | ScalerForm L151-155 ("Scaler Oath Taken? is required.") | validation.feature `@S02` (Oath) | covered | — |
| No licence type selected (ERR-005) | technical.md ERR-005 | ScalerForm L158-162 ("You must select at least 1 Licence Type.") | validation.feature `@S03` | covered | — |
| Both Appointment and Exam (ERR-006) | technical.md ERR-006 | ScalerForm L181-189 ("…Exam section is required but not both.") — unconditional | validation.feature `@S04` | covered | — |
| Neither Appointment nor Exam (ERR-007) | technical.md ERR-007 | ScalerForm L191-199 ("You must select an Appointment or an Exam.") — only when `enforceApptExamXor` | — | not-applicable | UI-unreachable (defects.md Coverage gap #1) |
| Waste selected + Expiry blank (ERR-008) | technical.md ERR-008 | ScalerForm L163-167 ("Expiry Date is required if Licence Type Waste is selected.") | validation.feature `@S06` | covered | — |
| Invalid date format (ERR-003 / ERR-009) | technical.md ERR-003,009 | (none — Carbon DatePicker emits YYYY-MM-DD; no free-text format check) | — | not-applicable | legacy free-text-only mechanic |
| Reset discards unsaved changes (S08) | slices.md S08 | ScalerEditModal `handleReset` — DB refetch + re-seed | update.feature `@S08 @p1` | covered | — |
| Address tab read-only (STA-003, S09) | slices.md S09 | `tabs/AddressTab.tsx` — display-only table, no inputs / no save | address.feature `@S09 @p2` | covered | — |
| Not authorized — missing scalerUpdate (ERR-005 sidecar, S10) | slices.md S10 | `@IsScsEditor` on `updateScaler` / route guard | — | blocked | mock auth (defects.md Coverage gap #2) |
| DB unique-key violation on save (ERR-011, S11) | slices.md S11 | `ScalerService.updateScaler` unchecked propagation | — | not-applicable | internal error path (no deterministic UI trigger) |
| Expiry before Effective date | (not in slices — app-enforced) | ScalerForm L168-174 ("Scaler effective date must be on or before the licence expiry date.") | validation.feature `@p1` | covered (+ spec-gap) | defects.md Spec gap #1 |
| Status → authorization eligibility (BR-SCL-003-01) | slices.md S01 BR | legacy `generateLicense`/`removeLicense` after update | — (exercised by the S01 licence-fields save; not asserted directly) | deferred | defects.md Coverage gap #3 |
| Edit Record button visible (STA-001) | slices.md S01 | SummaryTab "Edit Record" | — (used to reach every edit slice; not asserted as a state) | not-applicable | display-only state |
| Delete Record — button + confirm + delete + navigate (STA-002) | slices.md S01 | `ScalerEditModal` delete flow (DELETE /api/scalers/{no}, ORA-02292 child-record handling, redirect to create) | — (a real behaviour on the edit surface, not display-only; exercised at API level by cleanup, never through the UI) | deferred | defects.md Coverage gap #5 |

**Symmetry check:** core required fields (Reg/Dist / Effective Date / Oath) — all three arms covered.
Licence-type Scaling/Waste — both the required-at-least-one guard (S03) and the Waste-expiry guard (S06)
covered, plus the positive Waste+Expiry save (S01 licence-fields). Appointment-vs-Exam — the both-filled
arm (S04) covered; the neither arm (S05) is UI-unreachable (`enforceApptExamXor`, Coverage gap #1). The
appointment/exam sub-field required guards remain deferred (same as UC-SCL-002 Coverage-gap #4).

**Appointment / Exam positive save:** this edit form's Appointment/Exam sections are exercised only to trip
validation (S04, both sections). A POSITIVE save of a new appointment or exam through the edit form is NOT
covered here — that behaviour belongs to **UC-SCL-004** (Add Appointment) / **UC-SCL-007** (Record Training)
and is tracked there, not as a gap in this UC.

**Delete Record:** the edit modal's Delete flow is a real behaviour (button → confirm → DELETE → redirect,
with ORA-02292 child-record handling), not merely display-only — deferred to the delete UC (SCL-15 /
UC-SCL-012); see defects.md Coverage gap #5.

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`; the ERR-005 / S10
not-authorized branch is unreachable from the browser) — see Coverage gap #2.

**Status values:** `covered` · `covered (+ spec-gap)` · `not-applicable` (legacy-only / UI-unreachable) · `deferred` (see Coverage gaps) · `blocked` (env/auth/data) · `divergence` / `bug` (a genuinely-failing `@discovered-divergence` / `@discovered-bug` test — see this UC's `defects.md`).
