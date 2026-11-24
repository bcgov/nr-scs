# Re-grounded from UC-CCQ-001 S01 (happy path), S05 (required-field/min-selection), S06 (format,
# cross-field date order, and the server-only Question-length rule). Source: UC-CCQ-001-slices.md /
# -technical.md (ERR-002..007). See coverage.md for the full source -> scenario reconciliation,
# including two confirmed spec gaps (the at-least-one/two checkbox rules and the Expiry->=Effective
# rule were both flagged "excluded pending live app confirmation" in -slices.md; both are now
# demonstrably enforced and covered here).
#
# Two negative directions:
#  - Client block (required fields, non-integer Sort Order, too-few multi-select options): the write
#    never leaves the browser -> assert ZERO create POSTs.
#  - Server rejection (Question text > 200 chars): re-grounded — unlike legacy, the new client has no
#    length check at all (no `maxLength`, no branch in `validateForm`), so the request IS sent and the
#    backend's `@Size(max=200)` + service-level check reject it. Assert the request WAS sent and no
#    record was persisted (banner-text assertion deferred — see comment on that scenario).

@ccq @UC-CCQ-001
Feature: Maintain Inspection Question — Create

  @S01 @p0
  Scenario: Administrator creates a new inspection question
    Given I am on the Questions list
    When I open the create form
    And I enter a valid inspection question
    And I save the question
    And the created question is registered for cleanup
    Then the question should be shown in the view
    And the saved question should match the submitted values

  @S05a @p1
  Scenario Outline: Save is blocked when "<field>" is missing — <case>
    Given I am on the Questions list
    And I open the create form
    And I enter a valid inspection question
    When I clear the question's "<field>" field
    And I save the question
    Then I should see the error "<message>"
    And no create-question request should be sent

    Examples:
      | case                     | field            | message                          |
      | Question blank           | Question         | Question is required.            |
      | Sort Order blank         | Sort Order       | Sort order is required.          |
      | Comment Required blank   | Comment Required | Comment required is required.    |
      | Effective Date blank     | Effective Date   | Effective date is required.      |
      | Expiry Date blank        | Expiry Date      | Expiry date is required.         |

  @S06a @p1
  Scenario: Save is blocked when Sort Order is not a valid integer
    Given I am on the Questions list
    And I open the create form
    And I enter a valid inspection question
    When I set the question's "Sort Order" field to "abc"
    And I save the question
    Then I should see the error "Sort order must be a whole number."
    And no create-question request should be sent

  # Resolves a documented spec gap: -slices.md's Gap Analysis excluded this pending "live app
  # confirmation" that the enforcement path exists. It does (client `validateForm` + server
  # `SCSUtils.requireDateOrder`). See coverage.md Spec gap #2.
  @S06-order @p1
  Scenario: Save is blocked when Expiry Date is before Effective Date
    Given I am on the Questions list
    And I open the create form
    And I enter a valid inspection question
    When I set the Effective Date to 10 days ago and the Expiry Date to 20 days ago
    And I save the question
    Then I should see the error "Expiry date must be on or after Effective date."
    And no create-question request should be sent

  # Resolves the other documented spec gap (at-least-one Inspection Type / Scaling Method, at-least-TWO
  # Valid Responses) — see coverage.md Spec gap #1. The new app requires two, not one, valid responses;
  # no legacy precedent confirmed a minimum for this group at all, so this is new coverage, not a
  # divergence.
  @S05b @p1
  Scenario Outline: Save is blocked when too few "<group>" options are selected — <case>
    Given I am on the Questions list
    And I open the create form
    And I enter a valid inspection question
    When I clear the "<group>" selection
    And <selectSomeOptions>
    And I save the question
    Then I should see the error "<message>"
    And no create-question request should be sent

    Examples:
      | case                         | group             | selectSomeOptions                                  | message                              |
      | zero Inspection Types        | Inspection Type   | I do nothing further                               | Select at least one inspection type. |
      | zero Scaling Methods         | Scaling Methods   | I do nothing further                               | Select at least one scaling method.  |
      | zero Valid Responses         | Valid Responses   | I do nothing further                               | Select at least two valid responses. |
      | only one Valid Response      | Valid Responses   | I select the "Yes" Valid Responses option          | Select at least two valid responses. |

  # The 200-char cap is now enforced on the CLIENT too (`Questions/validate.ts`, QUESTION_MAX_LENGTH), as legacy
  # did and the OpenAPI `maxLength: 200` implied — so Save is blocked with an inline error and no request is
  # sent. Re-grounded 2026-09-30 from the earlier "rejected by the server" form, written when the check was
  # server-only; the server's own `@Size(max=200)` is still there, just no longer reachable from this screen.
  @S06-len @p1
  Scenario: A Question text over 200 characters is blocked before it is sent
    Given I am on the Questions list
    And I open the create form
    And I enter a valid inspection question
    When I set the question's "Question" field to a 201-character string
    And I save the question
    Then I should see the error "Question cannot be greater than 200 characters."
    And no create-question request should be sent
