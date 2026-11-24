# Re-grounded from UC-CHK-002 S02 (reset), S03 (cancel/back), S04 (legacy Edit disabled),
# S07 (record not found), S08 (not authorized). These scenarios never persist (or open a legacy/missing
# record), so they open the shared fixtures read-only.
#
# Re-grounding note (S02): legacy Reset CLEARED the fields; the new app's Reset REVERTS them to the
# saved values (onReset reloads the loaded record). The re-grounded scenario asserts the revert.

@chk @UC-CHK-002
Feature: Update Detail Check Scale — Navigation & Access

  @S02 @p1
  Scenario: Reset reverts unsaved edits to the saved values
    Given I am editing the seeded detail check scale
    When I set the edit field "Check Scaler Comment" to "RESET SENTINEL - should be discarded"
    And I reset the edit form
    Then the "Check Scaler Comment" field should show "e2e detail edit baseline"
    And no check scale should be updated

  @S03 @p1
  Scenario: Back cancels the edit and returns to the view without saving
    Given I am editing the seeded detail check scale
    When I set the edit field "Check Scaler Comment" to "unsaved change - should not persist"
    And I cancel the edit
    Then I should be taken to the check scale view page
    And no check scale should be updated

  @S04 @p1
  Scenario: Edit Record is disabled for a legacy check scale (STA-001)
    Given I am viewing the legacy check scale
    Then the Edit Record button should be disabled

  # The other half of S04: the button is disabled, but is legacy read-only a RULE? No — and legacy was the
  # same. `viewCheckScale.jsp:20,303,325` disabled Edit/Delete on `isLegacy`, and NO legacy Java ever
  # checked `ckscType` before a write (every `getCkscType()` comparison in the legacy tree is a display
  # label, a length/blank check, or a summary-only branch). So the server accepting this write is legacy
  # PARITY, not a defect — this scenario pins that contract instead of asserting a rule that never existed.
  # Echoes the record's own stored values back, so nothing but the audit columns can move, and runs against
  # a DISPOSABLE legacy record because the write does go through. The open question this raises — whether
  # the new app should be STRICTER than legacy now that PUT/DELETE are addressable REST operations rather
  # than a JSP button — is recorded in defects.md ("Verified — not a defect" + the hardening question).
  @S04 @p1
  Scenario: The API accepts an update to a legacy check scale (legacy parity)
    Given I have created a fresh legacy check scale
    When I submit an unchanged update for that legacy check scale through the API
    Then the API should accept the write, matching legacy
    And that legacy check scale should still exist

  # Was a @discovered-divergence (the edit page hung on a perpetual loading skeleton, ERR-007 unreachable).
  # FIXED in the app — Edit/CheckScale/index.tsx:177 now short-circuits to the error state when the query
  # fails or returns nothing. Kept as the regression guard for that fix; defects.md Divergence #1 CLOSED.
  @S07 @p2 @ERR-007
  Scenario: Opening the edit form for a missing record shows a not-found error
    Given I open the edit form for a non-existent check scale
    Then the check scale not-found error should be shown
