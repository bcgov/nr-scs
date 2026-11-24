# Re-grounded from UC-PRF-001 S06–S10. The new app enforces these client-side (validatePerformanceRemarkForm)
# with DIFFERENT message text than the legacy Struts validator in the Gherkin — see this UC's defects.md
# (spec-gap). The legacy "both Action and Outcome selected" case (S08) is structurally impossible now: Issue
# Type is a single Select, so only the "code missing" arm survives. The check-scale existence check is
# server-side (the client only enforces positive-integer format).
@prf @UC-PRF-001
Feature: Record Scaler Performance Remark — validation

  Background:
    Given I am on the Performance Remarks tab for the anchor scaler
    And I open the Add Performance Remark form

  @p1 @S06 @S07 @S08 @S09 @S10
  Scenario Outline: Client-side validation blocks the save — <case>
    When I enter a valid performance remark
    And I <mutation>
    And I click Save Record
    Then I should see the error "<message>"
    And I should remain on the performance remark form
    And no performance-remark create request should be sent

    Examples:
      | case                          | mutation                                             | message                                                             |
      | date blank (S06)              | clear the Date of Incident                           | Date of Incident is required.                                       |
      | date future (S06)             | enter a future Date of Incident                      | Date of Incident cannot be in the future.                           |
      | description blank (S07)       | clear the Description                                | Description is required.                                            |
      | action code missing (S08)     | select Issue Type "Action" but leave the code blank  | Action is required.                                                 |
      | outcome code missing (S08)    | select Issue Type "Outcome" but leave the code blank | Outcome is required.                                                |
      | suspension order (S09)        | enter a reversed suspension period                   | Suspension start date must be on or before the suspension end date. |
      | check scale non-numeric (S10) | enter a non-numeric Associated Check Scale #         | Associated Check Scale # must be a positive number.                 |

  # S10 server arm: a well-formed but non-existent check-scale id passes client validation, so the write
  # leaves the browser and the backend rejects it (400) — the message is mapped back inline.
  @p1 @S10
  Scenario: Server rejects a non-existent Associated Check Scale #
    When I enter a valid performance remark
    And I link a non-existent check scale
    And I click Save Record
    Then I should see the error "A check scale could not be found for 1146996."
    And I should remain on the performance remark form
    And the create request should be rejected with nothing persisted
