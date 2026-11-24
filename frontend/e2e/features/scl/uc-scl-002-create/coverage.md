# Coverage — UC-SCL-002 Create Scaler

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCL-002-S01..S09.feature` + `UC-SCL-002-slices.md` (control/message
matrix) + `UC-SCL-002-technical.md` (FLD-001..006 / ERR-001..006 / STA catalog), against the app's write
path (`components/Form/ScalerForm/index.tsx` `validateScalerForm` client validation;
`ScalerService.validateWrite`/`createScaler` server validators; PL/SQL `scs_scaler_pkg`,
`scs_scaler_assignd_lic_typ_pkg`, `scs_scaler_licence_attribt_pkg`, `scs_scaler_training_pkg`).

**Scope note:** the create write path needs **NO seed patch** — a real extracted client satisfies it if it
exists at loc `00` and owns no scaler yet (UNIQUE `SCLR_UK` on `CLIENT_NUMBER`). Ground-truthed against the
live stack 2026-07-30. Concrete values pinned in `fixtures/scl/scaler-test-data.ts` (unconsumed clients
`00001481`/`00001490`/`00001500`/`00001543`; absent client `99999999`; District `1831`; appointment
`Acting - Coastal` from `grading-code-appointment-type-lov`; exam `Acting Scaler Exam` from
`scaler-training-type-lov`). Dates are today-relative via `fixtures/common/dates.ts`.

**Re-grounding — the new create form ≠ the legacy screen:** the Scaling/Waste licence-type checkboxes and
the Expiry Date field are **edit-mode only** (create hard-codes `licenceTypes:['SCS']`), and there is **no
Back button** (only Reset + Save). So legacy slices S05 (Waste/Expiry), FLD-006 (licence-type-required) and
S07 (Back) are UI-unreachable — logged as Coverage-gaps, not tested. Messages asserted are the NEW form's
copy, not the legacy FLD-/ERR- text.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Client (Client/Loc) required (FLD-001) | technical.md:65 | ScalerForm `validateScalerForm` L142 ("Client is required.") | validation.feature `@S02` (Client) | covered | — |
| Location must be 00 | technical.md:38 | ScalerForm L143 — `#clientLocnCode` readOnly, pinned `00` → UI-unreachable to make non-00 | — | not-applicable | field-gated (readOnly) |
| Reg / Dist → District required (FLD-002) | technical.md:66 | ScalerForm L145-149 ("District is required.") | validation.feature `@S02` (District) | covered | — |
| Effective Date required (FLD-003) | technical.md:67 | ScalerForm L150 ("Effective Date is required.") | validation.feature `@S02` (Effective Date) | covered | — |
| Effective Date format 'yyyyMMdd' (FLD-004) | technical.md:68 | (none — Carbon DatePicker emits YYYY-MM-DD; no free-text format check) | — | not-applicable | legacy free-text-only mechanic |
| Scaler Oath Taken required (FLD-005) | technical.md:69 | ScalerForm L154 ("Scaler Oath Taken is required.") | validation.feature `@S02` (Oath) | covered | — |
| Licence Type required (FLD-006) | technical.md:70 | (none on create — Scaling/Waste checkboxes are edit-mode only; create sends `['SCS']`) | — | not-applicable | UI-unreachable (defects.md Coverage gap #1) |
| Appointment XOR Exam — both filled (ERR-001) | technical.md:71 | ScalerForm L186-187 ("…section (not both).") | validation.feature `@S03` | covered | — |
| Appointment XOR Exam — neither filled (ERR-002) | technical.md:72 | ScalerForm L197 ("…either the Appointment section or the Exam / Upgrade section.") | validation.feature `@S04` | covered | — |
| Waste selected + Expiry Date blank (ERR-003) | technical.md:73 | (none on create — Waste checkbox is edit-mode only) | — | not-applicable | UI-unreachable (defects.md Coverage gap #1) |
| Client not found in SCS (ERR-004) — server reject | technical.md:74 | `ScalerService.clientExists` L70-73 → 400 "No client found for client number {n} at location 00." | validation.feature `@S08` | covered | — |
| Not authorized (ERR-005) | technical.md:75 | `@IsScsEditor` (backend) / route guard | — | blocked | mock auth (defects.md Coverage gap #2) |
| DB / SP failure on create (ERR-006) | technical.md:76 | `ScalerService.createScaler` unchecked propagation | — | not-applicable | internal error path (no deterministic UI trigger) |
| Licence # read-only, system-assigned (STA-002) | technical.md:64 | no Licence # field on the create form (assigned on save) | — | not-applicable | display-only state |
| Happy path — create + Appointment (Scaling) (S01) | slices.md S01 | `ScalerService.createScaler` + Appointment insert + read-back | create.feature `@S01 @p0` | covered | — |
| Happy path — create + Exam instead of Appointment (S06) | slices.md S06 | create + Exam insert + read-back | create.feature `@S06 @p1` | covered | — |
| Back without saving → welcome (S07) | slices.md S07 | (none — new create form has no Back button, only Reset + Save) | — | not-applicable | UI redesign (defects.md Coverage gap #3) |
| No `scalerCreate` permission → notAuthorized (S09) | slices.md S09 | route/`@IsScsEditor` guard | — | blocked | mock auth (defects.md Coverage gap #2) |
| One scaler per client (`SCLR_UK`) — server reject | (not in slices — app-enforced) | `ScalerService.clientHasScaler` L76-79 → 400 "A scaler already exists for this client." | create.feature (dup scenario) `@p1` | covered (+ spec-gap) | defects.md Spec gap #1 |
| Appointment/Exam sub-field required guards (Province Wide, Appt Effective Date, Appointment, Exam/Upgrade, Completed By) | technical.md:104,106,107 / ScalerForm L202-219 | ScalerForm L202/206/211/218/219 (conditional-required) | — (positive path fills them; guards not asserted) | deferred | defects.md Coverage gap #4 |

**Symmetry check:** core required fields (Client / District / Effective Date / Oath) — all four arms
covered. Appointment-vs-Exam mutual exclusion — both arms (both-filled S03 / neither S04) covered, and both
happy-path arms (Appointment S01 / Exam S06) covered. Licence-type Scaling/Waste arm and the Waste-expiry
guard are edit-mode-only → not-applicable. The conditional appointment/exam sub-field required guards are
the one open symmetry item → deferred (Coverage gap #4).

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`; the ERR-005 / S09
not-authorized branch is unreachable from the browser) — see Coverage gap #2.

**Status values:** `covered` · `covered (+ spec-gap)` · `not-applicable` (legacy-only / UI-unreachable) · `deferred` (see Coverage gaps) · `blocked` (env/auth/data) · `divergence` / `bug` (a genuinely-failing `@discovered-divergence` / `@discovered-bug` test — see this UC's `defects.md`).
