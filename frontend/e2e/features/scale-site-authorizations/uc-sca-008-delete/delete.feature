# Re-grounded from UC-SCA-008 (delete scale site authorization). Delete is triggered from the read-only view
# (pages/View/ScaleSiteAuthorization handleDelete): a letterless record pops window.confirm (CNF-001 "Are you
# sure you want to delete this record?"), then DELETE /api/scale-site-authorizations/{id} → navigates to
# /scale-sites/view/{scaleSiteIdNmbr}?tab=authorizations. Each scenario API-SEEDS its own record (site 520)
# and registers it for DELETE teardown (idempotent — the happy path deletes it, teardown then 404s cleanly).
# S01 seeds its record WITH an SIA child condition so the confirmed delete exercises the server-side cascade.
# S01 proves the record is gone (GET → 404); S02 proves no DELETE fired (scaleSiteAuthDeleteCalls === 0).
# The letter-issued delete-block is deferred — no letterExists=true record obtainable (see defects.md).
@sca @UC-SCA-008
Feature: Delete Scale Site Authorization

  @S01 @p1 @CNF-001
  Scenario: Confirming delete removes the authorization and returns to the scale site authorizations tab
    # Seeded WITH a child condition so the confirmed delete exercises the server-side cascade
    # (delete children then parent). The GET → 404 proves the parent is gone; the cascade has teeth
    # because a failed child delete would FK-block the parent DELETE (the child itself is not read back).
    Given a scale site authorization with a condition exists
    When I open the scale site authorization view
    And I confirm the scale site authorization delete
    Then the delete confirmation asked "Are you sure you want to delete this record?"
    And I land on the scale site authorizations tab
    And the scale site authorization is deleted

  @S02 @p2 @CNF-001
  Scenario: Cancelling the delete confirmation sends no request
    Given a scale site authorization exists
    When I open the scale site authorization view
    And I cancel the scale site authorization delete
    Then the delete confirmation asked "Are you sure you want to delete this record?"
    And no scale site authorization delete request is sent
    And I remain on the scale site authorization view
