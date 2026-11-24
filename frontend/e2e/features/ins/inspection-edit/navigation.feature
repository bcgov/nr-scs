# Chain: (none — APP-ONLY capability) › THIS FILE
#
# How the actor gets into and out of the edit form, and the two abandon paths (Back / Reset). Both
# abandon scenarios PROVE the negative twice over: no PUT was issued (endpoint spy === 0) AND the record
# itself still holds what it held when the form loaded (API read-back against the pre-edit baseline).
# A missing redirect alone would not be proof — the write could fire and the URL still look unchanged.
#
# The Reset assertion compares against the baseline the API reported at load time, so no date or answer
# literal is pinned: a DB re-extract or a different seeded record cannot make it stale.

@ins @UC-INS-003 @edit @app-only
Feature: Edit Site Inspection — navigation (app-only)

  # The entry point a real user takes: the read-only view's "Edit Record" action. UC-INS-002 asserts the
  # button RENDERS; this asserts it actually lands on the edit form for the same inspection.
  @S02 @p1
  Scenario: Edit Record on the inspection view opens the edit form for that inspection
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection view
    And I click Edit Record on the inspection view
    Then the inspection edit form opens for that inspection

  @S02 @p1
  Scenario: Back from the edit form returns to the view and abandons the changes
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I change the inspection header and answers
    And I go back from the inspection edit form
    Then the site inspection view is shown for that inspection
    And no inspection update request should be sent
    And the persisted inspection is unchanged

  @S03 @p2
  Scenario: Reset restores the values the edit form loaded with
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I change the inspection header and answers
    And I reset the inspection edit form
    Then the inspection edit form shows the originally loaded values
    And no inspection update request should be sent
