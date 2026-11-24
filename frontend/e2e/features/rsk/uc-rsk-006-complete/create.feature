# Chain: UC-RSK-006.md › -detailed.md › -slices.md › gherkin/UC-RSK-006-S01.feature / -S04.feature › THIS FILE
#
# Re-grounded from UC-RSK-006 S01 (happy create) + S04 (cancel draft) onto the new React app. Notes:
#  - Legacy Struts screens (.scalerAssessmentsView P115 / .scalerAssessmentsAdd P116) become the Scaler
#    view's Risk Rating tab (/scalers/view/:scalerLicenceNo?tab=risk-rating) and the routed create page
#    (/scalers/:scalerLicenceNo/risk-assessments/create), both driven by components/Form/RiskAssessment.
#  - The questionnaire answers are Carbon <Select id="question-<questionId>"> dropdowns, NOT the legacy
#    radios; a computed rating must land inside a defined risk range (SCLE template 5: 9-123) or the row is
#    invisible to every read path — the in-range answer set (fixtures/rsk/scaler-risk-complete-test-data)
#    is chosen accordingly (product 6 x 15 = 90 -> High).
#  - S04 "Cancel Assessment" re-grounds to Back: the new app never persists until Save, so Back = discard.
#    There is no Cancel button and no cancel/delete endpoint. S04 runs on scaler 044E (nothing creates on
#    it) so the empty-list + no-write assertions are parallel-safe; the happy path mutates only 019D.

@rsk @scaler @UC-RSK-006
Feature: Complete Scaler Risk Assessment — Create

  @S01 @p0
  Scenario: District Scaling Manager completes a new scaler risk assessment
    Given I am on the Risk Rating tab for scaler "019D"
    When I add a risk assessment from the scaler's Risk Rating tab
    And I answer every scaler risk question with the in-range answer set
    And I enter scaler assessment comments "e2e RSK scaler create"
    And I save the scaler assessment
    Then the scaler assessment is created with a computed rating of "90" and level "High"
    And I am returned to the Risk Rating tab for scaler "019D"
    And the saved scaler assessment reads back with my answers and comments

  # The form computes and displays the rating client-side as answers are picked (product of each section's
  # summed weights — the same rule the backend applies), so the user sees the total BEFORE saving. Asserted
  # on the create form with nothing saved: no POST is sent, so this is parallel-safe and needs no cleanup.
  # The persisted rating is covered separately by the @p0 read-back above. The "out of 1890" is the FORM's
  # product-of-max-weights ceiling (18 x 105), deliberately NOT the API's SUM-based maxRiskRating of 123.
  @S01 @p1
  Scenario: The create form shows the scaler record header and the computed rating before save
    Given I am on the Scaler Risk Assessment create screen for scaler "019D"
    And the scaler record header shows the pinned client, region and district
    When I answer every scaler risk question with the in-range answer set
    Then the scaler assessment form shows a computed total of "90" out of "1890"
    And no scaler risk assessment create request should be sent

  # The Risk Rating tab lists a scaler's assessments. Verified on a FRESH tab mount (the query fetches
  # current rows, scoped to this test's own seeded id — parallel-safe). NB: the SAME assertion made
  # immediately after an in-app create is NOT reliable because the tab serves a stale react-query cache
  # (global refetchOnMount:false, no invalidation on create) — the scale-site twin logged this as its
  # Divergence #2; the scaler suite avoids it the same way (assert on a fresh mount).
  @S01 @p1
  Scenario: The Risk Rating tab lists a scaler's assessments
    Given a completed scaler risk assessment exists for scaler "019D"
    And I am on the Risk Rating tab for scaler "019D"
    Then the assessment is listed on the scaler's Risk Rating tab

  @S04 @p1
  Scenario: District Scaling Manager backs out of a new scaler assessment without saving
    Given scaler "044E" starts with an empty Risk Rating tab
    And I am on the Scaler Risk Assessment create screen for scaler "044E"
    And I answer every scaler risk question with the in-range answer set
    When I go back from the scaler assessment form
    Then I am returned to the Risk Rating tab for scaler "044E"
    And the scaler Risk Rating list is empty
    And no scaler risk assessment create request should be sent
