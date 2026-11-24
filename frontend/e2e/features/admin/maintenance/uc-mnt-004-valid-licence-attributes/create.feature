# Chain: UC-MNT-004.md › -detailed.md › -slices.md › gherkin/UC-MNT-004-S01 › THIS FILE
#
# Re-grounded from UC-MNT-004 S01 (create happy path). Save forwards to the read-only view; the composite
# key (grading system + appointment type) is chosen up front, so read-back needs no id discovery.
#
# @mode:serial — the only FREE, UI-selectable combo is grading system B ("Both") + appointment type A
# (all C/I combos already exist). That single combo is a shared finite resource, so this scenario (and
# its repeat-each stress repeats) must run serially to create → read back → delete it without a
# duplicate-key collision. See coverage.md for the data constraint.

@mnt @UC-MNT-004 @mode:serial
Feature: Maintain Valid Licence Attributes — Create

  @S01 @p0
  Scenario: Administrator creates a new valid licence attribute
    Given I am on the Valid Licence Attributes list
    When I open the licence attribute create form
    And I enter a valid licence attribute
    And I save the licence attribute
    And the created licence attribute is registered for cleanup
    Then the licence attribute should be shown in the view
    And the saved licence attribute should match the submitted values
