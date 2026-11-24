# Re-grounded from UC-CHK-002-S01 (successfully update a non-legacy detail check scale).
# Source chain: UC-CHK-002.md › -detailed.md › -slices.md › gherkin/UC-CHK-002-S01.feature
#
# Legacy: .checkScaleView (P078) → Edit Record → .checkScaleUpdate (P077) → Save → view. New app: the
# edit screen /check-scales/edit/{id} loads the record (GET /check-scales/search), edits the six
# outcome fields, PUTs /api/check-scales/{id}, then navigates to /check-scales/view/{id}. This scenario
# creates its OWN record via the API (unused pair TALLYCHKE1/TALLYORGE1) so the shared editable fixture
# 905021 is never mutated; the created row is deleted at the DB on teardown.

@chk @UC-CHK-002
Feature: Update Detail Check Scale — Happy Path

  @S01 @p0
  Scenario: Check Scaler edits a detail check scale and saves the changes
    Given I have created a fresh detail check scale to edit
    When I edit all outcome fields with new valid values
    And I save the check scale edit
    Then I should be taken to the check scale view page
    And the saved detail check scale edit should match the new values
