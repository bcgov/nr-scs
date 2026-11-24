# Re-grounded from UC-SCA-007 (view scale site authorization). The scenario API-SEEDS a record (site 520)
# then opens the read-only view (/scale-site-authorizations/view/{id}, GET /api/scale-site-authorizations/
# {id}) and asserts the rendered field values. The non-existent-id path renders the inline load error.
# Records are cleaned up via DELETE on teardown (createdScaleSiteAuthIds).
@sca @UC-SCA-007 @view
Feature: View Scale Site Authorization

  @S01 @p0
  Scenario: View a scale site authorization's read-only detail
    Given a scale site authorization exists
    When I open the scale site authorization view
    Then the scale site authorization view shows "scaleSiteNumber" of "520"
    And the scale site authorization view shows "status" of "Active"

  @S01 @p1
  Scenario: Viewing a non-existent authorization shows a load error
    Given I open the scale site authorization view for a non-existent id
    Then the scale site authorization view shows a load error
