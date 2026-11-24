# Re-grounded from UC-SCA-003 S01 (read-only view of a scaler authorization) + S05 (District Wide=Y
# suppresses the Scaling Sites section). Route /scaler-authorizations/view/{id} (GET
# /api/scaler-authorizations/{id}). Each scenario API-SEEDS a fresh record (licence 8437) and cleans it up
# via DELETE on teardown — read-only open, parallel-safe. The read-only screen shows the Authorized Scaler
# tombstone, authorization fields, Job Functions / Special Forest Products / Scale Sites tables, a read-only
# conditions section, and the Edit Record / Delete / Create Letter actions. The letter button reads
# "Create Letter" (seeded records have no letter). Data pinned in fixtures/sca/sca-test-data.ts.
@sca @UC-SCA-003 @view
Feature: View Scaler Authorization

  @S01 @p0
  Scenario: View a district-wide scaler authorization read-only
    Given a scaler authorization exists
    When I open the scaler authorization view
    Then the scaler authorization view shows "authorizedScalerLicence" of "8437"
    And the scaler authorization view shows "status" of "Active"
    And the scaler authorization view shows "districtWide" of "Yes"
    And the Job Functions table shows the authorized job function
    And the scaler authorization "Edit Record" action button is shown
    And the scaler authorization "Delete" action button is shown
    And the scaler authorization "Create Letter" action button is shown
    And the scaler authorization Scale Sites section is not shown

  @S05 @p1
  Scenario: A District Wide No authorization shows the Scale Sites section
    Given a scaler authorization with a scale site exists
    When I open the scaler authorization view
    Then the scaler authorization view shows "districtWide" of "No"
    And the Scale Sites table shows the authorized scale site

  @S01 @p1
  Scenario: Opening a non-existent scaler authorization shows a load error
    Given I open the scaler authorization view for a non-existent id
    Then the scaler authorization view shows a load error
