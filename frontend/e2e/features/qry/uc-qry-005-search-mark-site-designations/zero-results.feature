# Re-grounded from UC-QRY-005 S02 (Search Returns No Matching Records). Legacy showed "Result List: 0
# records" + an empty table on .markSiteDesignationSearchResults with a "Back" button; the new app renders
# a "No results" empty state (TableResource) on the single /mark-site-designations page (no Back button).
# Empty result is a valid success state — NO error is raised. The no-match value ZZZQ999 is a syntactically
# valid mark that the SEARCH endpoint returns [] for (distinct from the mark-HOLDER lookup's 404). Pinned
# in fixtures/qry/qry-mark-site-designation-test-data.ts (ground-truthed 2026-08-04:
# GET /api/mark-site-designations/search?timberMark=ZZZQ999 -> []). Read-only; no seed / no cleanup.
@qry @UC-QRY-005
Feature: Search Mark Site Designations — Search Returns No Matching Records

  @S02 @p1
  Scenario: A mark site designation search that matches nothing shows the No-results empty state
    Given I am on the Mark Site Designation Search page
    When I search mark site designations for a mark that matches nothing
    Then the mark site designation search shows the No-results empty state
