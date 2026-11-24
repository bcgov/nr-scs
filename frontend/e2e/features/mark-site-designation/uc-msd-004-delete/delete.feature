# Re-grounded from UC-MSD-004 (Delete Mark Site Designation). CRITICAL re-grounding: the NEW app has no
# hard delete. The MSD View screen's "Delete" button pops a window.confirm and, on accept, calls
# POST /api/mark-site-designations/{id}/workbench/remove (repository.setExpiryNotificationInd(id,'Y'))
# then navigates to /welcome — a SOFT workbench-remove, NOT the legacy hard cascade-delete, and with NO
# letter/scale-site/role gating (View/MarkSiteDesignation/index.tsx:195-214; MarkSiteDesignationService
# .removeMarkSiteDesignationFromWorkbench). So the legacy slices re-ground as:
#   - S01 (happy path)  -> re-grounded here: confirm -> workbench-remove POST -> /welcome; record PERSISTS.
#   - S02 (cancel)      -> here: dismiss the confirm -> no workbench-remove POST -> stay on the view.
#   - S03 scale-site advisory / S04 letter advisory / S05 server letter-guard -> NO new-app equivalent
#       (Delete is unconditional) -> defects.md Divergence #1 (suspected-intentional; log-only).
#   - S06 not authorized -> endpoint is @IsScsEditor; button is not role-gated; single-role mock auth
#       can't reach the denied branch -> defects.md Coverage gap #1 (blocked).
# The confirm text is IDENTICAL to legacy CNF-001 ("Are you sure you want to delete this record?").
# S01 seeds its own letterless, no-scale-site MSD via the API (self-cleaning at the DB); S02 opens a real
# record read-only (no mutation on cancel).
@msd @UC-MSD-004
Feature: Delete Mark Site Designation

  # S01 re-grounded: the app's real "Delete" is a soft workbench-remove that returns to the welcome page.
  # The record still existing afterward documents the soft-remove (Divergence #1), not a hard delete.
  @S01 @p1 @CNF-001
  Scenario: Confirming Delete performs a workbench-remove and returns to the welcome page
    Given a mark site designation exists
    When I open the seeded mark site designation in the view screen
    And I confirm the delete
    Then the delete confirmation asked "Are you sure you want to delete this record?"
    And I land on the welcome page
    And a workbench-remove request was sent
    And the mark site designation still exists

  # S02: cancelling the confirm dialog sends nothing and leaves the user on the MSD view (record untouched).
  @S02 @p2 @CNF-001
  Scenario: Cancelling the Delete confirmation sends no request
    Given I open the Mark Site Designation view for the rich sample record
    When I cancel the delete
    Then the delete confirmation asked "Are you sure you want to delete this record?"
    And no workbench-remove request is sent
    And I remain on the Mark Site Designation view
