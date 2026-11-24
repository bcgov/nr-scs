# Chain: UC-SST-004.md › -detailed.md › -slices.md › gherkin/UC-SST-004-S02..S06 › THIS FILE
#
# The new React form (components/Form/ScaleSiteForm.validateScaleSiteForm) enforces required /
# duplicate-type / timber-brand / coordinate rules CLIENT-side, so those never POST — each negative proves
# `no create-scale-site request should be sent` (endpoint spy === 0) in addition to the inline error.
# Owner-existence is SERVER-side only (ScaleSiteService.validateForSave), so the unknown-owner case (S06)
# is a real POST that the backend rejects with HTTP 422. Error text is asserted with the shared common
# step `I should see the error "…"`.
#
# NEW-APP vs LEGACY divergences (see defects.md): (1) the legacy "Coordinates cannot be negative" rule
# (ERR-009) is GONE — the new validator accepts negative degrees within +/- range (looks intentional;
# log-only). (2) The server-side BC-boundary check (ERR-011) IS implemented but is deferred here (needs an
# in-range-but-outside-BC coordinate) — a Coverage gap, not a divergence.
@sst @UC-SST-004
Feature: Create Scale Site — validation

  @S02 @p1
  Scenario: Required fields are enforced before any create request
    Given I am on the Scale Site create form
    When I submit the create form with all required fields blank
    Then I should see the error "Scale Site Name is required."
    And I should see the error "Owner client is required."
    And I should see the error "Owner loc is required."
    And I should see the error "Reg / Dist is required."
    And I should see the error "Description of Site Location is required."
    And I should see the error "Primary site type is required."
    And no create-scale-site request should be sent

  @S03 @p1
  Scenario: Duplicate site types are rejected before any create request
    Given I am on the Scale Site create form
    When I submit the create form with duplicate site types
    Then I should see the error "Site type codes must be distinct."
    And no create-scale-site request should be sent

  @S05 @p1
  Scenario: An invalid timber brand format is rejected before any create request
    Given I am on the Scale Site create form
    When I submit the create form with timber brand "12"
    Then I should see the error "Timber brand format must be 'LLLXXX' or 'LLLXXXX'."
    And no create-scale-site request should be sent

  @S04 @p1
  Scenario Outline: Invalid coordinates are rejected before any create request
    Given I am on the Scale Site create form
    When I submit the create form with "<coordinate>"
    Then I should see the error "<message>"
    And no create-scale-site request should be sent

    Examples:
      | coordinate                     | message                                                          |
      | latitude degrees only          | Latitude must include degrees, minutes, and seconds.             |
      | latitude degrees out of range  | Latitude degrees must be between -90 and 90.                     |
      | latitude minutes out of range  | Latitude minutes must be between 0 and 59.                       |
      | longitude degrees out of range | Longitude degrees must be between -180 and 180.                  |
      | latitude without longitude     | Latitude and longitude must both be provided or both be omitted. |

  @S06 @p1
  Scenario: An unknown owner client is rejected server-side and nothing is persisted
    Given I am on the Scale Site create form
    When I submit the create form with an unknown owner client
    Then the create request is rejected with "Owner client 99999999 / 00 does not exist."
    And I remain on the Scale Site create form
