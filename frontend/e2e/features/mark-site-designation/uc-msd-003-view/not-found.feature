@msd @UC-MSD-003 @view
Feature: View Mark Site Designation — Not Found
  As a District Scaling Manager
  I want a clear error when I open an MSD id that does not exist
  So that I know the record is missing rather than seeing a blank or broken page

  # Re-grounded S06: legacy raised a Struts delegate exception with an unspecified banner. The new app's
  # GET /api/mark-site-designations/{id} returns HTTP 404 {code:"NOT_FOUND", message:"No mark site
  # designation found with id {id}"}; the view page surfaces it as an inline error notification and
  # renders no record. Uses the provably-absent id 99999999 (fixtures/msd/msd-test-data.ts) — read-only.

  @p1 @S06 @ERR-001
  Scenario: Opening a non-existent MSD id shows a not-found error
    Given I open the Mark Site Designation view for a non-existent id
    Then the MSD view shows a load error
    And no MSD record fields are shown
