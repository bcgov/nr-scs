# Re-grounded from UC-SCA-001 S01 (full create → view) + S07 (District Wide=Y hides the Scale Sites panel).
# The new app's create is a single page with a two-step reveal: basics → "Add Conditions" → advanced
# (Job Functions / SFP / Scale Sites / Conditions) → "Save Record" (POST /api/scaler-authorizations) →
# navigates to /scaler-authorizations/view/{id}. Success is PROVEN by a full API read-back (not the
# redirect). Each created record is removed via DELETE /api/scaler-authorizations/{id} on teardown.
# Values (licence 8437, Reg/Dist 1831, job function "Piece Scale", scale site 520) are pinned in
# fixtures/sca/sca-test-data.ts (ground-truthed 2026-08-05).
#
# @mode:serial — the two happy-path creates share the same licence/dates/Reg-Dist and differ only by
# District Wide; run them sequentially so a natural-key overlap can't flake them under parallel load. This
# is a suite-hygiene choice, not a claim about concurrent-create behaviour.
@sca @UC-SCA-001 @mode:serial
Feature: Create Scaler Authorization — Happy Path

  @S01 @p0
  Scenario: Create a district-wide scaler authorization
    Given I am on the Scaler Authorization create form
    When I create a district-wide scaler authorization
    Then the scaler authorization is created
    And the created record reads back with district wide "Y"

  @S01 @p0
  Scenario: Create a scaler authorization with a scale site when District Wide is No
    Given I am on the Scaler Authorization create form
    When I create a scaler authorization with a scale site
    Then the scaler authorization is created
    And the created record reads back with district wide "N"
    And the created scaler authorization includes its scale site
