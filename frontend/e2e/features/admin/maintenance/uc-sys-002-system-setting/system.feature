# Chain: UC-SYS-002.md › -detailed.md › -slices.md › gherkin/UC-SYS-002-S01/S03/S04/S05/S06 › THIS FILE
#
# Re-grounded onto the BUILT React "Maintain - System" page (/maintenance/system). It maintains ONE
# singleton setting — the `WMSG` "Current News" welcome message — with read + update only (no list /
# create / delete, and NO enable/disable toggle, so legacy S02 is not-applicable). Every scenario touches
# that one shared row, so the feature runs @mode:serial and a guard fixture restores the original value on
# teardown. (The per-UC parallel stress runs at workers=1: a singleton-mutation UC cannot be repeat-each'd
# across workers without racing the shared row.)
#
# Re-grounding: Save is DISABLED until the text changes (client `currentNews === initialNews`); on success
# the page shows a "System setting saved." banner and stays on the page. Blank / over-length are rejected
# server-side with a clean 400 + meaningful message (fixed in nr-scs SystemSettingService — the earlier
# generic-500 divergences #1/#2 are now closed).
@sys @UC-SYS-002 @mode:serial
Feature: Configure System Setting — Welcome Message

  @S01 @p0
  Scenario: Administrator updates the welcome message
    Given I am on the System page
    Then the system Save button should be disabled
    When I enter a new welcome message
    Then the system Save button should be enabled
    When I save the system setting
    Then the welcome message should be saved
    And the welcome message field should show the saved text

  @S03 @p2
  Scenario: Back discards unsaved edits and returns to the welcome page
    Given I am on the System page
    When I enter a new welcome message
    And I go back from the system page
    Then I should be returned to the welcome page
    And no system setting update should be sent
    And the stored welcome message should be unchanged

  @S04 @p2
  Scenario: Reset discards unsaved edits
    Given I am on the System page
    When I enter a new welcome message
    And I reset the system form
    Then the welcome message field should show the original text
    And no system setting update should be sent

  @S05 @p1
  Scenario: Saving a blank welcome message is rejected with a required-field error
    Given I am on the System page
    When I clear the welcome message
    And I save the system setting
    Then a required-field validation message should be shown
    And the stored welcome message should be unchanged

  @S06 @p1
  Scenario: Saving an over-length welcome message is rejected with a maximum-length error
    Given I am on the System page
    When I enter a welcome message over the maximum length
    And I save the system setting
    Then a maximum-length validation message should be shown
    And the stored welcome message should be unchanged
