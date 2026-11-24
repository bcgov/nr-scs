# Re-grounded from UC-MSD-001 S08 (District Wide=No requires ≥1 scale site → ERR-011), S06 (Scale Site
# Not Found → ERR-013), and the species-content control matrix in -slices.md. These controls live on the
# advanced section, revealed by "Add Conditions" once the basics validate; the Scale Sites section
# renders ONLY when District Wide = No (ScaleSitesSection returns null otherwise). All are enforced
# client-side — none POST — so each asserts the message + that no create request was sent. Site
# '99999999' is a provably-absent id (≤8 chars) pinned in fixtures/msd/msd-test-data.ts.
@msd @UC-MSD-001
Feature: Create Mark Site Designation — Advanced Section Validation

  @S08 @p1 @ERR-011
  Scenario: Save is blocked when District Wide is No and no scale site is added
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "No"
    And I click Add Conditions
    And I click Save Record
    Then I should see the error "At least one Scale Site is required when District Wide is No."
    And I should remain on the mark site designation create form
    And no mark site designation should be created

  @S06 @p1 @ERR-013
  Scenario: Adding an unknown scale site number is rejected
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "No"
    And I click Add Conditions
    And I add scale site "99999999"
    Then I should see the error "Site 99999999 was not found."
    And I should remain on the mark site designation create form
    And no mark site designation should be created

  # ERR-012 "Site # is required." — the required-partner of the covered ERR-013 not-found guard
  # (addScaleSiteById blank branch). On create the Scale Sites field is reached only via "Add Conditions"
  # (submitAttempted=true), so — unlike the EDIT screen where the same message is suppressed (UC-MSD-002
  # Divergence #2) — the message DISPLAYS here. Client-side: never POSTs.
  @S06 @p1 @ERR-012
  Scenario: Adding a scale site with a blank number is rejected
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "No"
    And I click Add Conditions
    And I add a scale site with no number
    Then I should see the error "Site # is required."
    And I should remain on the mark site designation create form
    And no mark site designation should be created

  # Species-content is a create-screen control enumerated in -slices.md (not a distinct numbered slice).
  # "Species is required." needs no reference data; the content-percent guards need a real species SELECTED
  # first (validSpeciesCode 'AL' from the SCALE_SPECIES_CODE LOV). The remaining two species guards
  # ("Species has already been added." / "Select a valid species.") are UI-unreachable — the Species
  # <Select> filters out already-added codes and only offers valid ones — so they are defensive-only and
  # logged not-applicable in coverage.md, not asserted. All guards are client-side: none POST.
  @S02 @p2
  Scenario: Adding a species with no selection is rejected
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "No"
    And I click Add Conditions
    And I add a species with no details
    Then I should see the error "Species is required."
    And I should remain on the mark site designation create form
    And no mark site designation should be created

  @S02 @p2
  Scenario: Adding a species with no content is rejected
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "No"
    And I click Add Conditions
    And I choose species "AL"
    And I add the species
    Then I should see the error "Content is required."
    And I should remain on the mark site designation create form
    And no mark site designation should be created

  @S02 @p2
  Scenario: Adding a species with a non-integer content is rejected
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "No"
    And I click Add Conditions
    And I choose species "AL"
    And I enter species content "1.5"
    And I add the species
    Then I should see the error "Content must be an integer."
    And I should remain on the mark site designation create form
    And no mark site designation should be created

  # ERR-016 "Condition #" numeric guard on the shared AuthorizationConditionsSection (same component used
  # by MSD edit + Scaler/Scale-Site authorizations, so covering it once here satisfies UC-MSD-001 CG#3
  # AND UC-MSD-002 CG#3). Re-grounded wording: legacy "Condition # must be a number." → app "Condition #
  # must be a valid number." The sibling guards "Condition # is required." (Add disabled while blank) and
  # ERR-018 "Template is required." (Apply disabled with no selection) are button-gated → UI-unreachable →
  # logged not-applicable in coverage.md. Client-side: no search request, no create POST.
  @S10 @p2 @ERR-016
  Scenario: Adding a condition with a non-numeric number is rejected
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "No"
    And I click Add Conditions
    And I add a condition numbered "abc"
    Then I should see the error "Condition # must be a valid number."
    And I should remain on the mark site designation create form
    And no mark site designation should be created
