# Chain: UC-INS-001.md › -detailed.md › -slices.md › gherkin/UC-INS-001-S02/S03/S04/S10 › THIS FILE
#
# Re-grounded navigation / workflow slices for the two-stage create screen:
#  - S04 (empty list) uses site 16H — a forest_client-backed site that NO create test mutates and that
#    has ZERO scale_inspection_report rows in this extract, so its viewable inspection list is reliably
#    empty (GET /api/scale-sites/16H/inspections -> []). Keeping S04 off the mutating site (520) makes it
#    parallel-safe. (Re-grounded 2026-07-21: was 561, which now carries loaded inspections.)
#  - S02/S03 are the Back / Reset workflow controls; S10 is the Automated-type → Weight-Scale-only rule,
#    re-grounded from the legacy server "next()" override to the new app's immediate client behaviour
#    (selecting AUT checks W and disables the other site-type checkboxes).

@ins @UC-INS-001
Feature: Create Site Inspection — navigation and workflow

  @S04 @p1
  Scenario: A scale site with no inspections shows an empty list and the Add Inspection button
    Given I am viewing the inspections tab for scale site "16H"
    Then the inspections list is empty
    And the Add Inspection button is available

  @S04 @p2
  Scenario: Add Inspection opens the create screen
    Given I am viewing the inspections tab for scale site "16H"
    When I click Add Inspection
    Then the inspection create screen opens

  @S02 @p2
  Scenario: Back from the details step returns to the parameters step with selections preserved
    Given I am on the site inspection create screen for scale site "520"
    When I choose inspection type "MIN" and site type "W"
    And I go back to the inspection parameters step
    Then the inspection parameters step is shown
    And the inspection type is still "MIN"

  @S03 @p2
  Scenario: Reset restores the details step to its initial state
    Given I am on the site inspection create screen for scale site "520"
    When I choose inspection type "MIN" and site type "W"
    And I change the inspection details
    And I reset the inspection form
    Then the inspection details are cleared to their initial state

  @S10 @p1
  Scenario: Automated inspection type forces the site type to Weight Scale only
    Given I am on the site inspection create screen for scale site "520"
    When I choose the "AUT" inspection type
    Then the site type is forced to Weight Scale only
