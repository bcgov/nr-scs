# Re-grounded from UC-QRY-004 S03 (Search Returns No Matching Records). Legacy showed "Result List: 0
# records" + an empty table on .scaleSiteSearchResults with a "Back" button; the new app renders a
# "No results" empty state (TableResource) on the single /scale-sites page (no Back button). The no-match
# value ZZZNOMATCH is asserted directly as the literal below (nothing else consumes it, so it is not a
# fixture export). Ground-truth 2026-07-30: GET /api/scale-sites/search?siteName=ZZZNOMATCH -> [].
@qry @UC-QRY-004
Feature: Search Scale Sites — Search Returns No Matching Records

  @S03 @p1
  Scenario: A scale site search that matches nothing shows the No-results empty state
    Given I am on the Scale Site Search page
    When I search scale sites by "scale site name" of "ZZZNOMATCH"
    Then the scale site search should show no results
