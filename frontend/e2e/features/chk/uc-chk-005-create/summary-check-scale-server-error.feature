# UC-CHK-005 S06: a persistence failure re-renders the form with an error; a retry after the condition
# clears succeeds. A real backend fault can't be forced deterministically, so the create endpoint is
# intercepted (fulfilled 500) — no DB is touched on the failing call. The retry lets the real call
# through, so it genuinely persists and is registered for cleanup.
@chk @UC-CHK-005
Feature: Create Summary Check Scale — server error on save

  @S06 @p1
  Scenario: S06 A server error on save shows the banner and keeps the form
    Given I am on the Summary Check Scale create form
    And the create endpoint always fails with a 500
    When I enter a valid Summary Check Scale header
    And I enter a valid SPG row
    And I save the record
    Then the error banner should be visible
    And I should remain on the create form

  @S06 @p2
  Scenario: S06 Retrying after the error succeeds and forwards to the update screen
    Given I am on the Summary Check Scale create form
    And the create endpoint fails once with a 500 then succeeds
    When I enter a valid Summary Check Scale header
    And I enter a valid SPG row
    And I save the record
    Then the error banner should be visible
    And I should remain on the create form
    When I save the record
    Then I should be forwarded to the update screen for the new record
    And exactly one Summary Check Scale should exist for the new record
