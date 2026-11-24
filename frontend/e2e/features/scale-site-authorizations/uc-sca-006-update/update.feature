# Re-grounded from UC-SCA-006 (update scale site authorization). Each scenario API-SEEDS its own record
# (site 520, no letter) via seedScaleSiteAuthorization, opens the edit screen (/scale-site-authorizations/
# edit/{id}), edits, and Saves ("I click Save Record" shared) → PUT /api/scale-site-authorizations/{id}.
# Success is proven by an API read-back; the required-field negative PROVES no write
# (scaleSiteAuthUpdateCalls === 0). The letter-lock branch is deferred — no letterExists=true record is
# obtainable (letters are env-blocked; see defects.md). Records are cleaned up via DELETE on teardown.
@sca @UC-SCA-006
Feature: Update Scale Site Authorization

  @S01 @p0
  Scenario: Update the expiry date
    Given a scale site authorization exists
    When I open it for scale site auth editing
    And I change the scale site auth expiry date to a valid later date
    And I click Save Record
    Then the updated scale site authorization reads back the new expiry

  # Update is DESTRUCTIVE by design: the server deletes the record's existing conditions then re-adds the
  # request's list (ScaleSiteAuthorizationService.updateScaleSiteAuthorization: deleteSiteAuthorizationConditions
  # → addConditions). If the edit form ships the wrong list, existing conditions are silently lost. This
  # guards the round-trip: seed a record WITH condition 462, edit only the expiry, save, and assert 462
  # survives. If it fails, the record's condition was dropped — a data-loss defect (see defects.md).
  @S01 @p1
  Scenario: Editing an unrelated field preserves the record's existing conditions
    Given a scale site authorization with a condition exists
    When I open it for scale site auth editing
    And I change the scale site auth expiry date to a valid later date
    And I click Save Record
    Then the updated scale site authorization still includes condition "462"

  @S02 @p1
  Scenario: Save is blocked when the expiry date is cleared
    Given a scale site authorization exists
    When I open it for scale site auth editing
    And I clear the scale site auth expiry date
    And I click Save Record
    Then I should see the error "Expiry Date is required."
    And no scale site authorization update should be sent

  @S06 @p2
  Scenario: Reset restores the loaded expiry date
    Given a scale site authorization exists
    When I open it for scale site auth editing
    And I change the scale site auth expiry date to a valid later date
    And I reset the scale site authorization form
    Then the scale site auth expiry field is restored
