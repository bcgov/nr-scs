# Chain: UC-SST-005.md › -detailed.md › -slices.md › gherkin/UC-SST-005-S02,-S03,-S04 › THIS FILE
#
# The edit modal renders the SAME `ScaleSiteForm.validateScaleSiteForm` as create, so required /
# duplicate-type / coordinate errors are caught CLIENT-side and never PUT — each negative proves
# `no update-scale-site request should be sent` (spy === 0) and that the modal stays open. Each scenario
# seeds + DB-cleans its OWN site (a dedicated mutable key, parallel-safe — consistent with UC-SST-006).
# The full coordinate / timber-brand matrix is exhaustively covered on the shared validator in UC-SST-004
# (create); here we assert the update modal WIRES that validator on its own host (one case per rule class).
#
# @mode:serial — the site seeds go through the racy min-free-id PK trigger (see uc-sst-004-create/defects.md).
@sst @UC-SST-005 @mode:serial
Feature: Update Scale Site — validation

  @S02 @p1
  Scenario: A blank required field is rejected before any update request
    Given I am editing a newly created scale site
    When I clear the scale site name and save
    Then I should see the error "Scale Site Name is required."
    And no update-scale-site request should be sent
    And the edit modal is still open

  @S03 @p1
  Scenario: Duplicate site types are rejected before any update request
    Given I am editing a newly created scale site
    When I set duplicate site types and save
    Then I should see the error "Site type codes must be distinct."
    And no update-scale-site request should be sent
    And the edit modal is still open

  @S04 @p1
  Scenario: An incomplete coordinate is rejected before any update request
    Given I am editing a newly created scale site
    When I enter an incomplete coordinate and save
    Then I should see the error "Latitude must include degrees, minutes, and seconds."
    And no update-scale-site request should be sent
    And the edit modal is still open
