# Re-grounded from UC-QRY-004 S01 (multi-result happy path) + S02 (single result). The legacy two-screen
# flow .scaleSiteSearch (P043) → .scaleSiteSearchResults (P044) with a "Back" button collapses to the new
# app's SINGLE page /scale-sites (pages/Queries/ScaleSites): form + results together, no Back button. The
# result columns match the legacy set exactly. Search values are real scale sites pinned in
# fixtures/qry/qry-scale-site-test-data.ts (ground-truthed 2026-07-30 against GET /api/scale-sites/search).
@qry @UC-QRY-004
Feature: Search Scale Sites — Multi-Result Happy Path

  @S01 @p0
  Scenario: Searching scale sites by name returns matching rows
    Given I am on the Scale Site Search page
    When I search scale sites by "scale site name" of "%TEMBEC%"
    Then the scale site results should show 3 records
    And the scale site results should list scale site "520"
    And scale site "520" links to its scale site view

  # S02 re-grounded: a search returning EXACTLY ONE scale site (by exact Scale Site #). The legacy app
  # auto-forwarded to the scale site view; the new app lists the single row instead (see defects.md
  # Divergence #1 — log-only). This asserts the ACTUAL new-app behaviour (1-row results table) and
  # doubles as the S01 columns + cell-data check.
  @S01 @S02 @p1
  Scenario: A single-result search lists the one scale site with the expected columns and cell data
    Given I am on the Scale Site Search page
    When I search scale sites by "scale site #" of "520"
    Then the scale site results should show 1 records
    And the scale site results table shows the expected columns
    And the scale site row for "520" shows name "TEMBEC - CANAL FLATS", region "Kootenay-Boundary Natural Resource Region", district "Rocky Mountain Natural Resource District", site type "Piece Scale, Weight Scale" and owner "00001402/00"
    And the Create Scale Site button is available

  # S01 calls out an editable "Site Owner (Client / Loc)" search field (ClientLocSearch,
  # pages/Queries/ScaleSites/index.tsx:305/343). The client half is a free-text editable input
  # (id ownerClientNumber); the loc half is read-only (populated via the client picker). This asserts the
  # field is actually rendered editable.
  @S01 @p2
  Scenario: The Site Owner (Client / Loc) search field is present and editable
    Given I am on the Scale Site Search page
    Then the scale site owner "Site Owner (Client / Loc)" field allows entering a client number

  # New-app control (no legacy equivalent in these slices): Reset clears the form + results.
  @S01 @p2
  Scenario: Reset clears the results after a scale site search
    Given I am on the Scale Site Search page
    When I search scale sites by "scale site name" of "%TEMBEC%"
    Then the scale site results should list scale site "520"
    When I reset the scale site search
    Then the scale site results should be empty
