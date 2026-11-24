# Coverage — UC-SCL-004 Add Scaler Appointment

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCL-004-S01..S09.feature` + `UC-SCL-004-slices.md` (control/message matrix)
+ `UC-SCL-004-technical.md` (ERR-001..010 catalog), against the app's add-appointment write path
(`pages/View/Scaler/components/appointments/appointmentFormUtils.ts` `validateAppointmentForm(…, 'create')`;
`ScalerAppointmentController.createScalerAppointment`; `ScalerAppointmentService`).

**Re-grounding — appointments are a tab, not a page.** The legacy `.scalerAppointmentCreate` (P019) page is
replaced by the **View Scaler → Appointments tab → "Scaler Appointment - Create" modal**
(`AppointmentsTab` → `ScalerAppointmentForm`), saved with **POST /api/scalers/{no}/appointments**. Messages
asserted are the NEW form's copy. The parent scaler carries an intrinsic appointment (A/C) from create; the
slices add a distinct **'Acting - Interior' (A/I)** appointment so the read-back finds the added one by
grading.

**Scope note:** happy paths seed their OWN parent scaler (add.feature `@mode:serial`); validation slices open
the real anchor scaler's Add modal READ-ONLY (blocked client-side, no POST). Concrete values pinned in
`fixtures/scl/scaler-appointment-test-data.ts` (added type 'Acting - Interior'; district `1831`; seed client
API-verified free). Ground-truthed live 2026-08-04; re-verify pins on any DB re-extract.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Add province-wide appointment (S01) | slices.md S01 | `createScalerAppointment` (POST) + read-back | add.feature `@S01 @p0` | covered | — |
| Add district-specific appointment, PW=No (S02) | slices.md S02 | POST with `orgUnitNo`, `provinceWideInd='N'` + read-back | add.feature `@S02 @p1` | covered | — |
| Appointment required (ERR-001) | technical.md ERR-001 | appointmentFormUtils L169-171 ("Appointment is required.") | validation.feature `@S03` (Appointment) | covered | — |
| Province Wide? required (ERR-002) | technical.md ERR-002 | L173-175 ("Province Wide is required.") | validation.feature `@S03` (Province Wide) | covered | — |
| Effective Date required (ERR-003) | technical.md ERR-003 | L185-186 ("Effective Date is required.") | validation.feature `@S03` (Effective Date) | covered | — |
| Effective Date invalid format (ERR-004) | technical.md ERR-004 | L187-189 (guard exists) | — | not-applicable | Carbon DatePicker emits YYYY-MM-DD (defects.md Coverage gap #1) |
| Expiry before Effective (ERR-008) | technical.md ERR-008 | L193-199 ("Appointment effective date must be on or before the appointment expiry date.") | validation.feature `@S05` | covered | — |
| Period exceeds max for type (ERR-009) | technical.md ERR-009 | `validateAppointmentDuration` L134-162 ("…cannot be more than N year(s)…for appointment type X.") | validation.feature `@S06` | covered | — |
| PW=No + Reg/Dist blank (ERR-007) | technical.md ERR-007 | L177-179 ("District is required when the appointment is not province-wide.") | validation.feature `@S07` | covered | — |
| PW=Yes + Reg/Dist selected (ERR-006) | technical.md ERR-006 | L181-183 (guard exists) | — | not-applicable | UI-unreachable — Yes disables + auto-clears district (defects.md Coverage gap #2) |
| Not authorized — missing scalerAppointmentCreate (ERR-010, S08) | slices.md S08 | `@IsScsEditor` / route guard | — | blocked | mock auth (defects.md Coverage gap #3) |
| Back without saving (S09) | slices.md S09 | modal "Back" → closeEditor (no POST) | validation.feature `@S09 @p2` | covered | — |
| Duplicate appointment (slices.md cites `errors.licence_attribute_exists`) | slices.md excluded | (none in EITHER app — `scs_scaler_licence_attribt_pkg.insert_rec` is a plain insert; 2nd identical add → 201) | — | not-applicable | slice-catalog misattribution, not a divergence (defects.md Spec gap #1) |

**Symmetry check:** required fields (Appointment / Province Wide / Effective Date) — all three arms covered.
Province-Wide × Reg/Dist — the PW=No-requires-district arm covered (S07); the PW=Yes-forbids-district arm is
UI-unreachable (Coverage gap #2). Happy-path Province Wide — both Yes (S01) and No (S02) arms covered. Date
rules — expiry-before-effective (S05) and duration-cap (S06) covered; invalid-format is not-applicable.

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`; the ERR-010 / S08
not-authorized branch is unreachable from the browser) — see Coverage gap #3.

**Status values:** `covered` · `not-applicable` (legacy-only / UI-unreachable) · `blocked` (env/auth/data) · `divergence` / `bug` (a genuinely-failing `@discovered-divergence` / `@discovered-bug` test — see this UC's `defects.md`).
