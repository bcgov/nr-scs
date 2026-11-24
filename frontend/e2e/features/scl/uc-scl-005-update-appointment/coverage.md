# Coverage — UC-SCL-005 Update Scaler Appointment

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCL-005-S01..S12.feature` + `UC-SCL-005-slices.md` + `UC-SCL-005-technical.md`,
against the app's update-appointment write path
(`appointmentFormUtils.validateAppointmentForm(…, 'edit')`; `ScalerAppointmentController.updateScalerAppointment`).

**Re-grounding.** Update is reached via the Appointments-tab row **"Edit"** button → the SHARED
`ScalerAppointmentForm` in **"Scaler Appointment - Edit"** mode → **PUT /api/scalers/{no}/appointments/{id}**.
The edit modal adds the **cancellation date/reason** fields (edit-only). Crucially, the CORE validation
(`applyCoreValidation`: required fields, invalid-date, expiry-before-effective, province-wide/reg-dist,
duration-cap) is **mode-independent** — the exact same code runs in add mode — so those legacy slices are
already covered by **UC-SCL-004**. This UC covers the EDIT-ONLY additions (cancellation rules) + the happy
update + one representative core check confirming the edit modal wires validation and blocks the PUT.

**Scope note:** every slice (happy + validation) SEEDS its own scaler+appointment and operates on that —
the happy path edits it IN PLACE (no new row → seedScaler cleanup suffices); the validation slices open its
edit modal and are blocked client-side (no PUT). All live in `update.feature` (`@mode:serial`, one shared
seed client reused seed → clean → re-seed). **Seeding rather than a real anchor's pre-existing appointment
is deliberate:** the earlier design pinned scaler `001A` and needed it to own an appointment, which drifted
away on a reviewer's local DB and failed those 5 slices (PR #46 follow-up); self-seeding is robust on any
DB. Values pinned in `fixtures/scl/scaler-appointment-test-data.ts`. Verified against the local Docker DB.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy — update effective/expiry (S01) | slices.md S01 | `updateScalerAppointment` (PUT) + read-back | update.feature `@S01 @p0` | covered | — |
| Appointment required (S02) | technical.md | appointmentFormUtils L169-171 | — | covered elsewhere | UC-SCL-004 `@S03` (same mode-independent code) |
| Province Wide required (S03) | technical.md | L173-175 | — | covered elsewhere | UC-SCL-004 `@S03` |
| Effective Date required (S04) | technical.md | L185-186 ("Effective Date is required.") | update.feature `@S04` | covered | representative edit-mode core check |
| Invalid date format (S05) | technical.md | (Carbon DatePicker emits YYYY-MM-DD) | — | not-applicable | legacy free-text mechanic (defects.md Coverage gap #1) |
| Expiry before Effective (S06) | technical.md | L193-199 | — | covered elsewhere | UC-SCL-004 `@S05` |
| Cancellation date/reason pair (S07) | technical.md | `applyCancellationValidation` L217-224 ("…both be provided or both be omitted.") | update.feature `@S07` | covered | edit-only |
| Cancellation date out of range (S08) | technical.md | L231-245 ("…on or after the appointment effective date." / "…on or before the appointment expiry date.") | update.feature `@S08` (before-effective arm) | covered | after-expiry arm is the mirror (same code) |
| Province Wide / Reg-Dist conflict (S09) | technical.md | L177-183 | — | covered elsewhere | UC-SCL-004 `@S07` |
| Appointment period exceeds max (S10) | technical.md | `validateAppointmentDuration` L134-162 | — | covered elsewhere | UC-SCL-004 `@S06` |
| Actor cancels edit — Back (S11) | slices.md S11 | modal "Back" → closeEditor (no PUT) | update.feature `@S11 @p2` | covered | — |
| Not authorized (S12) | slices.md S12 | `@IsScsEditor` / route guard | — | blocked | mock auth (defects.md Coverage gap #2) |

**Symmetry check:** the edit-only cancellation rules — pair-completeness (S07) and range (S08) — are covered;
the range rule's after-expiry arm is the same code path as the before-effective arm (only the comparison
direction differs) so one arm suffices. Core validation symmetry is covered by UC-SCL-004 (shared code).

**Role / permission coverage:** blocked by mock auth (S12) — see Coverage gap #2.

**Status values:** `covered` · `covered elsewhere` (identical mode-independent code tested in UC-SCL-004) · `not-applicable` · `blocked`.
