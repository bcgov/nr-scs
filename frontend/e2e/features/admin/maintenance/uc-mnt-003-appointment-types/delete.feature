# Chain: UC-MNT-003.md › -detailed.md › -slices.md › gherkin/UC-MNT-003-S04/S09 › THIS FILE
#
# Re-grounded from UC-MNT-003 S04 (delete a type WITHOUT dependents) and S09 (delete BLOCKED by dependent
# children).
#  - S04 seeds its own fresh, childless appointment type via the API, then deletes it through the UI and
#    proves it is gone — self-cleaning (the seed's cleanup registry 404-tolerates the already-deleted row).
#  - S09 opens a REAL appointment type that has dependent scaler_valid_licence_attribute rows (see fixture
#    provenance). The backend rejects the delete with HTTP 400 and the row survives — so the operation is
#    read-only / parallel-safe. Re-grounding note: legacy blocked this client-side with a JS alert (STA-005);
#    the new app enforces the same rule server-side and surfaces a clean message. The RULE is upheld either
#    way, so this is a green test (not a divergence).

@mnt @UC-MNT-003
Feature: Maintain Appointment Types — Delete

  @S04 @p0
  Scenario: Administrator deletes an appointment type with no dependents
    Given a disposable appointment type exists
    And I am on the Appointment Types list
    When I open the appointment type for view
    And I delete the appointment type and confirm
    Then the appointment type should no longer exist

  @S09 @p1
  Scenario: Delete is blocked when the appointment type has dependent records
    Given an appointment type with dependent records exists
    And I am on the Appointment Types list
    When I open the appointment type for view
    And I delete the appointment type and confirm
    Then I should see the error "Appointment type has dependent records and cannot be deleted."
    And the appointment type should still exist
