# Chain: UC-INS-002.md › -detailed.md › -slices.md › gherkin/UC-INS-002-S02.feature › THIS FILE
#
# Re-grounded from UC-INS-002 S02 (inspection record not found). Legacy behaviour: the app forwarded
# BACK to the inspections list and rendered "The selected record could not be found." (ERR-001). The
# new React view instead STAYS on the view route and renders a "Could not load inspection" empty
# section (the detail GET returns non-OK for a missing id). This is a behavioural re-grounding, NOT a
# defect — the user is still clearly told the record is unavailable; it is logged in coverage.md.
# Recovery is re-grounded to opening a valid inspection directly (there is no sticky list error state).

@ins @UC-INS-002
Feature: View Site Inspection Details — record not found

  @S02 @p1
  Scenario: Opening a missing inspection shows a not-found message
    When I open a missing site inspection on scale site "520"
    Then the inspection view shows a not-found message

  @S02 @p2
  Scenario: A valid inspection still opens after a not-found lookup
    When I open a missing site inspection on scale site "520"
    And I then open a recorded inspection on the same scale site
    Then the site inspection view loads without error
