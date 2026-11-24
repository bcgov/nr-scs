# Re-grounded from UC-SCA-001 S02 (header field-required errors) plus the create screen's business rules
# (≥1 Job Function, ≥1 Scale Site when District Wide=No, SFP required when the "Special Forest Product" job
# function is selected). Two client-side validators run: "Add Conditions" runs validateBasics (required
# header fields + date order); "Save Record" runs the full validate (adds the job-function / scale-site /
# SFP rules). Each case asserts the re-grounded message AND proves no create request was sent
# (scalerAuthCreateCalls === 0). Messages are the app's ACTUAL text (some differ from legacy wording, e.g.
# ERR-006/007 date-format checks are gone — the API takes typed dates — and "Licence # is required" has no
# trailing period). Legacy yyyyMMdd format errors + max-years + site-within-district have NO new-app
# enforcement (see coverage.md); the site add-by-number NOT-FOUND half of legacy ERR-012 does exist
# (onAddScaleSite searches the site and reports "Scale site N was not found.") and is covered below.
@sca @UC-SCA-001
Feature: Create Scaler Authorization — Validation

  @S02 @p1
  Scenario Outline: Add Conditions blocks a missing "<field>"
    Given I am on the Scaler Authorization create form
    When I fill valid scaler auth basics except "<field>" is "<value>"
    And I click Add Conditions
    Then I should see the error "<message>"
    And I should remain on the scaler authorization create form
    And no scaler authorization should be created

    Examples:
      | field          | value | message                     |
      | Licence #      |       | Licence # is required       |
      | Effective Date |       | Effective Date is required. |
      | Expiry Date    |       | Expiry Date is required.    |
      | Reg / Dist     |       | Reg / Dist is required.     |
      | District Wide? |       | District Wide is required.  |

  @S02 @p1
  Scenario: Add Conditions blocks an expiry date on or before the effective date
    Given I am on the Scaler Authorization create form
    When I enter a scaler auth expiry date before the effective date
    And I click Add Conditions
    Then I should see the error "Expiry Date must be after Effective Date."
    And I should remain on the scaler authorization create form
    And no scaler authorization should be created

  @S07 @p1
  Scenario: District Wide Yes hides the Scale Sites section
    Given I am on the Scaler Authorization create form
    When I fill valid scaler auth basics with District Wide "Yes"
    And I click Add Conditions
    Then the Scale Sites section is hidden

  @S01 @p1
  Scenario: Save is blocked when no Job Function is selected
    Given I am on the Scaler Authorization create form
    When I fill valid scaler auth basics with District Wide "Yes"
    And I click Add Conditions
    And I click Save Record
    Then I should see the error "At least one Job Function is required."
    And I should remain on the scaler authorization create form
    And no scaler authorization should be created

  @S01 @p1
  Scenario: Save is blocked when District Wide is No and no scale site is added
    Given I am on the Scaler Authorization create form
    When I fill valid scaler auth basics with District Wide "No"
    And I click Add Conditions
    And I select job function "Piece Scale"
    And I click Save Record
    Then I should see the error "At least one Scale Site is required when District Wide is No."
    And no scaler authorization should be created

  @S03 @p1
  Scenario: Adding a scale site that does not exist is rejected
    Given I am on the Scaler Authorization create form
    When I fill valid scaler auth basics with District Wide "No"
    And I click Add Conditions
    And I add a scale site that does not exist
    Then I should see the error "Scale site 99999999 was not found."
    And no scaler authorization should be created

  @S01 @p1
  Scenario: Selecting the Special Forest Product job function requires at least one SFP
    Given I am on the Scaler Authorization create form
    When I fill valid scaler auth basics with District Wide "Yes"
    And I click Add Conditions
    And I select job function "Special Forest Product"
    And I click Save Record
    Then I should see the error "At least one Special Forest Product is required when Special Forest Product is selected."
    And no scaler authorization should be created
