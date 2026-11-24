# Chain: UC-RSK-006.md › -detailed.md › -slices.md › gherkin/UC-RSK-006-S05.feature › THIS FILE
#
# Re-grounded from UC-RSK-006 S05 (edit an existing assessment) onto the new React app. Notes:
#  - Edit is the routed page /scaler-risk-assessments/edit/:riskQuestionnaireId (same shared form,
#    mode="edit"). It loads existing responses/comments, offers Back / Reset / Save Assessment.
#  - The assessment under edit is SEEDED via the API (POST /scalers/{licence}/risk-assessments) so the
#    test owns its own record (parallel-safe) and cleans it up at the DB (no delete endpoint exists).
#  - The single-answer change keeps the product-rating in range (q243 326->325: rating 90 -> 108, still
#    High <= 123) so the edited row remains visible to the read-back.
#  - Back from EDIT lands on the owning scaler's Risk Rating tab — the SAME destination as a successful Save
#    (both go through config.successRedirect(detail) = /scalers/view/{licence}?tab=risk-rating). This matches
#    legacy and was fixed in #316 ("fixed bug with back button in risk assessments"): edit/view Back used to
#    go to config.listPath (/scaler-risk-assessments, the search page), which is why the discard scenario
#    below originally asserted the list. Back from CREATE (S04) is the different landing — createReturnPath.
#    The discard scenario asserts the tab landing and proves "without saving" by reading the seeded record
#    back unchanged.

@rsk @scaler @UC-RSK-006
Feature: Complete Scaler Risk Assessment — Edit

  @S05 @p1
  Scenario: District Scaling Manager edits an existing scaler assessment
    Given a completed scaler risk assessment exists for scaler "019D"
    And I am editing that scaler risk assessment
    When I change a scaler risk answer to a different in-range option
    And I enter scaler assessment comments "e2e RSK scaler edit — updated comments"
    And I save the scaler assessment
    Then I am returned to the Risk Rating tab for scaler "019D"
    And the updated scaler assessment reads back with rating "108" and my new comments

  # Back from view/edit returns to the owning scaler's Risk Rating tab, matching legacy (#316) — not the
  # assessment search page this scenario expected before that fix. Re-grounded 2026-09-30.
  @S05 @p2
  Scenario: District Scaling Manager backs out of editing a scaler assessment without saving
    Given a completed scaler risk assessment exists for scaler "019D"
    And I am editing that scaler risk assessment
    When I change a scaler risk answer to a different in-range option
    And I go back from the scaler assessment form
    Then I am returned to the Risk Rating tab for scaler "019D"
    And the scaler edit is discarded and the assessment still reads back with rating "90"
