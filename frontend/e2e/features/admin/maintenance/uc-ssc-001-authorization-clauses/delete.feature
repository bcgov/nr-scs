# Chain: UC-SSC-001.md › -detailed.md › -slices.md › gherkin/UC-SSC-001-S03 › THIS FILE
#
# Re-grounded from UC-SSC-001 S03 (delete existing clause). Authorization Clauses have NO dependent-child
# guard (unlike Conditions), so a created clause is always deletable — the scenario seeds its own row and
# removes it. Delete confirms via the shared ConfirmDeleteModal, then read-back PROVES it is gone.

@ssc @UC-SSC-001
Feature: Maintain Authorization Clauses — Delete

  @S03 @p0
  Scenario: Administrator deletes a clause and it is removed
    Given a disposable authorization clause exists
    And I am on the Authorization Clauses list
    When I open the authorization clause for view
    And I delete the authorization clause and confirm
    Then the authorization clause should no longer exist
