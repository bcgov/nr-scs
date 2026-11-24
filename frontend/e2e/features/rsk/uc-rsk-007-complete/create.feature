# Chain: UC-RSK-007.md › -detailed.md › -slices.md › gherkin/UC-RSK-007-S01.feature / -S02.feature › THIS FILE
#
# Re-grounded from UC-RSK-007 S01 (happy create) + S02 (cancel) onto the new React app. Notes:
#  - Legacy Struts screens (.scaleSiteAssessmentsView P059 / .scaleSiteAssessmentsAdd P112) become the
#    Scale Site view's Risk Rating tab (/scale-sites/view/:id?tab=risk-rating) and the routed create page
#    (/scale-sites/:id/risk-assessments/create), both driven by components/Form/RiskAssessment.
#  - The questionnaire answers are Carbon <Select id="question-<questionId>"> dropdowns, NOT the legacy
#    radios; a computed rating must land inside a defined risk range (template 6: 18-141) or the row is
#    invisible to every read path — the in-range answer set (fixtures/rsk) is chosen accordingly.
#  - S02 "Cancel Assessment" re-grounds to Back: the new app never persists until Save, so Back = discard.
#    There is no Cancel button and no cancel/delete endpoint. S02 runs on site 525 (nothing creates on it)
#    so the empty-list + no-write assertions are parallel-safe; the happy path mutates only site 520.

@rsk @UC-RSK-007
Feature: Complete Scale Site Risk Assessment — Create

  @S01 @p0
  Scenario: District Scaling Manager completes a new site risk assessment
    Given I am on the Risk Rating tab for scale site "520"
    When I click Add Risk Assessment
    And I answer every risk question with the in-range answer set
    And I enter assessment comments "e2e RSK scale site create"
    And I save the assessment
    Then the assessment is created with a computed rating of "90" and level "High"
    And I am returned to the Risk Rating tab for scale site "520"
    And the saved assessment reads back with my answers and comments

  # The form computes and displays the rating client-side as answers are picked (product of each section's
  # summed weights — the same rule the backend applies), so the user sees the total BEFORE saving. Asserted
  # on the create form with nothing saved: no POST is sent, so this is parallel-safe and needs no cleanup.
  # The persisted rating is covered separately by the @p0 read-back above.
  # The "out of 3780" is the FORM's product-of-max-weights ceiling (36 x 105), which is deliberately NOT
  # the API's SUM-based maxRiskRating of 141 — see defects.md "Verified — not a defect".
  @S01 @p1
  Scenario: The form shows the computed rating before the assessment is saved
    Given I am on the Scale Site Risk Assessment create screen for scale site "520"
    When I answer every risk question with the in-range answer set
    Then the assessment form shows a computed total of "90" out of "3780"
    And no risk assessment create request should be sent

  # The Risk Rating tab lists a site's assessments. Verified on a FRESH tab mount (the query fetches
  # current rows, scoped to this test's own seeded id — parallel-safe). NB: the SAME assertion made
  # immediately after an in-app create is NOT reliable because the tab serves a stale react-query cache
  # (global refetchOnMount:false, no invalidation on create) — logged as defects.md Divergence #2.
  @S01 @p1
  Scenario: The Risk Rating tab lists a site's assessments
    Given a completed scale site risk assessment exists on site "520"
    And I am on the Risk Rating tab for scale site "520"
    Then the assessment is listed on the site's Risk Rating tab

  @S02 @p1
  Scenario: District Scaling Manager backs out of a new assessment without saving
    Given I am on the Scale Site Risk Assessment create screen for scale site "525"
    And I answer every risk question with the in-range answer set
    When I go back from the assessment form
    Then I am returned to the Risk Rating tab for scale site "525"
    And the Risk Rating list is empty
    And no risk assessment create request should be sent
