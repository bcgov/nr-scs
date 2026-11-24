# Chain: UC-INS-002.md › -detailed.md › -slices.md › gherkin/UC-INS-002-S01.feature › THIS FILE
#
# Re-grounded from UC-INS-002 S01 (happy path) onto the new React read-only view
# (/scale-sites/:id/inspections/view/:inspectionId). Legacy re-grounding notes:
#  - The legacy "list → click Inspection # link → detail" hop is a single client-side route in the new
#    app; the record is SEEDED via the create API (a real inspector GUID + a forest_client-backed site,
#    so the get_inspection_report INNER JOINs resolve), then the view is opened directly. The list-link
#    hop itself is exercised by UC-INS-001's InspectionsTab coverage.
#  - The displayed values are checked against the values we DECIDED at seed time (deterministic),
#    not re-read from the DB, so the assertion never depends on DB-derived date/name formatting.
#  - "no editable inputs anywhere" (BR-INS-002-01) is proven structurally: within the view content
#    there are zero <select>s and every input/textarea carries the readonly attribute.

@ins @UC-INS-002
Feature: View Site Inspection Details

  @S01 @p0
  Scenario: Check Scaler views a recorded inspection with its question responses
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection view
    Then the inspection view shows the recorded header details
    And the inspection view lists the answered questions read-only
    And the inspection view offers Back, Edit Record and Delete actions

  @S01 @p1
  Scenario: Back from the inspection view returns to the scale site inspections tab
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection view
    And I go back from the inspection view
    Then the scale site inspections tab is shown

  # The list → row-link → detail hop (legacy S01 steps 5-6): the inspections tab lists the recorded
  # inspection with its columns, and clicking its Inspection # link opens the read-only detail view.
  @S01 @p1
  Scenario: The inspections list shows a recorded inspection and its row opens the detail view
    Given I have a recorded site inspection on scale site "520"
    When I view the inspections tab for that scale site
    Then the inspections list shows that inspection with its type, site type and inspector
    When I open that inspection from the list
    Then the site inspection view loads for it
