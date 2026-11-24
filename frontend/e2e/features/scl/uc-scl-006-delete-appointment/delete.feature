# Re-grounded UC-SCL-006. The new app deletes an appointment via the Appointments-tab row "Delete" button,
# which opens a Carbon confirmation modal (legacy CNF-001 "Are you sure you want to delete this record?");
# "Confirm Delete" issues DELETE /api/scalers/{no}/appointments/{id}, "Cancel" dismisses it. Both slices
# SEED their own scaler (which carries an intrinsic appointment) and operate on that — S01 confirms the
# delete (proven by an API read-back = 0 appointments + the empty-list message, folding in S03); S02 cancels
# (no DELETE, proven by the delete spy === 0). Seeding (rather than leaning on a real anchor's pre-existing
# appointment) keeps these robust to DB drift (PR #46 follow-up). Values pinned in
# fixtures/scl/scaler-appointment-test-data.ts.
#
# Re-grounding notes: legacy S04 (Delete/Edit controls hidden without permission), S06 (unauthorized direct
# POST) and S07 (role menu access) are blocked by single-role mock auth; S05 (Oracle child-constraint on
# delete) has no deterministic UI trigger. All logged as gaps in defects.md.
#
# @mode:serial — both slices seed via POST /api/scalers (non-atomic SCALER_LICENCE_NO, UC-SCL-002 Bug #1);
# serialising keeps the suite deterministic and lets the shared seed client be reused seed → clean → re-seed.
@scl @UC-SCL-006 @mode:serial
Feature: Delete Scaler Appointment

  @S01 @p0
  Scenario: Delete an appointment
    Given a scaler with an appointment to delete
    And I open the scaler Appointments tab
    When I click Delete on the appointment row
    Then I am asked to confirm the appointment deletion
    When I confirm the appointment deletion
    Then the appointment is removed
    And one appointment delete request is sent
    And the appointment list shows no appointments

  @S02 @p1
  Scenario: Cancelling the delete confirmation removes nothing
    Given a scaler with an appointment to delete
    And I open the scaler Appointments tab
    When I click Delete on the appointment row
    Then I am asked to confirm the appointment deletion
    When I cancel the appointment deletion
    Then the appointment delete confirmation is dismissed
    And no appointment delete request is sent
