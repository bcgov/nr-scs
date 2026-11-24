# Chain: UC-RSK-007.md › -detailed.md › -slices.md › gherkin/UC-RSK-007-S03.feature › THIS FILE
#
# Re-grounded from UC-RSK-007 S03 (edit an existing assessment) onto the new React app. Notes:
#  - Edit is the routed page /scale-site-risk-assessments/edit/:riskQuestionnaireId (same shared form,
#    mode="edit"). It loads existing responses/comments, offers Back / Reset / Save Assessment.
#  - The assessment under edit is SEEDED via the API (POST /scale-sites/{id}/risk-assessments) so the
#    test owns its own record (parallel-safe) and cleans it up at the DB (no delete endpoint exists).
#  - The single-answer change keeps the product-rating in range (q281 403->402: rating 90 -> 135, still
#    High <= 141) so the edited row remains visible to the read-back.

@rsk @UC-RSK-007
Feature: Complete Scale Site Risk Assessment — Edit

  @S03 @p1
  Scenario: District Scaling Manager edits an existing assessment
    Given a completed scale site risk assessment exists on site "520"
    And I am editing that risk assessment
    When I change the first risk answer to a different in-range option
    And I enter assessment comments "e2e RSK scale site edit — updated comments"
    And I save the assessment
    Then I am returned to the Risk Rating tab for scale site "520"
    And the updated assessment reads back with rating "135" and my new comments
