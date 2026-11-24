# Re-grounded from UC-CHK-001-S01 (Complete Create — Happy Path, Log Tally).
# Source chain: UC-CHK-001.md › -detailed.md › -slices.md › gherkin/UC-CHK-001-S01.feature
#
# Legacy: a two-PAGE flow (P075 DDN/DDV → P076 outcome fields → P078 view). New app: a two-STEP
# single page at /check-scales/create — "Next" POSTs /api/check-scales/validate to resolve the DDN/DDV
# pair against HBS, "Save Record" POSTs /api/check-scales/create, then navigates to /check-scales/view/{id}.
# DDN/DDV values are pinned HBS log-tally docs seeded by 10-chk-check-scales.sql (F-CHECK-CREATE).

@chk @UC-CHK-001
Feature: Create Detail Check Scale — Complete Create (Happy Path)

  @S01 @p0
  Scenario: Check Scaler creates a detail check scale end-to-end and views the saved record
    Given I am on the Check Scale create form
    When I complete step 1 with a valid check and original scale
    And I enter valid Check Scale outcome fields
    And I save the check scale
    Then I should be taken to the new check scale view page
    And the saved detail check scale should match the submitted values
