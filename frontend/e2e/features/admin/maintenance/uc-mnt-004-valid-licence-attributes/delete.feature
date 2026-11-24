# Chain: UC-MNT-004.md › -detailed.md › -slices.md › gherkin/UC-MNT-004-S09 › THIS FILE
#
# Re-grounded from UC-MNT-004 S09 (delete blocked by dependent records). Unlike ExamUpgrades, this screen
# performs a CLIENT-side dependent check: on the Delete click it shows a "Cannot delete" warning and
# HIDES the Delete button entirely (no server call). Opened read-only on a real dependent record —
# parallel-safe, no seed/cleanup. (S03 delete-without-dependents is deferred — see
# defects.md Coverage gaps: no childless real combo exists and self-seeded B/NA rows aren't reliably
# openable from the list.)

@mnt @UC-MNT-004
Feature: Maintain Valid Licence Attributes — Delete

  @S09 @p1
  Scenario: Delete is blocked when the licence attribute has dependent records
    Given a licence attribute with dependent records exists
    And I am on the Valid Licence Attributes list
    When I open the dependent licence attribute for view
    And I request to delete the licence attribute
    Then I should see the delete-blocked warning
    And the licence attribute should still exist
