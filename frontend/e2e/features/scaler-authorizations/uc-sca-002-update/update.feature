# Re-grounded from UC-SCA-002 S01 (edit + save), S02 (required-field validation), S06 (reset discards
# edits), S10 (District Wide toggle shows/hides Scale Sites). Route /scaler-authorizations/edit/{id}; write
# path PUT /api/scaler-authorizations/{id}. Each scenario API-SEEDS its own record (licence 8437, District
# Wide=Y) then edits it (independent + self-cleaning via DELETE teardown). Success is PROVEN by a full API
# read-back; negatives PROVE no PUT fired (scalerAuthUpdateCalls === 0). The letter-lock branch (S07 —
# fields locked to Expiry only) is deferred: no letterExists=true record is obtainable (letter creation
# env-blocked; see defects.md). Legacy max-years (S04) + site-within-district (S05) are not ported.
@sca @UC-SCA-002
Feature: Update Scaler Authorization

  @S01 @p0
  Scenario: Update the expiry date and save
    Given a scaler authorization exists
    When I open it for scaler authorization editing
    And I change the scaler auth expiry date to "2028-01-15"
    And I click Save Record
    Then the updated scaler authorization reads back expiry "2028-01-15"

  @S06 @p2
  Scenario: Reset discards in-progress edits
    Given a scaler authorization exists
    When I open it for scaler authorization editing
    And I change the scaler auth expiry date to "2028-01-15"
    And I reset the scaler authorization form
    Then the scaler auth expiry field is restored
    And no scaler authorization update should be sent

  @S02 @p1
  Scenario: Clearing the expiry date blocks the save
    Given a scaler authorization exists
    When I open it for scaler authorization editing
    And I clear the scaler auth expiry date
    And I click Save Record
    Then I should see the error "Expiry Date is required."
    And no scaler authorization update should be sent

  @S10 @p2
  Scenario: Switching District Wide to No shows the Scale Sites section
    Given a scaler authorization exists
    When I open it for scaler authorization editing
    And I set scaler auth District Wide to "No"
    Then the scaler auth Scale Sites section is shown
