# Chain: UC-SSC-001.md › -detailed.md › -slices.md › gherkin/UC-SSC-001-S01/S06/S08 › THIS FILE
#
# Re-grounded from UC-SSC-001 S01 (create happy), S06 (required-field missing) and S08 (clause > 200
# chars). Save forwards to the read-only view. The record key is composite (scale method + server-
# generated clause #), so the created id is read from the view for read-back + cleanup. Client-block
# negatives assert ZERO create POSTs.
#
# Re-grounding notes:
#  - S07 (invalid date format) is NOT reproducible: the date fields are a Carbon date picker (no free
#    text) and neither the client `validate()` nor the backend has a format branch (dates are ISO
#    LocalDate). Logged in coverage.md / defects.md (Spec gap #1), not covered here.
#  - S08 (clause > 200 chars): blocked client-side against the VARCHAR2(200) column limit with a clean
#    field-level message; no request is sent (fixed 2026-07-24, formerly Divergence #1 — now CLOSED).
#  - Expiry-before-effective is a NEW-app rule not enumerated in the legacy slices; covered as @p1.

@ssc @UC-SSC-001
Feature: Maintain Authorization Clauses — Create

  @S01 @p0
  Scenario: Administrator creates a new authorization clause
    Given I am on the Authorization Clauses list
    When I open the authorization clause create form
    And I enter a valid authorization clause
    And I save the authorization clause
    And the created authorization clause is registered for cleanup
    Then the authorization clause should be shown in the view
    And the saved authorization clause should match the submitted values

  @S06 @p1
  Scenario Outline: Save is blocked when "<field>" is missing — <case>
    Given I am on the Authorization Clauses list
    And I open the authorization clause create form
    And I enter a valid authorization clause
    When I clear the authorization clause "<field>" field
    And I save the authorization clause
    Then I should see the error "<message>"
    And no create-authorization-clause request should be sent

    Examples:
      | case                 | field          | message                    |
      | Scale Method blank   | Scale Method   | Scale method is required.  |
      | Clause blank         | Clause         | Clause is required.        |
      | Effective Date blank | Effective Date | Effective Date is required. |

  @p1
  Scenario: Save is blocked when Effective Date is after Expiry Date
    Given I am on the Authorization Clauses list
    And I open the authorization clause create form
    And I enter a valid authorization clause
    When I set the authorization clause Effective Date after its Expiry Date
    And I save the authorization clause
    Then I should see the error "Expiry Date must be on or after Effective Date."
    And no create-authorization-clause request should be sent

  # A clause longer than the VARCHAR2(200) column limit is now blocked client-side with a clean
  # field-level message — no request is sent (fixed 2026-07-24; formerly the @discovered-divergence,
  # defects.md Divergence #1 → CLOSED).
  @S08 @p1
  Scenario: Over-length clause is blocked with a clean max-length message
    Given I am on the Authorization Clauses list
    And I open the authorization clause create form
    When I enter an authorization clause of 201 characters
    And I save the authorization clause
    Then I should see the error "Clause can not be greater than 200 characters."
    And no create-authorization-clause request should be sent
