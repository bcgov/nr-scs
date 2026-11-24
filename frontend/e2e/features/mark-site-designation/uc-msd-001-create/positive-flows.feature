# The POSITIVE counterparts to the negative section guards already covered in validation.feature /
# advanced-validation.feature. These exercise the create screen's interactive sections with valid input —
# behaviours that the happy-path create.feature (which saves a MINIMAL record) never touches:
#   - the timber-mark "Update" lookup SUCCESS path populating the mark-holder fields (the negative arm is
#     the not-found lookup in mark-not-found.feature; this is its positive mirror);
#   - the Species section add / list / remove (multiple rows);
#   - the Scale Sites section add-multiple / de-dup / remove.
# All are CLIENT-side: none POST (Save is never clicked) → no seed, no cleanup, parallel-safe. The holder
# values for the creatable mark ES20R4 are pinned in fixtures/msd/msd-test-data.ts (ground-truthed
# 2026-08-04; depends on the msd-create-mark.sql seed). The Scale Sites section renders only for District
# Wide=No; species render on the advanced section regardless.
@msd @UC-MSD-001
Feature: Create Mark Site Designation — Positive Section Flows

  @S03 @p1
  Scenario: Looking up a valid timber mark populates the mark-holder fields
    Given I am on the Mark Site Designation create form
    When I look up timber mark "ES20R4"
    Then the mark-holder fields are populated for the creatable mark
    And no mark site designation should be created

  @p2
  Scenario: Species rows can be added, listed and removed
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "Yes"
    And I click Add Conditions
    And I add valid species "AL" at "100"
    Then the species table lists "Alder"
    When I add valid species "BA" at "50"
    Then the species table lists "Balsam"
    When I remove the species row "Alder"
    Then the species table no longer lists "Alder"
    And the species table lists "Balsam"
    And no mark site designation should be created

  # The duplicate add is a REJECTION, not a silent de-duplication. This scenario used to assert only
  # "exactly once" — true either way — because the create screen swallowed the duplicate and cleared the
  # input, so a rejected add was indistinguishable from a successful one. It now asserts the message too.
  @p2 @ERR-015
  Scenario: Multiple scale sites can be added, a duplicate is rejected, and one can be removed
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "No"
    And I click Add Conditions
    And I add scale site "520"
    Then the scale sites table lists site "520"
    When I add scale site "525"
    Then the scale sites table lists site "525"
    When I add scale site "520" a second time
    Then I should see the error "The Scale Site 520 has already been added."
    And the scale sites table lists site "520" exactly once
    When I remove scale site "520"
    Then the scale sites table no longer lists site "520"
    And the scale sites table lists site "525"
    And no mark site designation should be created
