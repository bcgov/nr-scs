# S03 (Reset reverts an edited date) and S04 (Back without saving) — both no-write paths, READ-ONLY on anchor
# 5828 (update-spy === 0). The editable row is type 1 "Interior Grading 1" (class UPG, in the active LOV so
# the Type column renders its description) with persisted completion 1989-06-08. Values pinned in
# fixtures/scl/scaler-exam-test-data.ts (RE-VERIFY 5828's rows on any DB re-extract).
@scl @UC-SCL-008
Feature: Update Scaler Training — Validation

  @S03 @p2
  Scenario: Reset reverts an edited completion date to the persisted value
    Given I open the Exams / Upgrades tab for the sample scaler
    When I change then reset the completion date of the "Interior Grading 1" training row
    Then the completion date field reverts to the persisted value
    And no training update request is sent

  @S04 @p2
  Scenario: Leaving the edit form via Back saves nothing
    Given I open the Exams / Upgrades tab for the sample scaler
    When I open the "Interior Grading 1" training row for editing and click Back
    Then the training edit form is closed
    And no training update request is sent
