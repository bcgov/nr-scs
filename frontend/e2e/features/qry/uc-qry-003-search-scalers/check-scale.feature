# From UC-QRY-003 S04 (check-scale branch — valid) + S05 (invalid/not found). The "OR enter check scale #"
# accordion looks the number up before leaving the search form, as legacy QueriesScalersSearchAction did:
# a matching id opens /check-scales/view/{id}; otherwise the form stays put with a field-level error on
# "Check Scale #" — "No records were found." (errors.no.recs) for a numeric miss, "Check Scale # must be a
# number." (errors.long) for a non-numeric entry. The S05 Gherkin lists "No records were found." for both;
# legacy source (OAValidator.isLong → errors.long) is authoritative. Was defects.md Divergence #2 (RESOLVED).
# Ids pinned in fixtures/qry/qry-scaler-test-data.ts.
@qry @UC-QRY-003
Feature: Search Scalers — Check Scale Number Branch

  @S04 @p1
  Scenario: Entering a valid check scale number navigates to the check scale view
    Given I am on the Scaler Search page
    When I search scalers by check scale number "145842"
    Then I should land on the check scale view for "145842"

  # S05: a numeric check scale number with no record — search?checkScaleId= returns HTTP 200 + [].
  @S05 @p1
  Scenario: Entering a non-existent check scale number shows "No records were found." on the field
    Given I am on the Scaler Search page
    When I search scalers by check scale number "999999999"
    Then the check scale number field shows the error "No records were found."
    And I should still be on the Scaler Search page

  # S05 second error path — a NON-NUMERIC entry is rejected on the form; no request is sent.
  @S05 @p1
  Scenario: Entering a non-numeric check scale number shows "Check Scale # must be a number."
    Given I am on the Scaler Search page
    When I search scalers by check scale number "ABC"
    Then the check scale number field shows the error "Check Scale # must be a number."
    And I should still be on the Scaler Search page
