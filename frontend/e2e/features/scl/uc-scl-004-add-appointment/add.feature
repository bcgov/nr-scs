# Re-grounded from UC-SCL-004 S01 (province-wide appointment) and S02 (district-specific). The new app has
# NO separate appointment-create page: the View Scaler screen's Appointments tab has an "Add Appointment"
# button that opens the "Scaler Appointment - Create" modal (ScalerAppointmentForm), saved with POST
# /api/scalers/{no}/appointments. Success is PROVEN by an API read-back of the appointment list. Each slice
# seeds its OWN parent scaler (which carries an intrinsic A/C appointment) and adds a distinct 'Acting -
# Interior' (A/I) appointment, so the read-back finds the added one by grading. Teardown deletes the added
# appointment BEFORE the scaler (a scaler with added appointments 400s on delete until they are removed).
# Values pinned in fixtures/scl/scaler-appointment-test-data.ts.
#
# @mode:serial — each slice seeds a scaler via POST /api/scalers, whose SCALER_LICENCE_NO generation is not
# concurrency-safe (UC-SCL-002 Bug #1); serialising the seeding slices keeps the suite deterministic. One
# seed client suffices (seed → add → teardown per scenario).
@scl @UC-SCL-004 @mode:serial
Feature: Add Scaler Appointment

  @S01 @p0
  Scenario: Add a province-wide appointment
    Given a scaler exists to add appointments to
    And I open the scaler Appointments tab
    When I add a province-wide appointment
    Then the appointment is added
    And one appointment create request is sent
    And the added appointment reads back as province-wide

  @S02 @p1
  Scenario: Add a district-specific appointment
    Given a scaler exists to add appointments to
    And I open the scaler Appointments tab
    When I add a district-specific appointment
    Then the appointment is added
    And one appointment create request is sent
    And the added appointment reads back as district-specific for "1831"
