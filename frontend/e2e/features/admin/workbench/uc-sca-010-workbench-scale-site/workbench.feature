# Chain: UC-SCA-010.md › -detailed.md › -slices.md › gherkin/UC-SCA-010-S01..S06 › THIS FILE
#
# Re-grounded onto the built React Work Bench (/workbench), "Expiring Scale Site Authorizations" section.
# Each scenario SEEDS a disposable expiring scale-site authorization (site '000', expiry today+15) and
# cleans it up via the DELETE endpoint (renewed clones too). Shared global section → @mode:serial.
#
# No S04 "empty section" scenario: the real extract always contains ≥1 expiring scale-site authorization
# (e.g. 239291), so the section is never reliably empty — see coverage.md (not-applicable). S05/S06
# permission-gating blocked by single-role mock auth — see defects.md.
@sca @UC-SCA-010 @mode:serial
Feature: Work Bench — Expiring Scale Site Authorizations

  @S01 @p0
  Scenario: An expiring scale site authorization appears on the Work Bench
    Given a disposable expiring scale site authorization exists
    And I am on the Work Bench
    Then the expiring authorization appears in its Work Bench section

  @S01 @p0
  Scenario: Renewing an expiring scale site authorization via Add
    Given a disposable expiring scale site authorization exists
    And I am on the Work Bench
    When I renew the expiring authorization from the Work Bench
    Then I am taken to the renewed authorization
    And the renewed authorization has a later expiry date

  @S02 @p0
  Scenario: Removing an expiring scale site authorization after confirming
    Given a disposable expiring scale site authorization exists
    And I am on the Work Bench
    When I remove the expiring authorization and confirm
    Then the expiring authorization is no longer in its Work Bench section
    And the authorization still exists

  @S03 @p2
  Scenario: Cancelling the removal keeps the scale site authorization
    Given a disposable expiring scale site authorization exists
    And I am on the Work Bench
    When I remove the expiring authorization and cancel
    Then the remove confirmation asks to remove the record from the list
    And the expiring authorization is still in its Work Bench section
    And no remove-from-workbench request is sent
