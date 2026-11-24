# Re-grounded from UC-MSD-002 S04 (restricted edit mode when a letter has been issued). The new edit
# screen implements this: when letterExists=true, an info banner shows and every field except Expiry
# Date is disabled (Edit/MarkSiteDesignation/index.tsx `locked`). Asserted READ-ONLY against a real
# extract record that already has a letter (pinned as letterMarkSiteDesignationId in fixtures) — no
# save, so nothing is mutated and no cleanup is needed. Parallel-safe (read-only shared record).
@msd @UC-MSD-002
Feature: Update Mark Site Designation — Restricted Edit (letter issued)

  @S04 @STA-002 @p1
  Scenario: An MSD with an issued letter is restricted to editing the expiry date
    Given a mark site designation with an issued letter
    When I open it for editing
    Then only the expiry date is editable
