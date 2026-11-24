# Chain: UC-MNT-001.md › -detailed.md › -slices.md › gherkin/UC-MNT-001-S02 › THIS FILE
#
# The read-only detail view is the entry point of the S02 edit flow (list → select → view → edit). This
# isolates the read-only render: seed a signatory via the API, open it from the list, assert its detail.
# Parallel-safe + self-cleaning (own record).

@mnt @UC-MNT-001
Feature: Maintain Signatories — View

  @S02 @p1
  Scenario: Administrator views a signatory's read-only detail
    Given a disposable signatory exists
    And I am on the Signatories list
    When I open the signatory for view
    Then the signatory view should show the seeded values
