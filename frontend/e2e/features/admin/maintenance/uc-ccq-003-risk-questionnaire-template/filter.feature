# Chain: UC-CCQ-003.md › -detailed.md › -slices.md › gherkin/UC-CCQ-003-S04 › THIS FILE
#
# Re-grounded from UC-CCQ-003 S04 (filter the list by Type). The seeded template is an MSD template;
# filtering to a DIFFERENT Type (SIA) must hide it, and filtering back to MSD must show it — proving the
# Type filter narrows the list both ways. Self-cleaning, parallel-safe.
@ccq @UC-CCQ-003
Feature: Maintain Templates — Filter

  @S04 @p1
  Scenario: Filtering by Type narrows the template list
    Given a disposable template exists
    And I am on the Templates list
    When I filter the templates to type "SIA"
    Then the seeded template should not appear in the filtered list
    When I filter the templates to type "MSD"
    Then the seeded template should appear in the filtered list
