# Slice: UC-CHK-006-S01 (header edit + save), UC-CHK-006-S05 (reset discards edits)
# Re-grounded from UC-CHK-006-S01.feature / -S05.feature onto the new React app:
#  - legacy /summaryCheckScaleViewUpdate.do -> /summary-check-scales/{id}/edit
#  - save persists via PUT /api/summary-check-scales/{id}; the page re-hydrates from the server
#  - reset reloads persisted values via a fresh GET (onReset refetch), no write occurs
@chk @UC-CHK-006
Feature: Update Summary Check Scale — Header Edits

  @S01 @p0
  Scenario: Check Scaler edits header fields and saves
    Given I am editing an existing summary check scale
    When I change the "Check Scaler Comment" field to "UPDATED via e2e"
    And I change the "Followed Good Practices" field to "No"
    And I change the "Check Scale Type" field to "SEC"
    And I save the summary check scale
    Then I should remain on the update form
    And the saved summary check scale header should reflect my changes

  @S05 @p1
  Scenario: Reset discards unsaved header edits
    Given I am editing an existing summary check scale
    When I change the "Check Scaler Comment" field to "unsaved edit that should vanish"
    And I reset the form
    Then the Check Scaler Comment should display "e2e seed original comment"
    And no update request should be sent
