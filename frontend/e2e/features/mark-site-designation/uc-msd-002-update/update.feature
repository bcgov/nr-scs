# Re-grounded from UC-MSD-002 onto the new React edit screen (route /mark-site-designations/edit/:id;
# write path PUT /api/mark-site-designations/{id}). Each scenario SEEDS its own fresh record via the API
# (ES20R4, made creatable by scs-real-test-data-patches/msd/msd-create-mark.sql) then edits it, so
# tests are independent and self-cleaning (removed at the DB on teardown — no DELETE endpoint). Success
# is PROVEN by a full API read-back of the persisted record (bounded poll — the Save is UI-triggered).
# Data pinned in fixtures/msd/msd-test-data.ts. No @mode:serial needed: the PUT update path has no
# concurrency issue, and the seed create retries the known intermittent 409 (UC-MSD-001 Bug #1).
@msd @UC-MSD-002
Feature: Update Mark Site Designation

  @S01 @p0
  Scenario: Update an MSD's editable fields and save
    Given a mark site designation exists
    When I open it for editing
    And I change the geographic location and estimated volume
    And I save my changes
    Then the updated record reads back with the new geographic location and estimated volume

  @S05 @p2
  Scenario: Reset discards in-progress edits
    Given a mark site designation exists
    When I open it for editing
    And I change the geographic location
    And I reset the mark site designation form
    Then the geographic location field is restored to its saved value
    And no mark site designation update should be sent

  @S06 @p2
  Scenario: Add a scale site during update and save
    Given a mark site designation exists
    When I open it for editing
    And I set District Wide to "No"
    And I add its scale site
    And I save my changes
    Then the updated record reads back with district wide "N"
    And the updated record includes its scale site

  # Changing District Wide N→Y clears the scale sites (the edit form drops them immediately; the save
  # then persists a district-wide record with no sites). Re-grounded from the legacy JS-alert behaviour.
  @S10 @p2
  Scenario: Switching District Wide to Yes clears the scale sites
    Given a mark site designation with a scale site exists
    When I open it for editing
    And I set District Wide to "Yes"
    And I save my changes
    Then the updated record reads back with district wide "Y"
    And the updated record has no scale sites
