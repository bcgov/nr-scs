# Chain: UC-RSK-007.md › -detailed.md › -slices.md › gherkin/UC-RSK-007-S04.feature / -S05.feature / -S06.feature › THIS FILE
#
# Re-grounded validation slices onto the new React app:
#  - S04 (all questions required on CREATE): the shared form's onSave gate blocks the POST and shows
#    ERR-001 verbatim. Proven by the create spy = 0 (no write left the browser).
#  - S05 (answer-completeness on EDIT): edit now MIRRORS create — every question must be answered. The
#    shared form's onSave gate blocks the PUT and shows "All questions must be answered…", keeping the user
#    on the edit form. Enforced client-side (RiskAssessment/index.tsx onSave, edit branch →
#    allQuestionsAnswered) and server-side (RiskQuestionnaireService.save → requireAllAnswered). History:
#    the original divergence (the PUT deleted all responses and surfaced a misleading "record not found"
#    404) was first fixed 2026-09-23 with an "at least one answer" rule (defects.md Divergence #1); that
#    rule was superseded 2026-10-01 by "all answered" because a sparse-but-non-empty edit still rated below
#    the lowest risk band, 404'd on re-save, and would have vanished from the banded view (see the
#    follow-on divergence).
#  - S06 (comments > 4000, ERR-003): re-grounded — the Comments TextArea hard-caps input at 4000
#    (maxLength), so the legacy length message is not browser-reachable; the constraint is proven by the
#    cap holding when over-typing. Same TextArea component on create + edit (one arm asserted).

@rsk @UC-RSK-007
Feature: Complete Scale Site Risk Assessment — Validation

  @S04 @p1 @ERR-001
  Scenario: District Scaling Manager submits a new assessment with a question unanswered
    Given I am on the Scale Site Risk Assessment create screen for scale site "520"
    And I answer every risk question except the first
    When I save the assessment
    Then I should see the error "All questions must be answered in order to save the assessment."
    And I should remain on the assessment form
    And no risk assessment create request should be sent

  # Regression guard for defects.md Divergence #1 and its 2026-10-01 follow-on: edit mirrors create, so an
  # incomplete edit is rejected with "All questions must be answered…" and keeps the user on the form — it
  # never saves a sub-complete (below-band) assessment or surfaces a "record not found" 404. Clearing every
  # answer is the extreme of "not all answered"; the single-answer-missing case is guarded at the unit level
  # (Edit browser test "rejects a save that leaves any question unanswered").
  @S05 @p1 @ERR-002
  Scenario: An incomplete edit (any question unanswered) is rejected
    Given a completed scale site risk assessment exists on site "520"
    And I am editing that risk assessment
    When I clear every risk answer
    And I save the assessment
    Then I should see the error "All questions must be answered in order to save the assessment."
    And I should remain on the edit form for that assessment

  @S06 @p2 @ERR-003
  Scenario: The Comments field caps input at the maximum length
    Given I am on the Scale Site Risk Assessment create screen for scale site "520"
    When I type 4050 characters into the comments field
    Then the comments field holds at most 4000 characters
