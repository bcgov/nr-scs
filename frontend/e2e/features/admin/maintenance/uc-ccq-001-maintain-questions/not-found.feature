# Chain: UC-CCQ-002.md › -detailed.md › -slices.md › gherkin/UC-CCQ-002-S07 › THIS FILE
#
# UC-CCQ-002 S07 — "question record not found on view load" — re-grounded to where it is actually
# reachable in the new app.
#
# Legacy had a distinct `.maintainQuestionsView.do?id=` route, so a stale bookmark or a hand-edited id
# landed a user on a not-found view. The new app is a SINGLE route (/maintenance/questions) with an
# in-page modal: there is no per-id URL to mistype, and the list only ever links ids it just fetched. So
# the UI half of this slice has nothing to drive — logged `not-applicable` in coverage.md, not skipped.
#
# The rule itself is alive server-side, on the very endpoint the view modal calls, and that is asserted
# here. Keeping it means a regression to a 500, an empty 200, or a leaked Oracle message on the
# not-found path is caught — which is the substance of the slice.
@ccq @UC-CCQ-001 @UC-CCQ-002
Feature: Maintain Inspection Question — Not found

  @S07 @p2
  Scenario: The question detail endpoint refuses an id that does not exist
    When I request the inspection question detail for an id that does not exist
    Then the question detail request should be refused as not found
