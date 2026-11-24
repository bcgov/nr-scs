# Re-grounded from UC-PRF-003 (Delete Scaler Performance Remark). Delete is a Carbon confirm Modal
# ("Are you sure you want to delete this record?" / Confirm Delete / Cancel), not a browser confirm(). Each
# scenario seeds its own remark (a key it owns) so it is parallel-safe. Legacy S03 (session tombstone), S04
# (URL-tamper auth) and S05 (permission-hidden controls) are not-applicable in the new app — see coverage.md.
@prf @UC-PRF-003
Feature: Delete Scaler Performance Remark

  Background:
    Given a performance remark exists for the anchor scaler

  @p0 @S01
  Scenario: S01 Delete a remark after confirming
    When I delete that remark
    And I confirm the deletion
    Then the remark should no longer be listed
    And the remark should be gone from the database

  @p1 @S02
  Scenario: S02 Cancel the delete confirmation keeps the remark
    When I delete that remark
    And I cancel the delete confirmation
    Then the remark should still be listed
    And the remark should still exist in the database
