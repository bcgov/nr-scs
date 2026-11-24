# Chain: UC-MNT-003.md › -detailed.md › -slices.md › gherkin/UC-MNT-003-S01 › THIS FILE
#
# Re-grounded from UC-MNT-003 S01 (view list + detail). Seeds its own record via the API, then opens it
# read-only from the list, so the asserted values are known (not brittle real-data) and the test is
# parallel-safe + self-cleaning.

@mnt @UC-MNT-003
Feature: Maintain Appointment Types — View

  @S01 @p1
  Scenario: Administrator views an appointment type's read-only detail
    Given a disposable appointment type exists
    And I am on the Appointment Types list
    When I open the appointment type for view
    Then the appointment type view should show the seeded values
