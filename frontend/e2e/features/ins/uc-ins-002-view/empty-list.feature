# Chain: UC-INS-002.md › -detailed.md › -slices.md › gherkin/UC-INS-002-S05.feature › THIS FILE
#
# Re-grounded from UC-INS-002 S05 (inspections list empty). The legacy JSP showed the table header with
# zero data rows; the new React InspectionsTab shows a "No inspections found" empty section plus the
# Add Inspection button, and NO error. Site 16H is a forest_client-backed site that no create test
# mutates and has zero scale_inspection_report rows in this extract, so its viewable-inspection list is
# reliably empty (parallel-safe; re-grounded 2026-07-21, was 561). This shares the empty-list
# STATE with UC-INS-001 navigation @S04, and deliberately reuses the same tab step definitions (shared
# code, not shared state); it is kept as its own UC-INS-002 scenario for traceability.

@ins @UC-INS-002
Feature: View Site Inspection Details — empty inspections list

  @S05 @p1
  Scenario: A scale site with no inspections shows an empty list and no error
    Given I am viewing the inspections tab for scale site "16H"
    Then the inspections list is empty
    And no inspections load error is shown
    And the Add Inspection button is available
