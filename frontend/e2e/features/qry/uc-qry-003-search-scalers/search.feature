# Re-grounded from UC-QRY-003 S01 (multi-result happy path) + S02 (single result). Legacy two-screen flow
# .scalerSearch (P005) → .scalerSearchResults (P006) with a "Back" button collapses to the new app's
# SINGLE page /scalers (pages/Queries/Scalers): form + results together, no Back button. The result
# columns match the legacy set exactly. Search values are real scalers pinned in
# fixtures/qry/qry-scaler-test-data.ts (ground-truthed 2026-07-23 against GET /api/scalers/search).
@qry @UC-QRY-003
Feature: Search Scalers — Multi-Result Happy Path

  @S01 @p0
  Scenario: Searching scalers by last name returns matching rows
    Given I am on the Scaler Search page
    When I search scalers by "last name" of "RATHROCK"
    Then the scaler results should show 3 records
    And the scaler results should list licence "323E"
    And scaler licence "323E" links to its scaler view

  # S02 re-grounded: a search returning EXACTLY ONE scaler. Legacy auto-forwarded to the scaler summary;
  # the new app lists the single row instead (see defects.md Divergence #1 — log-only). This asserts the
  # ACTUAL new-app behaviour (1-row results table) and doubles as the S01 columns + cell-data check.
  @S01 @S02 @p1
  Scenario: A single-result search lists the one scaler with the expected columns and cell data
    Given I am on the Scaler Search page
    When I search scalers by "licence" of "914D"
    Then the scaler results should show 1 records
    And the scaler results table shows the expected columns
    And the scaler row for licence "914D" shows last name "ABERNATHA", first name "ADAH" and region-district "Thompson Rivers Natural Resource District"
    And the Create Scaler button is available

  # S01 + S06 both call out an editable "Scaler (Client / Loc)" search field (ClientLocSearch,
  # pages/Queries/Scalers/index.tsx:363). The client half is a free-text editable input (id clientNumber);
  # the loc half is read-only (populated via the client picker). This asserts the field is actually rendered
  # editable — the ledger previously claimed it "covered (symmetry)" with no scenario touching it.
  @S01 @S06 @p2
  Scenario: The Scaler (Client / Loc) search field is present and editable
    Given I am on the Scaler Search page
    Then the "Scaler (Client / Loc)" field allows entering a client number

  # New-app control (no legacy equivalent in these slices): Reset clears the form + results.
  @S01 @p2
  Scenario: Reset clears the results after a scaler search
    Given I am on the Scaler Search page
    When I search scalers by "last name" of "RATHROCK"
    Then the scaler results should list licence "323E"
    When I reset the scaler search
    Then the scaler results should be empty
