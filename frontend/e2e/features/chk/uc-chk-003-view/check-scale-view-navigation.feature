# Re-grounded from UC-CHK-003 S03 (filter list before viewing), S04 (legacy Edit+Delete disabled),
# S05 (read-only view / controls) and S06 (record not found).
# Re-grounding notes (real data, 2026-07-15):
#  - S03: the scaler Check Scales tab role Filter (All/Primary/Secondary/Primary÷Secondary/Check).
#    Legacy asserted "Primary empties the list" for a scaler that was only ever a check scaler; no
#    VIEWABLE real scaler has an empty Primary list, so this re-grounds to the equivalent intent using a
#    specific record: scaler 7444 holds 145988 as its CHECK (not primary), so filtering to Primary hides
#    145988 and filtering to Check surfaces it (parallel-safe: presence of a specific id, not a count).
#  - S04: legacy (LGCS) records disable BOTH Edit Record and Delete on the view (ckscType==='LGCS');
#    fields still render read-only. Uses real LGCS record 145842 (legacyCheckScaleId fixture).
#  - S05: the new view has NO per-element permission model — Delete / Create Letter / Add Check Scale
#    (legacy STA-002/005/006) all render for everyone; asserted as the re-grounded behavior. Uses real
#    NON-legacy record 146803 (SFPSCS; ckscType != LGCS ⇒ Edit/Delete enabled). Back = history-back.
#  - S06: not-found re-grounds legacy ERR-001 to the view's Error state "Could not retrieve check scale
#    data." Uses a provably-absent id (99999999).
@chk @UC-CHK-003
Feature: View Detail Check Scale — list filter, legacy/permission controls, and not-found

  @S03 @p1
  Scenario: Filter the scaler Check Scales list narrows to the record's role before viewing it
    Given I am on scaler "7444"'s Check Scales tab
    When I set the Check Scales filter to "Primary"
    Then check scale "145988" "is absent" in the filtered list
    When I set the Check Scales filter to "Check"
    And I open check scale "145988" from the list
    Then I should be on the check scale view page for "145988"

  @S04 @p1
  Scenario: A legacy check scale disables both Edit Record and Delete on the view
    Given I am viewing the legacy check scale
    Then the Edit Record button should be disabled
    And the Delete button should be disabled
    And the check scale data fields are still displayed read-only

  @S05 @p1
  Scenario: A non-legacy check scale view is read-only with every action button rendered
    Given I am viewing the non-legacy check scale
    Then the Edit Record button should be enabled
    And the Delete button should be enabled
    And all check scale action buttons are present

  @S05 @p2
  Scenario: Back on the view returns to the originating check-scale list
    Given I am on scaler "7443"'s Check Scales tab
    And I open check scale "145988" from the list
    When I click Back on the view
    Then I should be on scaler "7443" record

  @S06 @p1 @ERR-001
  Scenario: Viewing a check scale that does not exist shows a clear error
    Given I am viewing a non-existent check scale
    Then I should see the error "Could not retrieve check scale data."
