#        (+ the app-enforced one-per-type duplicate rule, a spec gap absent from the slices) › THIS FILE
#
# S05 (required type) + S04 (Back without saving) are handled CLIENT-SIDE — no POST fires (create-spy === 0).
# S07-DUP selects a type 5828 ALREADY has: the POST fires and the DB unique key rejects it (HTTP 400), so it
# asserts the surfaced error + unchanged row count (2), NOT "no request sent". All READ-ONLY on anchor 5828.
# Tag note: the duplicate rule has no source slice number, so it's tagged @S07-DUP (not a plain @S<NN>) to mark
# it as the app-only duplicate case. Because it contains "@S07" as a substring, `--grep @S07` also matches
# UC-SCL-008's real @S07 — intentional, filter with the feature path or a stricter regex if you need only one.
# Values pinned in fixtures/scl/scaler-exam-test-data.ts.
@scl @UC-SCL-007
Feature: Record Scaler Training — Validation

  @S05 @p1
  Scenario: Blocked when no exam / upgrade type is selected
    Given I open the Exams / Upgrades tab for the sample scaler
    When I try to add an exam / upgrade without selecting a type
    Then I should see the exam / upgrade error "Exam / Upgrade is required."
    And the add exam / upgrade form is still open
    And no exam / upgrade create request is sent

  @S04 @p2
  Scenario: Leaving the create form via Back saves nothing
    Given I open the Exams / Upgrades tab for the sample scaler
    When I open the add exam / upgrade form and click Back
    Then the add exam / upgrade form is closed
    And no exam / upgrade create request is sent

  @S07-DUP @p1
  Scenario: Server rejects a duplicate training type for the scaler
    Given I open the Exams / Upgrades tab for the sample scaler
    When I try to add an exam / upgrade for a type the scaler already has
    Then I should see the exam / upgrade error "A record already exists with the same unique key."
    And the add exam / upgrade form is still open
    And the exams / upgrades list shows 2 rows
