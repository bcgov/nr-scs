# Re-grounded from UC-MSD-001 S04 (required fields on Add Conditions) + S05 (date order), plus the
# -technical.md ERR catalog (ERR-001/003/004/005/008/010/019/020). In the new single-page app,
# "Add Conditions" runs client-side validation (validateMarkSiteBasics + integer checks —
# pages/Create/MarkSiteDesignation/index.tsx onAddConditions) and NEVER POSTs, so every case asserts
# the re-grounded message + that no create request was sent. Messages are the app's ACTUAL text (some
# differ from legacy wording, e.g. ERR-010 "District Wide? is required." → "District Wide is required.";
# ERR-008 → "Expiry Date must be on or after Effective Date."; ERR-019/020 → "…must be an integer.").
@msd @UC-MSD-001
Feature: Create Mark Site Designation — Basics Validation (Add Conditions)

  @S04 @p1
  Scenario Outline: Add Conditions blocks a missing or invalid "<field>"
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics except "<field>" is "<value>"
    And I click Add Conditions
    Then I should see the error "<message>"
    And I should remain on the mark site designation create form
    And no mark site designation should be created

    Examples:
      | field            | value | message                              |
      | Timber Mark      |       | Timber Mark is required.             |
      | Effective Date   |       | Effective Date is required.          |
      | Expiry Date      |       | Expiry Date is required.             |
      | Reg / Dist       |       | Reg / Dist is required.              |
      | District Wide?   |       | District Wide is required.           |
      | Est. Volume      | abc   | Est. Volume must be an integer.      |
      | Est. Truck Loads | abc   | Est. Truck Loads must be an integer. |

  # ERR-019..ERR-022 (catalogued on UC-MSD-002; the legacy HaulingMarkAuthorizationValidator ran
  # checkFieldLengths on create and update alike). The screens carried NO length rule, so an
  # over-length value produced only the generic "Please fix the errors below." banner, naming no field
  # and stating no limit — QA's ticket. Now each offending textarea is marked invalid with the legacy
  # `errors.maxlength` wording, at the "Add Conditions" gate (all four fields are in the first section).
  @S04 @ERR-019 @ERR-020 @ERR-021 @ERR-022 @p1
  Scenario Outline: Add Conditions blocks "<field>" past its character limit
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics
    And I enter <length> characters in the "<field>" field
    And I click Add Conditions
    Then I should see the error "<message>"
    And I should remain on the mark site designation create form
    And no mark site designation should be created

    Examples:
      | field                    | length | message                                                          |
      | Geographic Location      | 41     | Geographic Location can not be greater than 40 characters.       |
      | Timber Description       | 41     | Timber Description can not be greater than 40 characters.        |
      | Transportation Date Desc | 201    | Transportation Date Desc can not be greater than 200 characters. |
      | Other Requirements       | 4001   | Other Requirements can not be greater than 4000 characters.      |

  # The boundary the rule must NOT trip on: exactly at the limit passes the gate and the advanced
  # section opens. Still no POST — "Add Conditions" never writes.
  @S04 @ERR-019 @p2
  Scenario: Add Conditions accepts a Geographic Location at exactly its limit
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics
    And I enter 40 characters in the "Geographic Location" field
    And I click Add Conditions
    Then the advanced section is visible
    And no mark site designation should be created

  @S05 @p1 @ERR-008
  Scenario: Add Conditions blocks an expiry date before the effective date
    Given I am on the Mark Site Designation create form
    When I enter an expiry date before the effective date
    And I click Add Conditions
    Then I should see the error "Expiry Date must be on or after Effective Date."
    And I should remain on the mark site designation create form
    And no mark site designation should be created
