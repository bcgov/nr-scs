# S02 (cancel the delete confirmation) — READ-ONLY on anchor 5828 (2 training rows). Clicking Delete on the
# "Interior Grading 1" row (type 1, class UPG, in the active LOV so it's identifiable) opens the confirm
# modal; Cancel dismisses it with no DELETE (delete-spy === 0) and the list still shows both rows. Values
# pinned in fixtures/scl/scaler-exam-test-data.ts (RE-VERIFY 5828's rows on any DB re-extract).
@scl @UC-SCL-009
Feature: Delete Scaler Training — Cancel

  @S02 @p1
  Scenario: Cancelling the delete confirmation removes nothing
    Given I open the Exams / Upgrades tab for the sample scaler
    When I delete the "Interior Grading 1" training row
    Then I am asked to confirm the training deletion
    When I cancel the training deletion
    Then the training deletion is cancelled and 2 rows remain
    And no exam / upgrade delete request is sent
