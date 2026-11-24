# Chain: UC-MNT-001.md › -detailed.md › -slices.md › gherkin/UC-MNT-001-S01/S05/S06 › THIS FILE
#
# Re-grounded from UC-MNT-001 S01 (Add Signatory happy path), S05 (required-field missing) and S06
# (field exceeds max length). Source: UC-MNT-001-slices.md / -technical.md. Save forwards to the
# read-only view (shared maintenance-page pattern), so the happy path asserts the view + an API
# read-back. The signature-block PK is server-generated, so the created record is discovered by its
# unique last name and registered for cleanup. Client-block negatives assert ZERO create POSTs.

@mnt @UC-MNT-001
Feature: Maintain Signatories — Create

  @S01 @p0
  Scenario: Administrator adds a new signatory
    Given I am on the Signatories list
    When I open the signatory create form
    And I enter a valid signatory
    And I save the signatory
    And the created signatory is registered for cleanup
    Then the signatory should be shown in the view
    And the saved signatory should match the submitted values

  @S05 @p1
  Scenario Outline: Save is blocked when "<field>" is missing — <case>
    Given I am on the Signatories list
    And I open the signatory create form
    And I enter a valid signatory
    When I clear the signatory "<field>" field
    And I save the signatory
    Then I should see the error "<message>"
    And no create-signatory request should be sent

    Examples:
      | case              | field       | message                  |
      | First Name blank  | First Name  | First Name is required.  |
      | Last Name blank   | Last Name   | Last Name is required.   |
      | Position blank    | Position    | Position is required.    |
      | Reg / Dist blank  | Reg / Dist  | Reg / Dist is required.  |

  @S06 @p1
  Scenario: Save is blocked when First Name exceeds 40 characters
    Given I am on the Signatories list
    And I open the signatory create form
    And I enter a valid signatory
    When I set the signatory "First Name" field to a 41-character string
    And I save the signatory
    Then I should see the error "First Name must be 40 characters or fewer."
    And no create-signatory request should be sent
