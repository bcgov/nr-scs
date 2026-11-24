# Chain: UC-MNT-003.md › -detailed.md › -slices.md › gherkin/UC-MNT-003-S03/S08 › THIS FILE
#
# Re-grounded from UC-MNT-003 S03 (edit an existing type) and S08 (edit blocked — required field cleared).
# Each scenario seeds its OWN fresh appointment type via the API, then edits it — self-cleaning and
# parallel-safe (no shared mutable row). Like create, a successful save forwards to the read-only view.
# The Appointment Type code (PK) is disabled in edit mode, so only Description/Acting/dates are editable.

@mnt @UC-MNT-003
Feature: Maintain Appointment Types — Update

  @S03 @p0
  Scenario: Administrator updates an existing appointment type
    Given a disposable appointment type exists
    And I am on the Appointment Types list
    When I open the appointment type for view
    And I open the appointment type edit form
    And I set the appointment type "Description" field to "E2E MNT updated description"
    And I save the appointment type
    Then the saved appointment type should match the submitted values

  @S08 @p1
  Scenario: Update is blocked when the Description is cleared
    Given a disposable appointment type exists
    And I am on the Appointment Types list
    When I open the appointment type for view
    And I open the appointment type edit form
    And I clear the appointment type "Description" field
    And I save the appointment type
    Then I should see the error "Description is required."
    And no update-appointment-type request should be sent
