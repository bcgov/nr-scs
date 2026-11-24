# Chain: UC-SSC-002.md › -detailed.md › -slices.md › gherkin/UC-SSC-002-S01/S05/S06/S07 › THIS FILE
#
# Re-grounded from UC-SSC-002 S01 (create happy), S05 (required-field missing), S06 (site-type cross-field)
# and S07 (expiry before effective). Save forwards to the read-only view. Composite key (class + server-
# generated #), so the created id is read from the view for read-back + cleanup. Client-block negatives
# assert ZERO create POSTs.
#
# Re-grounding notes:
#  - SIA requires ≥1 Site Type; MSD hides Site Type (creatable without it — covered as the @p1 MSD happy
#    path, proving the symmetry).
#  - S06 SCA arm: SCA (like MSD) hides Site Type and does not require one — client now matches the backend
#    (SIA requires; MSD/SCA forbid). Formerly the SCA @discovered-divergence; FIXED 2026-07-24 (Divergence #1).
#  - Sort Order range (client "must be between 0 and 9999.") is the re-grounded form of legacy S08's
#    negative-sort rule.

@ssc @UC-SSC-002
Feature: Maintain Conditions — Create

  @S01 @p0
  Scenario: Administrator creates a new SIA condition with a Site Type
    Given I am on the Conditions list
    When I open the condition create form
    And I enter a valid condition
    And I save the condition
    And the created condition is registered for cleanup
    Then the condition should be shown in the view
    And the saved condition should match the submitted values

  @S01 @p1
  Scenario: Administrator creates an MSD condition (Site Type hidden, not required)
    Given I am on the Conditions list
    When I open the condition create form
    And I enter a valid condition of type "MSD"
    And I save the condition
    And the created condition is registered for cleanup
    Then the condition should be shown in the view
    And the saved condition should match the submitted values

  @S05 @p1
  Scenario Outline: Save is blocked when "<field>" is missing — <case>
    Given I am on the Conditions list
    And I open the condition create form
    And I enter a valid condition
    When I clear the condition "<field>" field
    And I save the condition
    Then I should see the error "<message>"
    And no create-condition request should be sent

    Examples:
      | case                 | field          | message                     |
      | Type blank           | Type           | Type is required.           |
      | Title blank          | Title          | Title is required.          |
      | Mandatory blank      | Mandatory?     | Mandatory? is required.     |
      | Sort Order blank     | Sort Order     | Sort Order is required.     |
      | Effective Date blank | Effective Date | Effective Date is required. |
      | Condition Text blank | Condition Text | Condition Text is required. |
      | Site Type blank      | Site Type      | Site Type is required.      |

  @S08 @p1
  Scenario: Save is blocked when Sort Order is out of range
    Given I am on the Conditions list
    And I open the condition create form
    And I enter a valid condition
    When I set the condition "Sort Order" field to "-1"
    And I save the condition
    Then I should see the error "Sort Order must be between 0 and 9999."
    And no create-condition request should be sent

  @S07 @p1
  Scenario: Save is blocked when Effective Date is after Expiry Date
    Given I am on the Conditions list
    And I open the condition create form
    And I enter a valid condition
    When I set the condition Effective Date after its Expiry Date
    And I save the condition
    Then I should see the error "Expiry Date must be on or after Effective Date."
    And no create-condition request should be sent

  # SCA (like MSD) hides Site Type and does not require one — the client now matches the backend (fixed
  # 2026-07-24; formerly the SCA @discovered-divergence, defects.md Divergence #1 → CLOSED).
  @S06 @p1
  Scenario: Administrator creates an SCA condition (Site Type hidden, not required)
    Given I am on the Conditions list
    When I open the condition create form
    And I enter a valid condition of type "SCA"
    And I save the condition
    And the created condition is registered for cleanup
    Then the condition should be shown in the view
    And the saved condition should match the submitted values
