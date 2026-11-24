# S03 (filter the training list by class). The Exams / Upgrades tab's Filter Select filters the loaded rows
# CLIENT-SIDE by class — no request. Read-ONLY on anchor 5828 (2 rows: one class-EXM, one class-UPG).
# Asserted by the always-rendered class Description ("Exam"/"Upgrade"), not the Type column: 5828's EXM row is
# the RETIRED type 2, absent from the active LOV, so its Type column falls back to raw code "2". Values pinned
# in fixtures/scl/scaler-exam-test-data.ts (RE-VERIFY 5828's rows on any DB re-extract).
@scl @UC-SCL-007
Feature: Filter Scaler Training List

  @S03 @p2
  Scenario: Filter the training list by class
    Given I open the Exams / Upgrades tab for the sample scaler
    Then the exams / upgrades list shows 2 rows
    When I filter the exams / upgrades by "Exam"
    Then only an exam / upgrade row of class "Exam" is shown
    When I filter the exams / upgrades by "Upgrade"
    Then only an exam / upgrade row of class "Upgrade" is shown
    When I filter the exams / upgrades by "All"
    Then the exams / upgrades list shows 2 rows
