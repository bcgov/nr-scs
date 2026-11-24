# S01 (delete a training row). Seeds its OWN scaler + one training row (type 5 'Acting Scaler Exam', with a
# completion date), then deletes it via the Exams / Upgrades row "Delete" → confirm modal (CNF-001) → DELETE
# .../exams/{typeId}; deleting the last row leaves the tab's empty state. Values pinned in
# fixtures/scl/scaler-exam-test-data.ts.
# @mode:serial — seeds via POST /api/scalers, whose SCALER_LICENCE_NO generation isn't concurrency-safe.
@scl @UC-SCL-009 @mode:serial
Feature: Delete Scaler Training

  @S01 @p0
  Scenario: Delete a training row
    Given a scaler with a training row to delete
    And I open the scaler Exams / Upgrades tab
    When I delete the "Acting Scaler Exam" training row
    Then I am asked to confirm the training deletion
    When I confirm the training deletion
    Then the exams / upgrades list is empty
    And one exam / upgrade delete request is sent
