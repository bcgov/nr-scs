# Re-grounded from the legacy Inspection # sub-flow. Legacy: the Inspection # field was permission-gated
# (scaleSiteInspectionView) and its errors were SERVER-side field errors on the search form. New app: the
# "OR enter inspection #" accordion is always present (single-role mock auth), and the branch behaves as:
#  - S04 valid + CIMS-viewable id  -> navigate straight to the inspection view (/scale-sites/{id}/inspections/view/{id})
#  - S05 non-numeric id            -> CLIENT-side rejection ("Inspection id must be a positive whole number.");
#                                     NO lookup request is dispatched (re-grounds the legacy OAValidator.isLong() field error)
#  - S06 valid-but-unknown numeric -> the lookup 404s; the app stays on the page and shows the backend
#                                     "No scale site inspection found…" message in an error notification (re-grounds ERR-002)
# Values pinned in fixtures/qry/qry-scale-site-test-data.ts (ground-truthed 2026-07-30). The S04 happy
# path SEEDS a fresh inspection via the API (owns + cleans it up) — the extract's raw inspections aren't
# reliably CIMS-viewable, so a seeded record is the parallel-safe way to a valid id.
@qry @UC-QRY-004
Feature: Search Scale Sites — Inspection Number Branch

  @S04 @p1
  Scenario: Entering a valid inspection number navigates to the inspection view
    Given a scale site inspection has been seeded
    And I am on the Scale Site Search page
    When I search scale sites by the seeded inspection number
    Then I should land on the scale site inspection view for the seeded inspection

  # S05 re-grounded: a NON-NUMERIC inspection id ("ABC"). The new app rejects it client-side BEFORE any
  # request — asserted by the prove-the-negative (zero lookup calls) in addition to the inline error. The
  # exact message differs from the legacy (UNKNOWN) OAValidator text; the validation MOVED off the server
  # onto the client (see defects.md Divergence #2). The value + message are asserted as the literals below
  # (nothing else consumes them, so they are not fixture exports); the client-side rejection is also
  # confirmed by the app's own unit test (pages/Queries/ScaleSites/index.browser.test.tsx).
  @S05 @p1
  Scenario: Entering a non-numeric inspection number is rejected client-side with no lookup sent
    Given I am on the Scale Site Search page
    When I search scale sites by inspection number "ABC"
    Then the scale site search shows the error "Inspection id must be a positive whole number."
    And no inspection lookup request should be sent

  # S06 re-grounded: a valid numeric id ("999999999") that matches no inspection. Legacy showed field-level
  # "No records were found." (ERR-002) on the search form; the new app surfaces the backend 404 message in
  # the page's error notification and stays on the search page. Value + message are asserted as the literals
  # below (not fixture exports). Ground-truth 2026-07-30: GET /api/scale-sites/inspection/search?inspectionId=999999999
  # -> HTTP 404 {"code":"NOT_FOUND","message":"No scale site inspection found with inspection id 999999999"}.
  @S06 @p1
  Scenario: Entering an unknown numeric inspection number reports the record was not found
    Given I am on the Scale Site Search page
    When I search scale sites by inspection number "999999999"
    Then the scale site search shows the error "No scale site inspection found with inspection id 999999999"
