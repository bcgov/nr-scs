# S01 (create training with type + date) and S02 (create without the optional date). Each slice seeds its OWN
# parent scaler, adds 'Acting Scaler Exam' via the Exams / Upgrades create modal, and tears the row down
# before the scaler (ORA-02292). Values pinned in fixtures/scl/scaler-exam-test-data.ts.
# @mode:serial — seeds via POST /api/scalers, whose SCALER_LICENCE_NO generation isn't concurrency-safe.
@scl @UC-SCL-007 @mode:serial
Feature: Record Scaler Training

  @S01 @p0
  Scenario: Record a training row with a completion date
    Given a scaler exists to record training for
    And I open the scaler Exams / Upgrades tab
    When I add an exam / upgrade with a completion date
    Then the exam / upgrade row for "Acting Scaler Exam" appears
    And the exam / upgrade row for "Acting Scaler Exam" shows the completion date
    And one exam / upgrade create request is sent

  @S02 @p1
  Scenario: Record a training row without the optional completion date
    Given a scaler exists to record training for
    And I open the scaler Exams / Upgrades tab
    When I add an exam / upgrade without a completion date
    Then the exam / upgrade row for "Acting Scaler Exam" appears
    And the exam / upgrade row for "Acting Scaler Exam" shows no completion date
    And one exam / upgrade create request is sent
