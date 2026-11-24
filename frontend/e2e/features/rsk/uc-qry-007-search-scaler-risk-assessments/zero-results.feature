# Re-grounded from UC-QRY-007 S05 (Search Returns No Matching Records), scaler subject. Legacy showed
# "Result List: 0 records" + an empty table on .scalerRiskSearchResults with a "Back" button; the new app
# renders a "No results" empty state (TableResource) on the single /scaler-risk-assessments page (no Back
# button). No-match value asserted directly as the literal below (nothing else consumes it, so it is not a
# fixture export). Ground-truth 2026-08-04: GET /api/scaler-risk-assessments/search?riskQuestionnaireId=99999999 -> [].
@rsk @UC-QRY-007
Feature: Search Scaler Risk Assessments — Search Returns No Matching Records

  @S05 @p1
  Scenario: A scaler risk assessment search that matches nothing shows the No-results empty state
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Assessment ID" of "99999999"
    Then the scaler risk assessment search should show no results
