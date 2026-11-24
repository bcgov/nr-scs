# Re-grounded from UC-CCQ-001 S03 (update, not previously used) and S07 (update blocked — partial edit
# when the question HAS been used in an inspection). Source: UC-CCQ-001-slices.md / -technical.md
# (STA-002). Symmetry note (see coverage.md): -slices.md deliberately does not duplicate the full
# S05/S06 validation matrix for the update path ("covered in the notes... rather than duplicating
# slices") since the same `validateQuestionRequestParams` runs for both create and update — one
# representative scenario here (`@S03-validation`) confirms that parity without re-testing every row.
#
# Like create, a successful save forwards to the read-only VIEW of the saved record (shared
# `saveMutation.onSuccess` in QuestionsAdminPage) — S03/S07 assert the view is shown after save. This
# was previously a divergence (the modal just closed); now resolved — see defects.md Divergence #1.

@ccq @UC-CCQ-001
Feature: Maintain Inspection Question — Update

  @S03 @p0
  Scenario: Administrator updates a question that has not been used in an inspection
    Given a disposable inspection question exists
    And I am on the Questions list
    When I open the question for view
    And I open the edit form
    And I set the question's "Question" field to "Updated E2E CCQ question text"
    And I save the question
    Then the question should be shown in the view
    And the saved question should match the submitted values

  @S03-validation @p1
  Scenario: Update is blocked when a required field is cleared (create/update parity)
    Given a disposable inspection question exists
    And I am on the Questions list
    And I open the question for view
    And I open the edit form
    When I clear the question's "Question" field
    And I save the question
    Then I should see the error "Question is required."
    And no update-question request should be sent

  # STA-002 (re-grounded): legacy showed "Note: This question has been used in an inspection and cannot
  # be deleted. As a result only the Sort Order and Expiry Date can be updated." — the new app renders
  # an equivalent info banner and disables every field except Sort Order / Expiry Date
  # (`QuestionsModal isReadOnly`). The server independently enforces the same restriction
  # (`InspectionQuestionService.updateQuestion` forces non-Sort-Order/Expiry fields back to their
  # existing values when `questionUsed=true`), so this is defense-in-depth, not UI-only.
  @S07 @p1
  Scenario: Update is restricted to Sort Order and Expiry Date when the question has been used
    Given a disposable inspection question exists
    And the question has been used in an inspection
    And I am on the Questions list
    When I open the question for view
    And I open the edit form
    Then an info banner should explain only Sort Order and Expiry Date can be updated
    And the "Question" field should be disabled
    And the "Inspection Type" field should be disabled
    And the "Scaling Methods" field should be disabled
    And the "Valid Responses" field should be disabled
    And the "Comment Required" field should be disabled
    And the "Effective Date" field should be disabled
    When I set the question's "Sort Order" field to "777"
    And I set the Expiry Date to 3650 days in the future
    And I save the question
    Then the question should be shown in the view
    And only the Sort Order and Expiry Date should have changed
