# Chain: UC-MNT-004.md › -detailed.md › -slices.md › gherkin/UC-MNT-004-S05/S07/S08 › THIS FILE
#
# Re-grounded from UC-MNT-004 S05 (required-field missing), S07 (expiry before effective) and S08
# (duplicate combination). S05/S07 are client-side blocks (assert ZERO create POST); S08 is a server
# rejection (the write IS sent, the backend returns a clean 400, and the existing record is unchanged).
# All three are parallel-safe: S05/S07 never persist, and S08 targets an existing combo read-only.

@mnt @UC-MNT-004
Feature: Maintain Valid Licence Attributes — Validation

  @S05 @p1
  Scenario Outline: Save is blocked when "<field>" is missing — <case>
    Given I am on the Valid Licence Attributes list
    And I open the licence attribute create form
    And I enter a valid licence attribute
    When I clear the licence attribute "<field>" field
    And I save the licence attribute
    Then I should see the error "<message>"
    And no create-licence-attribute request should be sent

    Examples:
      | case                   | field               | message                          |
      | Grading System blank   | Grading System Code | Grading System Code is required. |
      | Appointment Type blank | Appointment Type    | Appointment Type is required.    |
      | Effective Date blank   | Effective Date      | Effective Date is required.      |

  @S07 @p1
  Scenario: Save is blocked when Effective Date is after Expiry Date
    Given I am on the Valid Licence Attributes list
    And I open the licence attribute create form
    And I enter a valid licence attribute
    When I set the licence attribute Effective Date after its Expiry Date
    And I save the licence attribute
    Then I should see the error "Expiry Date must be on or after Effective Date."
    And no create-licence-attribute request should be sent

  @S08 @p1
  Scenario: Create is rejected when the grading system + appointment type already exists
    Given I am on the Valid Licence Attributes list
    And I open the licence attribute create form
    And I enter an existing licence attribute combination
    And I save the licence attribute
    Then I should see the error "already exists."
    And the licence attribute should still exist
