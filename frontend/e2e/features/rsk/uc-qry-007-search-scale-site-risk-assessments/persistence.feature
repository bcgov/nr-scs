# New-app convenience with no legacy equivalent, previously deferred (coverage.md gap #8, "persisted
# filters/paging restored across navigation"). Same mechanism as the scaler twin: usePersistentState keeps
# the filters, sort, paging, AND the last search PARAMS in a module-level store that survives a client-side
# remount but resets on a full reload — so this navigates CLIENT-SIDE (history.pushState, no reload). The
# result ROWS are deliberately NOT persisted (index.tsx "Result rows are ephemeral: re-fetched on mount");
# on remount an effect replays the persisted lastSearchParams, so the count reappears via a fresh fetch, not
# from a stored result set.
@rsk @UC-QRY-007
Feature: Search Scale Site Risk Assessments — filter persistence across navigation

  # Run a search, leave the page and return (both client-side). The Assessment ID filter is restored from the
  # persistence store; the result count reappears because the persisted lastSearchParams are re-submitted on
  # remount (the rows themselves are re-fetched, not stored) — either way, not the blank initial state. So
  # this has teeth on the PARAMS store (a break there loses the filter or skips the replay) but by
  # construction cannot exercise a results store, because there is none.
  @S02 @p2
  Scenario: Filters and results are restored after navigating away and back
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Assessment ID" of "1822"
    Then the scale site risk assessment results should list assessment "1822"
    And the scale site risk assessment results should show 1 records
    When I navigate away from and back to the scale site risk assessment search
    Then the scale site risk assessment Assessment ID filter still shows "1822"
    And the scale site risk assessment results should show 1 records
