# Re-grounded from UC-PRF-002 (Update Scaler Performance Remark). Each scenario seeds its own remark via the
# API (a fresh key it owns) so it is parallel-safe on the shared anchor scaler. Edit is an in-tab swap, not a
# route; it is reachable from the summary row Edit button AND from the read-only detail view (S04).
@prf @UC-PRF-002
Feature: Update Scaler Performance Remark

  Background:
    Given a performance remark exists for the anchor scaler

  @p0 @S01
  Scenario: S01 Update a remark's Description (happy path)
    When I open that remark's edit form from the list
    And I edit the Description to "E2E updated: corrected after supervisor review."
    And I click Save Record
    Then I should be returned to the remarks list
    And the remark should be updated to my new Description

  @p1 @S04
  Scenario: S04 Reach the edit form via the read-only detail view
    When I open that remark's detail view
    And I click Edit Record on the detail view
    And I edit the Description to "E2E updated via the detail view."
    And I click Save Record
    Then I should be returned to the remarks list
    And the remark should be updated to my new Description

  @p2 @S03
  Scenario: S03 Back from the edit form discards changes
    When I open that remark's edit form from the list
    And I edit the Description to "E2E should not persist (Back)."
    And I go Back without saving
    Then the remark should still have its original Description

  @p2 @S02
  Scenario: S02 Reset restores the original values before saving
    When I open that remark's edit form from the list
    And I edit the Description to "E2E should not persist (Reset)."
    And I reset the performance remark form
    And I click Save Record
    Then I should be returned to the remarks list
    And the remark should still have its original Description
