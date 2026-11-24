# Re-grounded from UC-CCQ-001 S04 (delete, not used) and S08 (delete blocked — question used in an
# inspection, ERR-001). Source: UC-CCQ-001-slices.md / -technical.md.
# Re-grounding note: legacy's ERR-001 message ("The current record has been associated to an
# Inspection.  Please set an expiry date for this Question.") is superseded by the new backend's own
# message ("This question has been used in an inspection and cannot be deleted.") — same rule,
# re-worded, not a divergence.

@ccq @UC-CCQ-001
Feature: Maintain Inspection Question — Delete

  @S04 @p0
  Scenario: Administrator deletes a question that has not been used in an inspection
    Given a disposable inspection question exists
    And I am on the Questions list
    When I open the question for view
    And I delete the question and confirm
    Then the question should no longer exist

  # ERR-001 (re-grounded, see feature header). Proves the negative directly (read-back), not inferred
  # from the modal closing.
  @S08 @p1
  Scenario: Delete is blocked when the question has been used in an inspection
    Given a disposable inspection question exists
    And the question has been used in an inspection
    And I am on the Questions list
    When I open the question for view
    And I delete the question and confirm
    Then an error banner should be shown
    And the question should still exist

  # Symmetry with UC-CCQ-003's @S07. The ConfirmDeleteModal component is shared, but each page wires its
  # own onCancel/onConfirm into it, so a Questions page that wired Cancel to the delete mutation would go
  # unnoticed — Templates' equivalent scenario cannot catch it.
  @S04 @p2
  Scenario: Cancelling the delete confirmation keeps the question
    Given a disposable inspection question exists
    And I am on the Questions list
    When I open the question for view
    And I delete the question and cancel
    Then the question should still exist
