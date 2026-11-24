# Chain: UC-SCA-009.md › -detailed.md › -slices.md › gherkin/UC-SCA-009-S01..S06 › THIS FILE
#
# Re-grounded onto the built React Work Bench (/workbench), "Expiring Scaler Authorizations" section.
# Each scenario SEEDS a disposable expiring scaler authorization (expiry today+15, notification 'N' → it
# appears in the section) and cleans it up (DELETE endpoint; renewed clones too). The section is SHARED
# global state, so the feature runs @mode:serial (stress at workers=1).
#
# Re-grounding notes: "Add" = renew (clones the auth with extended dates and navigates to the new record);
# "Remove" fires a window.confirm "Are you sure you want to remove this record from the list?" (legacy said
# "delete this record") then POSTs …/workbench/remove. S05/S06 (permission-gated buttons / direct-call
# denial) are blocked by single-role mock auth — see defects.md.
@sca @UC-SCA-009 @mode:serial
Feature: Work Bench — Expiring Scaler Authorizations

  @S01 @p0
  Scenario: An expiring scaler authorization appears on the Work Bench
    Given a disposable expiring scaler authorization exists
    And I am on the Work Bench
    Then the expiring authorization appears in its Work Bench section

  @S01 @p0
  Scenario: Renewing an expiring scaler authorization via Add
    Given a disposable expiring scaler authorization exists
    And I am on the Work Bench
    When I renew the expiring authorization from the Work Bench
    Then I am taken to the renewed authorization
    And the renewed authorization has a later expiry date

  @S02 @p0
  Scenario: Removing an expiring scaler authorization after confirming
    Given a disposable expiring scaler authorization exists
    And I am on the Work Bench
    When I remove the expiring authorization and confirm
    Then the expiring authorization is no longer in its Work Bench section
    And the authorization still exists

  @S03 @p2
  Scenario: Cancelling the removal keeps the scaler authorization
    Given a disposable expiring scaler authorization exists
    And I am on the Work Bench
    When I remove the expiring authorization and cancel
    Then the remove confirmation asks to remove the record from the list
    And the expiring authorization is still in its Work Bench section
    And no remove-from-workbench request is sent

  @S04 @p2
  Scenario: The scaler section shows no records when none are expiring
    Given I am on the Work Bench
    Then the scaler Work Bench section shows no expiring records
