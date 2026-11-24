# Re-grounded from UC-SCA-004 S01 (confirm delete → cascade remove → back to the list) + S02 (cancel = no-op).
# Delete is triggered from the read-only view (pages/View/ScalerAuthorization handleDelete): a letterless
# record pops window.confirm (CNF-001 "Are you sure you want to delete this record?"), then DELETE
# /api/scaler-authorizations/{id} → navigates to /scalers/view/{licence}?tab=authorizations. Each scenario
# API-SEEDS its own record (licence 8437) and registers it for DELETE teardown (idempotent — the happy path
# deletes it, teardown then 404s cleanly). S01 proves the record is gone (GET → 404); S02 proves no DELETE
# fired (scalerAuthDeleteCalls === 0). The letter-issued delete-block (S03/S04) is deferred — no
# letterExists=true record is obtainable (letter creation env-blocked; see defects.md).
@sca @UC-SCA-004
Feature: Delete Scaler Authorization

  @S01 @p1 @CNF-001
  Scenario: Confirming delete removes the authorization and returns to the scaler's authorizations tab
    Given a scaler authorization exists
    When I open the scaler authorization view
    And I confirm the scaler authorization delete
    Then the delete confirmation asked "Are you sure you want to delete this record?"
    And I land on the scaler authorizations tab
    And the scaler authorization is deleted

  @S02 @p2 @CNF-001
  Scenario: Cancelling the delete confirmation sends no request
    Given a scaler authorization exists
    When I open the scaler authorization view
    And I cancel the scaler authorization delete
    Then the delete confirmation asked "Are you sure you want to delete this record?"
    And no scaler authorization delete request is sent
    And I remain on the scaler authorization view
