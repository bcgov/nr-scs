# Re-grounded from UC-SST-005 (Update Scale Site) onto the new React app: the `ScaleSiteEditModal` opened
# from the Summary tab's "Edit Record" button on /scale-sites/view/{id} -> PUT /api/scale-sites/{id}
# (ScaleSiteService.updateScaleSite, same validator as create). Success is PROVEN by an API read-back of
# GET /api/scale-sites/{id}/summary. Each scenario here seeds + cleans up its OWN site (a dedicated
# mutable key, parallel-safe); the seed goes through the create endpoint, so it needs the
# sst/integer-number-seed patch (see uc-sst-004-create). No delete endpoint -> DB teardown.
#
# SCOPE: this UC's summary-edit modal (S01/S05/S06 here, S02–S04 in validation.feature). The legacy UC's
# S07/S08 (contacts) are covered under UC-SST-006, S09 (authorized-scaler filter) under UC-SST-008, and
# S10/S11 (district scoping / no-permission) are blocked by single-role mock auth — see coverage.md.
#
# @mode:serial — the seeds go through the same racy min-free-id PK trigger as create (see
# uc-sst-004-create/defects.md "concurrency"); serialising this file's creates avoids manufacturing the race.
@sst @UC-SST-005 @mode:serial
Feature: Update Scale Site

  @S01 @p0
  Scenario: Update a scale site's name and site type
    Given I am editing a newly created scale site
    When I change the site name and a site type and save
    Then the updated scale site reads back with the new name and site type

  @S05 @p2
  Scenario: Reset restores the original values without saving
    Given I am editing a newly created scale site
    When I change the site name and reset the form
    Then the edit form shows the original site name
    And no update-scale-site request should be sent

  @S06 @p2
  Scenario: Closing the modal without saving discards the edits
    Given I am editing a newly created scale site
    When I change the site name and close the modal without saving
    Then the edit modal is closed
    And no update-scale-site request should be sent
    And the scale site still reads back with its original name
