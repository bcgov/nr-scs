# Chain: UC-INS-001.md › -detailed.md › -slices.md › gherkin/UC-INS-001-S01.feature › THIS FILE
#
# Re-grounded from UC-INS-001 S01 (happy path) onto the new React two-stage create screen
# (/scale-sites/:id/inspections/create). Legacy re-grounding notes:
#  - The legacy "Inspector # (required free-text)" is now an inspector USER GUID: production resolves it
#    from the logged-in user's security context; in LOCAL mock mode the context has NO GUID, so the form
#    pre-fills a non-GUID userid and the create 400s unless a real GUID is typed. So the happy path types
#    a real, DB-discovered inspector GUID (fixtures/ins/ins-test-data.ts) — this is an environment
#    constraint of mock auth, not an app rule. (Discovered + verified against the live endpoints.)
#  - The answer control is a per-question <Select> (Y/N[/NA]), not the legacy Y/N/NA radio.
#  - Scale site 520 is used because its owner exists in forest_client — the post-create read-back
#    INNER JOINs forest_client, so most sites would 404 the read-back (a data gap, not an app bug).

@ins @UC-INS-001
Feature: Create Site Inspection

  @S01 @p0
  Scenario: Check Scaler creates a Minor Weight-Scale inspection and answers every question
    Given I am on the site inspection create screen for scale site "520"
    When I choose inspection type "MIN" and site type "W"
    And I fill a valid inspection and answer every question
    And I save the inspection
    Then the inspection is created and its view screen opens
    And the created inspection reads back with my details and answered questions
