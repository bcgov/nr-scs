# Re-grounded from UC-QRY-007 S05 (Search Returns No Matching Records), scale-site subject. Legacy showed
# "Result List: 0 records" + an empty table on .scaleSiteRiskSearchResults with a "Back" button; the new app
# renders a "No results" empty state (TableResource) on the single /scale-site-risk-assessments page (no Back
# button). No-match value asserted directly as the literal below. Ground-truth 2026-08-11: GET /api/scale-site-risk-assessments/search?riskQuestionnaireId=99999999 -> [].
@rsk @UC-QRY-007
Feature: Search Scale Site Risk Assessments — Search Returns No Matching Records

  @S05 @p1
  Scenario: A scale site risk assessment search that matches nothing shows the No-results empty state
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Assessment ID" of "99999999"
    Then the scale site risk assessment search should show no results
