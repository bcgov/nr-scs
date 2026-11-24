# Re-grounded UC-SCL-005. The new app edits an appointment via the Appointments-tab row "Edit" button, which
# opens the SHARED modal in "Scaler Appointment - Edit" mode (ScalerAppointmentForm), saved with
# PUT /api/scalers/{no}/appointments/{id}. Every slice here SEEDS its own parent scaler (which carries an
# intrinsic appointment) and operates on that appointment — the happy path edits it IN PLACE; the validation
# slices open its edit modal and are blocked CLIENT-SIDE (no PUT, proven by the update spy === 0). Seeding
# (rather than leaning on a real anchor's pre-existing appointment) keeps these robust to DB drift — a
# reviewer's local DB lacked the old anchor's appointment (PR #46 follow-up). Values pinned in
# fixtures/scl/scaler-appointment-test-data.ts.
#
# Re-grounding notes: the CORE appointment validation (required fields, invalid-date, expiry-before-effective,
# province-wide/reg-dist, duration-cap) is the SAME mode-independent code as add mode
# (appointmentFormUtils.validateAppointmentForm calls applyCoreValidation in both modes), so legacy
# S02/S03/S06/S09/S10 are already covered by UC-SCL-004's add-validation slices — see coverage.md. This file
# covers the happy update (S01), the EDIT-ONLY cancellation rules (S07 pair, S08 range), one representative
# core check (S04) proving the edit modal wires validation and blocks the PUT, and Back (S11). S05 (free-text
# date format) is not-applicable (Carbon DatePicker); S12 (no permission) is blocked by mock auth.
#
# @mode:serial — every slice seeds via POST /api/scalers (non-atomic SCALER_LICENCE_NO, UC-SCL-002 Bug #1),
# so serialising keeps the suite deterministic; the shared seed client is safe because serial scenarios
# seed → clean → re-seed one at a time. Uses a client distinct from the other appointment features.
@scl @UC-SCL-005 @mode:serial
Feature: Update Scaler Appointment

  @S01 @p0
  Scenario: Update an appointment's expiry date
    Given a scaler with an appointment exists to update
    And I open the scaler appointment for editing
    When I change the appointment expiry date and save
    Then the appointment update is saved
    And one appointment update request is sent
    And the appointment reads back with the new expiry date

  # S04 — representative core check on the edit form (required field cleared) + proves no PUT fires.
  @S04 @p1
  Scenario: Update is blocked when a required field is cleared
    Given a scaler with an appointment exists to update
    And I open the scaler appointment for editing
    When I clear the appointment effective date and save
    Then I should see the appointment update error "Effective Date is required."
    And no appointment update request is sent
    And the appointment edit form is still open

  # S07 — cancellation date/reason must both be present or both absent (edit-only).
  @S07 @p1
  Scenario: Update is blocked when only one of cancellation date/reason is provided
    Given a scaler with an appointment exists to update
    And I open the scaler appointment for editing
    When I enter a cancellation reason without a cancellation date and save
    Then I should see the appointment update error "Cancellation date and reason must either both be provided or both be omitted."
    And no appointment update request is sent
    And the appointment edit form is still open

  # S08 — cancellation date outside the appointment's effective..expiry window (edit-only; before-effective arm).
  @S08 @p1
  Scenario: Update is blocked when the cancellation date is before the effective date
    Given a scaler with an appointment exists to update
    And I open the scaler appointment for editing
    When I enter a cancellation date outside the appointment window and save
    Then I should see the appointment update error "Cancellation date must be on or after the appointment effective date."
    And no appointment update request is sent
    And the appointment edit form is still open

  # S11 — open the edit form then leave via Back; nothing is saved.
  @S11 @p2
  Scenario: Leaving the appointment edit form via Back saves nothing
    Given a scaler with an appointment exists to update
    And I open the scaler appointment for editing
    When I open the appointment edit form and click Back
    Then the appointment edit form is closed
    And no appointment update request is sent
