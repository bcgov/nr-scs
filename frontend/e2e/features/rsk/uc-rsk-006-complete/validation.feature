# Chain: UC-RSK-006.md › -detailed.md › -slices.md › gherkin/UC-RSK-006-S02.feature / -S03.feature / -S05.feature › THIS FILE
#
# Re-grounded validation slices onto the new React app:
#  - S02 (all questions required on CREATE, ERR-001): the shared form's onSave gate blocks the POST and
#    shows ERR-001 verbatim. Proven by the create spy = 0 (no write left the browser).
#  - S05 edit-arm (answer-completeness on EDIT): edit now MIRRORS create — every question must be answered.
#    The shared form's onSave gate blocks the PUT and shows "All questions must be answered…", keeping the
#    user on the edit form; enforced client-side (RiskAssessment/index.tsx onSave, edit branch →
#    allQuestionsAnswered) and server-side (RiskQuestionnaireService.save → requireAllAnswered). History: the
#    original divergence (the PUT deleted all responses and surfaced a misleading "record not found" 404) was
#    first fixed 2026-09-23 with an "at least one answer" rule (defects.md Divergence #1); that rule was
#    superseded 2026-10-01 by "all answered" because a sparse-but-non-empty edit still rated below the lowest
#    band, 404'd on re-save, and would have vanished from the banded view. Same rule holds on the scale-site
#    twin (UC-RSK-007 S05).
#  - S03 (comments > 4000, ERR-003): re-grounded — the Comments TextArea hard-caps input at 4000
#    (maxLength), so the legacy length message is not browser-reachable; the constraint is proven by the
#    cap holding when over-typing. Same TextArea component on create + edit (one arm asserted).

@rsk @scaler @UC-RSK-006
Feature: Complete Scaler Risk Assessment — Validation

  @S02 @p1 @ERR-001
  Scenario: District Scaling Manager submits a new scaler assessment with a question unanswered
    Given I am on the Scaler Risk Assessment create screen for scaler "019D"
    And I answer every scaler risk question except the first
    When I save the scaler assessment
    Then I should see the error "All questions must be answered in order to save the assessment."
    And I should remain on the scaler assessment form
    And no scaler risk assessment create request should be sent

  # Regression guard for defects.md Divergence #1 and its 2026-10-01 follow-on: edit mirrors create, so an
  # incomplete edit is rejected with "All questions must be answered…" and keeps the user on the form — it
  # never saves a sub-complete (below-band) assessment or surfaces a "record not found" 404. Clearing every
  # answer is the extreme of "not all answered"; the single-answer-missing case is guarded at the unit level
  # (Edit browser test "rejects a save that leaves any question unanswered").
  @S05 @p1 @ERR-002
  Scenario: An incomplete scaler edit (any question unanswered) is rejected
    Given a completed scaler risk assessment exists for scaler "019D"
    And I am editing that scaler risk assessment
    When I clear every scaler risk answer
    And I save the scaler assessment
    Then I should see the error "All questions must be answered in order to save the assessment."
    And I should remain on the scaler edit form for that assessment

  @S03 @p2 @ERR-003
  Scenario: The Comments field caps input at the maximum length
    Given I am on the Scaler Risk Assessment create screen for scaler "019D"
    When I type 4050 characters into the scaler comments field
    Then the scaler comments field holds at most 4000 characters
