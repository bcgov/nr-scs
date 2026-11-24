# Slice: UC-CHK-006-S04 (delete the entire summary check scale record)
# Re-grounded onto the new app: DELETE /api/summary-check-scales/{id} (SPG rows cascade), then the
# page navigates to the create form (legacy createAfterDelete forward -> /summary-check-scales/create).
# Self-cleaning by construction: the scenario deletes the record it seeded, so teardown finds it gone.
@chk @UC-CHK-006
Feature: Update Summary Check Scale — Delete Whole Record

  @S04 @p1
  Scenario: Check Scaler deletes the entire summary check scale record
    Given I am editing an existing summary check scale
    When I delete the entire record
    Then I should be taken to the create form
    And the summary check scale record should no longer exist
