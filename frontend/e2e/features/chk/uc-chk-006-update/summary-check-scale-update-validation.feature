# Slice: UC-CHK-006-S06 (required blank), UC-CHK-006-S07 (invalid date), UC-CHK-006-S08 (SPG add invalid)
#
# Re-grounding notes (new app vs legacy Gherkin):
#  - S06: the required-field messages come from the new client validator (validateHeader). Only TEXT
#    and DATE required fields are exercisable here — the DROPDOWN required fields (Check Scale Type,
#    Followed Good Practices, Original within Standard, Check Replaces Original, Partial Load) cannot be
#    blanked via the UI because their empty <SelectItem> is disabled. Those dropdown-blank cases are a
#    Coverage gap (belong to component/unit tests). The S06 .feature listed only 3 fields while the
#    technical catalog (ERR-001..014) lists the full set -> Spec gap (see defects.md).
#  - S07: the legacy "must be in the format 'yyyyMMdd'" rule has NO new-app equivalent — dates are a
#    Carbon date picker (YYYY-MM-DD). The re-grounded date rule the new app enforces is "not in the
#    future"; the legacy format rule is a Coverage gap.
#  - S08: SPG add uses the shared validateSpgRow; the full numeric-format matrix is already covered by
#    UC-CHK-005-S03 (same validator). Here we prove the add path itself blocks + sends no request.
# Each negative case proves the write never left the browser (updateCalls/addSpgCalls === 0).
@chk @UC-CHK-006
Feature: Update Summary Check Scale — Validation

  @S06 @p1
  Scenario Outline: Clearing required "<field>" blocks the save
    Given I am editing an existing summary check scale
    When I clear the "<field>" field
    And I save the summary check scale
    Then I should see the error "<message>"
    And I should remain on the update form
    And no update request should be sent

    Examples:
      | field                   | message                                |
      | Check Scaler Licence    | Check Scaler Licence # is required.     |
      | Original Scaler Licence | Original Scaler Licence # is required.  |
      | Timber Mark             | Timber Mark is required.                |
      | Scale Site Number       | Scale Site # is required.               |
      | Original Scale Return   | Original Scale Return is required.      |
      | Check Scale Return      | Check Scale Return is required.         |
      | Original Date of Scale  | Original Date of Scale is required.     |
      | Check Date of Scale     | Check Date of Scale is required.        |

  @S07 @p1
  Scenario: A future scale date is rejected client-side (re-grounded from the legacy yyyyMMdd format rule)
    Given I am editing an existing summary check scale
    When I enter a future date in "Original Date of Scale"
    And I save the summary check scale
    Then I should see the error "Scale dates cannot be in the future."
    And I should remain on the update form
    And no update request should be sent

  @S08 @p1
  Scenario: Adding an SPG row with no species is blocked
    Given I am editing an existing summary check scale
    When I add the SPG row
    Then I should see the error "Species is required."
    And no SPG add request should be sent

  @S08 @p1
  Scenario: Adding an SPG row with a non-integer Original Pieces is blocked
    Given I am editing an existing summary check scale
    When I change the "Species" field to "FI"
    And I change the "Original Pieces" field to "abc"
    And I add the SPG row
    Then I should see the error "Original Pieces must be an integer."
    And no SPG add request should be sent
