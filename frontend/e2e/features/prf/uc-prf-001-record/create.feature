# Re-grounded from UC-PRF-001 (Record Scaler Performance Remark). Legacy Struts screens
# (.scalerPerformanceRemarkCreate/.scalerPerformanceRemark) are now an in-tab state swap on the Scaler view
# (?tab=performance-remarks); the licence is a URL path param, not a session tombstone. See coverage.md.
@prf @UC-PRF-001
Feature: Record Scaler Performance Remark — create

  Background:
    Given I am on the Performance Remarks tab for the anchor scaler

  @p0 @S01
  Scenario: S01 Create a performance remark with an Action (happy path)
    When I open the Add Performance Remark form
    And I enter a valid performance remark
    And I click Save Record
    Then I should be returned to the remarks list
    And the new remark should be listed
    And the saved remark should match what I entered

  @p1 @S02
  Scenario: S02 Create a performance remark with an Outcome instead of an Action
    When I open the Add Performance Remark form
    And I enter a valid performance remark with an Outcome
    And I click Save Record
    Then I should be returned to the remarks list
    And the new remark should be listed
    And the saved remark should match what I entered

  # Symmetry with the S10 negative: a well-formed, existing check scale is accepted and persisted.
  @p1 @S01
  Scenario: Create a remark linked to an existing check scale
    When I open the Add Performance Remark form
    And I enter a valid performance remark
    And I link an existing check scale
    And I click Save Record
    Then I should be returned to the remarks list
    And the new remark should be listed
    And the saved remark should reference the linked check scale
