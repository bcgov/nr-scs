# Chain: UC-RSK-006.md › -detailed.md › -slices.md › (NO source slice) › THIS FILE
#
# NOT in the UC-RSK-006 Gherkin. The RSK-006 slice catalog DELIBERATELY EXCLUDED the read-only display
# (scalerAssessmentDisplay.do / P118), routing it to a sibling read-only-role UC (UC-RSK-001). BUT the new
# React app renders a scaler read-only VIEW surface from the SAME shared form (mode="view",
# /scaler-risk-assessments/view/:riskQuestionnaireId) that IS reachable under the single SCS_SYS_ADMIN mock
# role, and its scale-site twin (UC-RSK-007 S07) is covered — so this covers it for symmetry. Logged as a
# spec gap (gherkin-incomplete-vs-source) in defects.md so a BA can regenerate the .feature.
#  - The questionnaire answer selects and the Comments box are disabled; the actions are Back + Edit.
#  - The assessment is SEEDED via the API (owned + DB-cleaned), so the test does not depend on a real
#    record's id surviving a DB re-extract.

@rsk @scaler @UC-RSK-006
Feature: Complete Scaler Risk Assessment — Read-Only View

  @p1
  Scenario: A scaler assessment is displayed read-only with Back and Edit actions
    Given a completed scaler risk assessment exists for scaler "019D"
    When I open that scaler risk assessment in read-only view
    Then the scaler assessment header shows scaler "019D"
    And the scaler record header shows the pinned client, region and district
    And the scaler assessment questionnaire and comments are read-only
    And the scaler view offers Back and Edit actions
