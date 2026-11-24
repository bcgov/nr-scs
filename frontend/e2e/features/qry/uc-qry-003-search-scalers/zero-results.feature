# Re-grounded from UC-QRY-003 S03 (Search Returns No Matching Records). Legacy showed "0 records" + an
# empty table on .scalerSearchResults; the new app renders a "No results" empty state (TableResource).
# The legacy "Back" button has no new-app equivalent (single-page layout). No-match value pinned in
# fixtures/qry/qry-scaler-test-data.ts (GET …?clientName=ZZZNOMATCH -> []).
@qry @UC-QRY-003
Feature: Search Scalers — Search Returns No Matching Records

  @S03 @p1
  Scenario: A scaler search that matches nothing shows the No-results empty state
    Given I am on the Scaler Search page
    When I search scalers by "last name" of "ZZZNOMATCH"
    Then the scaler search should show no results
