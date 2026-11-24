# FIXED 2026-08-04 (was UC-MSD-002 Divergence #1, formerly @discovered-divergence). ERR-011
# (at-least-one-scale-site when District Wide=No) was enforced on the CREATE screen
# (Create/MarkSiteDesignation/index.tsx validateMarkSiteSave) but NOT on the EDIT screen. The rule was
# ported to the edit screen's validateSave (Edit/MarkSiteDesignation/index.tsx) — the create/update
# symmetry break is closed, so this scenario now passes (the save is blocked client-side with the same
# message the create screen shows, and no PUT fires). NOTE: this is a client-side fix; the backend
# validateUpdateCommand still accepts districtWideInd=N + no sites (a crafted PUT would succeed) — see
# defects.md for the optional backend defence-in-depth follow-up. The seed record is registered for DB
# teardown in the Given (cleanup runs regardless of the body outcome).
@msd @UC-MSD-002
Feature: Update Mark Site Designation — Scale Site required when District Wide is No

  @S02 @ERR-011 @p1
  Scenario: Updating to District Wide No with no scale sites is blocked
    Given a mark site designation exists
    When I open it for editing
    And I set District Wide to "No"
    And I save my changes
    Then a scale-site-required error should block the save
