# Chain: UC-RSK-007.md › -detailed.md › -slices.md › gherkin/UC-RSK-007-S07.feature › THIS FILE
#
# Re-grounded from UC-RSK-007 S07 (read-only display of an assessment) onto the new React app. Notes:
#  - The legacy read-only display screen (.scaleSiteAssessmentDisplay P114) is the new app's VIEW surface
#    (/scale-site-risk-assessments/view/:id, shared form mode="view"): the questionnaire answer selects
#    and the Comments box are disabled, and the actions are Back + Edit.
#  - The PERMISSION mechanics of S07 (Add button hidden / links routed to display-only when the actor
#    lacks the scaleSiteAssessment permission — STA-002/STA-003) are NOT reproducible: the new app has no
#    per-element permission gate and the LOCAL mock auth grants only SCS_SYS_ADMIN. Logged as a coverage
#    gap (see coverage.md / defects.md); this scenario covers the read-only display itself.
#  - The assessment is SEEDED via the API (owned + DB-cleaned), so the test does not depend on a real
#    record's id surviving a DB re-extract.

@rsk @UC-RSK-007
Feature: Complete Scale Site Risk Assessment — Read-Only View

  @S07 @p1
  Scenario: An assessment is displayed read-only with Back and Edit actions
    Given a completed scale site risk assessment exists on site "520"
    When I open that risk assessment in read-only view
    Then the assessment header shows scale site "520"
    And the assessment questionnaire and comments are read-only
    And the view offers Back and Edit actions
