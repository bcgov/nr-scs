@msd @UC-MSD-003 @view
Feature: View Mark Site Designation
  As a District Scaling Manager
  I want to open a Mark Site Designation record read-only
  So that I can inspect the mark/site combination, scaling methods, species, and conditions

  # Re-grounded from legacy UC-MSD-003 onto the new React app:
  #   route  /mark-site-designations/view?haulingMarkAuthorizationId={id}  (was /markSiteView)
  #   read   GET /api/mark-site-designations/{id}
  # Read-only screen -> scenarios open DISCOVERED REAL records (fixtures/msd/msd-test-data.ts); no seed,
  # no cleanup, parallel-safe. Legacy field renames: MSD# = haulingMarkAuthorizationId, Geographic
  # Location = geographicLocation, Population = population, Est. Truck Loads = estimatedTruckLoads.
  # Divergences vs legacy (see defects.md): no Exemptions section, Delete is a workbench-remove.
  # Site # regained its scale-site link on 2026-08-13 (nr-scs 81a4a62), closing Divergence #2 — and via
  # `PermissionLink`, so it links only for a role holding SCALE_SITE_READ, exactly as legacy S04 asked.
  # Role/permission slices (S05/S07) are no longer blocked in principle — the role model shipped and
  # `pages/security/RoleSessionPage` can drive any role (see features/security/) — but the plain-text half of the
  # Site # rule needs a role holding MSD_READ without SCALE_SITE_READ, which none does yet.

  @p0 @S01
  Scenario: District Scaling Manager views a complete MSD read-only
    Given I open the Mark Site Designation view for the rich sample record
    Then the read-only MSD view has loaded
    And the MSD view page title is shown
    And the MSD header field "msdNumber" shows "2681"
    And the MSD header field "timberMark" shows "23/159"
    And the MSD header field "geographicLocation" shows "castlegar"
    And the MSD header field "population" shows "5021"
    And the MSD header field "effectiveDate" shows "2009-04-01"
    And the MSD header field "expiryDate" shows "2014-04-01"
    And the Scale Sites table shows site "561" with name "SLOCAN FOREST PRODUCTS"
    And the Scale Sites Site # "561" links to its scale-site view
    And the Species Content table shows content "100%"
    And the Conditions table shows condition "185" titled "DIRECT TRANSPORTATION" marked mandatory "Yes"
    And the MSD "Edit Record" action button is shown
    And the MSD "Delete" action button is shown
    And the MSD "Create Letter" action button is shown

  @p1 @S03 @ERR-STA-008
  Scenario: Letter issued — the View Letter button replaces Create Letter
    Given I open the Mark Site Designation view for the letter-issued record
    Then the read-only MSD view has loaded
    And the MSD "View Letter" action button is shown
    And the MSD "Create Letter" action button is not shown
