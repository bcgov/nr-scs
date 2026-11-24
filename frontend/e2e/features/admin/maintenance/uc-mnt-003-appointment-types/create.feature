# Chain: UC-MNT-003.md › -detailed.md › -slices.md › gherkin/UC-MNT-003-S02/S05/S06/S07 › THIS FILE
#
# Re-grounded from UC-MNT-003 S02 (create happy path), S05 (required-field missing), S06 (format/length),
# and S07 (cross-field date order). Source: UC-MNT-003-slices.md / -technical.md (ERR-001..010). See
# coverage.md for the full source -> scenario reconciliation.
#
# Re-grounding notes (new React app is the source of truth for enforcement):
#  - Save now forwards to the read-only VIEW of the saved record (shared onSuccess pattern across the
#    maintenance pages), not back to the list — so the happy path asserts the view + a full API read-back.
#  - S06 length/format is NOT reproducible through the new UI: the code field is capped at maxLength=4 and
#    the description at maxLength=120 (over-length input is impossible to type), and the date fields are a
#    Carbon date picker (no free-text bad format). The RULE still exists at the DB/model; the client just
#    prevents the bad input rather than rejecting it on submit. Logged as a coverage note, not a divergence.
#  - Client-block negatives assert the create POST fired ZERO times (the write never leaves the browser),
#    in addition to the inline error.

@mnt @UC-MNT-003
Feature: Maintain Appointment Types — Create

  @S02 @p0
  Scenario: Administrator creates a new appointment type
    Given I am on the Appointment Types list
    When I open the appointment type create form
    And I enter a valid appointment type
    And I save the appointment type
    And the created appointment type is registered for cleanup
    Then the appointment type should be shown in the view
    And the saved appointment type should match the submitted values

  @S05 @p1
  Scenario Outline: Save is blocked when "<field>" is missing — <case>
    Given I am on the Appointment Types list
    And I open the appointment type create form
    And I enter a valid appointment type
    When I clear the appointment type "<field>" field
    And I save the appointment type
    Then I should see the error "<message>"
    And no create-appointment-type request should be sent

    Examples:
      | case                  | field            | message                         |
      | Code blank            | Appointment Type | Code is required.               |
      | Description blank     | Description      | Description is required.        |
      | Acting blank          | Acting?          | Acting indicator is required.   |
      | Effective Date blank  | Effective Date   | Effective date is required.     |
      | Expiry Date blank     | Expiry Date      | Expiry date is required.        |

  @S07 @p1
  Scenario: Save is blocked when Effective Date is after Expiry Date
    Given I am on the Appointment Types list
    And I open the appointment type create form
    And I enter a valid appointment type
    When I set the appointment type Effective Date after its Expiry Date
    And I save the appointment type
    Then I should see the error "Expiry date cannot be before effective date."
    And no create-appointment-type request should be sent
