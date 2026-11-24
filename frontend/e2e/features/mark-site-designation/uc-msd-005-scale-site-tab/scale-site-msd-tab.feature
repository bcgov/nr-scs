# Re-grounded from UC-MSD-005 (Maintain Scale Site MSD Tab). New app: the Scale Site view has an "MSD" tab
# (route /scale-sites/view/{id}?tab=msd; pages/View/ScaleSite/components/tabs/MsdTab.tsx) backed by
# GET /api/scale-sites/{id}/mark-site-designations (view SCS_MSD_VW = site-specific district_wide='N'
# marks UNION district_wide='Y' marks expanded to every site in the org unit). It renders the
# "MSD - Timber Marks" heading, a table of timber-mark RouterLinks (-> /mark-site-designations?timberMark=),
# and an always-present "Add Mark Site Designation" button (-> /mark-site-designations/create); an empty
# site shows an EmptySection. This is a DISPLAY + NAVIGATION UC — no writes, so tests open discovered real
# sites READ-ONLY (parallel-safe; no seed/cleanup). Slice mapping:
#   S01 marks present / S02 empty grid / S03 mark-link nav / S04 Add-button entry -> covered below.
#   S05 (links/Add hidden without permission) -> NOT-APPLICABLE: the new app never role-gates the tab
#       (Add + links always render). S06 (not-authorized direct URL) -> BLOCKED by single-role mock auth.
# Data anchors (fixtures/msd/msd-test-data.ts): site 28E lists mark GE5412 (stable, non-pool); site 201's
# tab is empty (org_unit 1823 ≠ 1831, so unaffected by UC-MSD-001 S01's transient district-wide create).
@msd @UC-MSD-005
Feature: Maintain Scale Site MSD Tab

  @S01 @p1
  Scenario: The MSD tab lists a site's designated timber marks
    Given I open the MSD tab for a scale site with designated marks
    Then the MSD tab lists the designated timber mark
    And the Add Mark Site Designation button is shown

  @S02 @p2
  Scenario: A scale site with no designated marks shows the empty state
    Given I open the MSD tab for a scale site with no designated marks
    Then the MSD tab shows the empty state
    And the Add Mark Site Designation button is shown

  @S03 @p2
  Scenario: A timber mark link opens the mark site designation list for that mark
    Given I open the MSD tab for a scale site with designated marks
    When I click the designated timber mark
    Then I am taken to the mark site designation list for that timber mark

  @S04 @p1
  Scenario: The Add Mark Site Designation button enters the create flow
    Given I open the MSD tab for a scale site with designated marks
    When I click Add Mark Site Designation
    Then I am taken to the Create Mark Site Designation screen
