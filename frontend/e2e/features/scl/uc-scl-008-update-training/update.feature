# S01 (update the completion date) and S07 (clear the optional date). A row's "Edit" reopens the SAME modal
# titled "Exams / Upgrades - Edit" (type Select disabled; only the date editable → PUT .../exams/{typeId}).
# Each slice SEEDS its OWN scaler + one training row (type 5, completion 60 days ago), edits it in place, and
# tears the row down before the scaler (ORA-02292). Values pinned in fixtures/scl/scaler-exam-test-data.ts.
# @mode:serial — seeds via POST /api/scalers, whose SCALER_LICENCE_NO generation isn't concurrency-safe.
@scl @UC-SCL-008 @mode:serial
Feature: Update Scaler Training

  @S01 @p0
  Scenario: Update a training row's completion date
    Given a scaler with a training row exists to update
    And I open the scaler Exams / Upgrades tab
    When I change the completion date of the "Acting Scaler Exam" training row
    Then the "Acting Scaler Exam" training row shows the updated completion date
    And one training update request is sent

  @S07 @p1
  Scenario: Clear a training row's completion date
    Given a scaler with a training row exists to update
    And I open the scaler Exams / Upgrades tab
    When I clear the completion date of the "Acting Scaler Exam" training row
    Then the "Acting Scaler Exam" training row shows no completion date
    And one training update request is sent
