# New-app convenience with no legacy equivalent, previously deferred (coverage.md gap #9, "persisted
# filters/paging RESTORED across navigation"). The page keeps its filters, sort, paging, and the last search
# PARAMS in a module-level store via usePersistentState (hooks/usePersistentState) so that leaving for a
# detail page and coming BACK restores the prior search instead of a blank form. The result ROWS are
# deliberately NOT persisted (index.tsx "Result rows are ephemeral: re-fetched on mount"); on remount an
# effect replays the persisted lastSearchParams, so the count reappears via a fresh fetch, not from a stored
# result set. The store survives a client-side remount but resets on a full page reload — so this scenario
# navigates CLIENT-SIDE (history.pushState, no reload); a real reload would (correctly) drop both the mock
# session and the store.
@rsk @UC-QRY-007
Feature: Search Scaler Risk Assessments — filter persistence across navigation

  # Run a search, leave the page and return (both client-side). The Assessment ID filter is restored from the
  # persistence store; the result count reappears because the persisted lastSearchParams are re-submitted on
  # remount (the rows themselves are re-fetched, not stored) — either way, not the blank initial state. So
  # this has teeth on the PARAMS store (a break there loses the filter or skips the replay) but by
  # construction cannot exercise a results store, because there is none.
  @S01 @p2
  Scenario: Filters and results are restored after navigating away and back
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Assessment ID" of "723"
    Then the scaler risk assessment results should list assessment "723"
    And the scaler risk assessment results should show 1 records
    When I navigate away from and back to the scaler risk assessment search
    Then the scaler risk assessment Assessment ID filter still shows "723"
    And the scaler risk assessment results should show 1 records
