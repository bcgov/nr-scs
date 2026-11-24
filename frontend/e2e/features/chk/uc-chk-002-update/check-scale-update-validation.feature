# Re-grounded from UC-CHK-002-S05 (required fields blank) and S06 (Net Value non-numeric).
# Source: UC-CHK-002-slices.md / -technical.md (ERR-001..006). Both directions prove the negative:
# the client validator blocks the save, so NO PUT leaves the browser (assert zero updates), the record
# is never touched; each scenario creates its own fresh editable record (no persistent record exists in
# the real data), so they stay independent + parallel-safe.
# Error text is the app's re-grounded wording (from Edit/CheckScale validate + utils/netValue),
# ground-truthed 2026-07-08; it drops the legacy trailing "?" (e.g. "Followed Good Practices is
# required." not "Followed Good Practices? is required.").

@chk @UC-CHK-002
Feature: Update Detail Check Scale — Validation

  @S05 @p1
  Scenario Outline: Save is blocked when required "<field>" is cleared
    Given I am editing the seeded detail check scale
    When I set the edit field "<field>" to ""
    And I save the check scale edit
    Then I should see the error "<message>"
    And no check scale should be updated

    Examples:
      | field                    | message                               |
      | Check Scale Type         | Check Scale Type is required.         |
      | Followed Good Practices  | Followed Good Practices is required.  |
      | Original within Standard | Original within Standard is required. |

  @S06 @p1
  Scenario Outline: Save is blocked when "<field>" is non-numeric
    Given I am editing the seeded detail check scale
    When I set the edit field "<field>" to "abc"
    And I save the check scale edit
    Then I should see the error "<message>"
    And no check scale should be updated

    Examples:
      | field              | message                                    |
      | Original Net Value | Original Scale Net Value must be a number. |
      | Check Net Value    | Check Scale Net Value must be a number.    |
