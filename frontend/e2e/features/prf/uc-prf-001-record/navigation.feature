# Re-grounded from UC-PRF-001 S03 (Reset), S04 (Back), plus the empty-list read state. No Background: the
# empty-list scenario uses a different, never-written scaler (parallel-safe) than the mutating ones.
@prf @UC-PRF-001
Feature: Record Scaler Performance Remark — form navigation

  @p2 @S04
  Scenario: S04 Abandon create via Back — no remark is created
    Given I am on the Performance Remarks tab for the anchor scaler
    When I open the Add Performance Remark form
    And I enter a valid performance remark
    And I go Back without saving
    Then I should be returned to the remarks list
    And no performance-remark create request should be sent

  @p2 @S03
  Scenario: S03 Reset clears the create form
    Given I am on the Performance Remarks tab for the anchor scaler
    When I open the Add Performance Remark form
    And I enter a valid performance remark
    And I reset the performance remark form
    Then the create form should be cleared

  @p2
  Scenario: A scaler with no remarks shows the empty state
    Given I am on the Performance Remarks tab for a scaler with no remarks
    Then the scaler should have no performance remarks listed
