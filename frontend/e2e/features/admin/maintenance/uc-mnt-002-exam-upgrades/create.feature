# Chain: UC-MNT-002.md › -detailed.md › -slices.md › gherkin/UC-MNT-002-S01/S06/S08 › THIS FILE
#
# Re-grounded from UC-MNT-002 S01 (create happy), S06 (required-field missing) and S08 (expiry before
# effective). Save forwards to the read-only view. The record key is composite (Type + server-generated
# #), so the created id is read from the view for read-back + cleanup. Client-block negatives assert
# ZERO create POSTs.
#
# Re-grounding notes: S07 (invalid date format) and S09 (Description max length) are NOT reproducible in
# the new UI — the date fields are a Carbon date picker (no free-text) and `validateForm` has no
# description-length branch. Logged in coverage.md / defects.md, not covered here.

@mnt @UC-MNT-002
Feature: Maintain Exam Upgrades — Create

  @S01 @p0
  Scenario: Administrator creates a new exam upgrade
    Given I am on the Exam Upgrades list
    When I open the exam upgrade create form
    And I enter a valid exam upgrade
    And I save the exam upgrade
    And the created exam upgrade is registered for cleanup
    Then the exam upgrade should be shown in the view
    And the saved exam upgrade should match the submitted values

  @S06 @p1
  Scenario Outline: Save is blocked when "<field>" is missing — <case>
    Given I am on the Exam Upgrades list
    And I open the exam upgrade create form
    And I enter a valid exam upgrade
    When I clear the exam upgrade "<field>" field
    And I save the exam upgrade
    Then I should see the error "<message>"
    And no create-exam-upgrade request should be sent

    Examples:
      | case                    | field             | message                         |
      | Type blank              | Type              | Type is required.               |
      | Licence Accredit blank  | Licence Accredit? | Licence Accredit? is required.  |
      | Description blank       | Description       | Description is required.        |
      | Effective Date blank    | Effective Date    | Effective Date is required.     |

  @S08 @p1
  Scenario: Save is blocked when Effective Date is after Expiry Date
    Given I am on the Exam Upgrades list
    And I open the exam upgrade create form
    And I enter a valid exam upgrade
    When I set the exam upgrade Effective Date after its Expiry Date
    And I save the exam upgrade
    Then I should see the error "Expiry Date must be on or after Effective Date."
    And no create-exam-upgrade request should be sent
