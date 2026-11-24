# Re-grounded from UC-CCQ-001 S02 (view existing question). Source: UC-CCQ-001-slices.md.
# Re-grounding note: legacy reaches this via a distinct `.maintainQuestionsView` route; the new app
# opens the same information in a read-only Modal (`modalMode: 'view'`) over the single
# `/maintenance/questions` route.

@ccq @UC-CCQ-001
Feature: Maintain Inspection Question — View

  @S02 @p0
  Scenario: Administrator views an existing inspection question
    Given a disposable inspection question exists
    And I am on the Questions list
    When I open the question for view
    Then the view should show the question's saved values
    And the Edit Record and Delete actions should be visible
