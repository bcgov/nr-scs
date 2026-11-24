# Slice: UC-CHK-006-S02 (add SPG row), UC-CHK-006-S03 (delete SPG row + STA-004 last-row disabled)
# Re-grounded onto the new app:
#  - add row -> POST /api/summary-check-scales/{id}/spg-rows; delete row -> DELETE .../spg-rows
#  - STA-004 (cannot delete the last row) is the SpeciesProductGradeSummary canDelete=rows>1 rule
#  - second row is species AL / product CH, a DB-verified SFP xref combo distinct from AL/CA
@chk @UC-CHK-006
Feature: Update Summary Check Scale — Species Product Grade Rows

  @S02 @p1
  Scenario: Check Scaler adds a new SPG row
    Given I am editing an existing summary check scale
    When I enter a valid new SPG row
    And I add the SPG row
    Then the summary check scale should have 2 SPG rows
    And the SPG summary should include species "AL" product "CH"

  # Was a @discovered-bug: PR #265's query-param trimming turned the blanked (single-space) grade into
  # null before the handler ran, so `DELETE /api/summary-check-scales/{id}/spg-rows` answered 500 for
  # EVERY input and the row survived. FIXED by moving the composite key into the request body, and
  # verified green against the redeployed app on 2026-09-03 (3/3). Kept as the regression guard for that
  # fix; defects.md Bug #1 CLOSED.
  @S03 @p1
  Scenario: Check Scaler deletes an SPG row when two or more exist
    Given I am editing a summary check scale that has two SPG rows
    Then the SPG row delete actions should be enabled
    When I delete the first SPG row
    Then the summary check scale should have 1 SPG rows

  @S03 @p2
  Scenario: The last remaining SPG row cannot be deleted (STA-004)
    Given I am editing an existing summary check scale
    Then each SPG row delete action should be disabled
