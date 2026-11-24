# Chain: UC-SCA-011.md › -detailed.md › -slices.md › gherkin/UC-SCA-011-S01..S06 › THIS FILE
#
# Re-grounded onto the built React Work Bench (/workbench), "Expiring Mark Site Designations" section.
# Each scenario SEEDS a disposable expiring MSD (mark ES20R4 via the msd-create-mark.sql patch, District
# Wide so no scale-site unique-key collision, expiry today+15) and cleans it up at the DB (no DELETE
# endpoint; renewed clones too). Shared global section → @mode:serial (stress at workers=1).
#
# REQUIRES the msd-create-mark.sql patch applied (scripts/apply-patches.sh) so ES20R4 is creatable.
# S05/S06 permission-gating blocked by single-role mock auth — see defects.md.
@sca @UC-SCA-011 @mode:serial
Feature: Work Bench — Expiring Mark Site Designations

  @S01 @p0
  Scenario: An expiring mark site designation appears on the Work Bench
    Given a disposable expiring mark site designation exists
    And I am on the Work Bench
    Then the expiring authorization appears in its Work Bench section

  @S01 @p0
  Scenario: Renewing an expiring mark site designation via Add
    Given a disposable expiring mark site designation exists
    And I am on the Work Bench
    When I renew the expiring authorization from the Work Bench
    Then I am taken to the renewed authorization
    And the renewed authorization has a later expiry date

  @S02 @p0
  Scenario: Removing an expiring mark site designation after confirming
    Given a disposable expiring mark site designation exists
    And I am on the Work Bench
    When I remove the expiring authorization and confirm
    Then the expiring authorization is no longer in its Work Bench section
    And the authorization still exists

  @S03 @p2
  Scenario: Cancelling the removal keeps the mark site designation
    Given a disposable expiring mark site designation exists
    And I am on the Work Bench
    When I remove the expiring authorization and cancel
    Then the remove confirmation asks to remove the record from the list
    And the expiring authorization is still in its Work Bench section
    And no remove-from-workbench request is sent

  @S04 @p2
  Scenario: The MSD section shows no records when none are expiring
    Given I am on the Work Bench
    Then the msd Work Bench section shows no expiring records
