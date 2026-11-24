# The action-button NAVIGATION + empty-section render that view.feature (@S01) only asserted by presence.
# view.feature proves the Edit Record / Create Letter buttons are SHOWN; here they are actually CLICKED and
# the destination screen is asserted to load:
#   - Edit Record → /mark-site-designations/edit/{id}  (STA-002 → the edit screen)
#   - Create Letter (letterless record) → /mark-site-designations/{id}/letter  (STA-007 → letter options)
# Plus the empty child-section render: a district-wide designation with no scale sites and no species shows
# the empty Scale Sites + Species tables (the `showEmptyTableWhenNoResults` path — view.feature uses a fully
# populated record only). The nav scenarios open the discovered rich record (2681, read-only, letterless);
# the empty-section scenario seeds its own district-wide MSD via the API and cleans it up at the DB.
@msd @UC-MSD-003 @view
Feature: View Mark Site Designation — Navigation & Empty Sections

  @S02 @p1
  Scenario: The Edit Record button opens the edit screen
    Given I open the Mark Site Designation view for the rich sample record
    When I click the MSD Edit Record button
    Then I land on the mark site designation edit screen

  @S07 @p1
  Scenario: The Create Letter button opens the letter options screen
    Given I open the Mark Site Designation view for the rich sample record
    When I click the MSD Create Letter button
    Then I land on the mark site designation letter options screen

  @p2
  Scenario: A designation with no scale sites or species renders empty child sections
    Given a mark site designation exists
    When I open the seeded mark site designation in the view screen
    Then the Scale Sites section is empty
    And the Species Content section is empty
