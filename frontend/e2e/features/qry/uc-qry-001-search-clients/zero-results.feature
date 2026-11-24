# Re-grounded from UC-QRY-001 S04 (Search Returns Zero Results). Legacy showed "Result List: 0 records"
# with an empty table on .clientSearchResults (P004); the new app instead renders a "No results" empty
# state (TableResource EmptySection, title "No results") — same meaning, re-grounded assertion. The
# legacy "Back" button has no new-app equivalent (single-page layout — see coverage.md). The no-match
# value is pinned in fixtures/qry/qry-client-test-data.ts (GET …?companyName=ZZZNOMATCH99999 -> []).
@qry @UC-QRY-001
Feature: Search Clients — Search Returns Zero Results

  @S04 @p1
  Scenario: A search that matches no clients shows the No-results empty state
    Given I am on the Client Search page
    When I search clients by "company name" of "ZZZNOMATCH99999"
    Then the client search should show no results
