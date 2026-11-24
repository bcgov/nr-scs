# UC-QRY-007 S02, filter-WIDGET arms (Scale Site subject). search.feature covers the text/Select filters;
# the three remaining S02 filters reach the search params through richer WIDGETS whose selection→param
# wiring the plain filters can't exercise:
#   • Reg / Dist                → DistrictSelect (#orgUnitNo): chosen LOV code → Number() → `orgUnitNo`;
#   • Site Owner (Client / Loc) → ClientLocSearch (#ownerClientNumber): typed number → `ownerClientNumber`;
#   • Site Type                 → ActiveMultiSelect (#method-types): selected items → `methodTypes` (codes).
# These were deferred (coverage.md gap #6) as "symmetric with the covered arms" — true for the params
# object, but not proof the widget commits its selection. Site Type is the ONLY filter on either risk page
# with no plain-Select twin, so the multiselect arm is the sole proof of that param. The picker-MODAL
# writeback path stays deferred (gap #6). Values pinned in
# fixtures/rsk/scale-site-risk-assessment-test-data.ts (districtFilter / ownerClientFilter / siteTypeFilter),
# drift-guarded in preflight.
@rsk @UC-QRY-007
Feature: Search Scale Site Risk Assessments — filter widgets

  # DistrictSelect: "RWC - South Island Natural Resource District" (code 1619) sends orgUnitNo=1619,
  # resolving the 3 South Island assessments — a distinct-district subset (so, unlike Level=High, NOT exposed
  # to the parallel create-seed on site 520, which is a different district) — including anchor 1861.
  @S02 @p2
  Scenario: Filtering by Reg / Dist through the DistrictSelect widget
    Given I am on the Scale Site Risk Assessment Search page
    When I filter scale site risk assessments by Reg/Dist "RWC - South Island Natural Resource District"
    Then the scale site risk assessment results should list assessment "1861"
    And the scale site risk assessment results should show 3 records

  # ClientLocSearch (Client # box): typing 00055821 (zero-padded) sends ownerClientNumber=00055821,
  # resolving the single site-614 assessment 1822 owned by that client.
  @S02 @p2
  Scenario: Filtering by Site Owner Client # through the ClientLocSearch widget
    Given I am on the Scale Site Risk Assessment Search page
    When I filter scale site risk assessments by Site Owner Client # "00055821"
    Then the scale site risk assessment results should list assessment "1822"
    And the scale site risk assessment results should show 1 records

  # ActiveMultiSelect: selecting "Piece Scale" sends methodTypes=[P]. Only assessment 1861 (site 16G, SHOAL
  # ISLANDS) carries this scale-method type among the 9 extracted rows, so it resolves to that row. The count
  # is asserted as "at least 1" (+ lists 1861), NOT exactly 1: site 520 — the RSK-007 create site that runs
  # against the same shared DB in the same `npm test` — is itself a Piece Scale site, and the scale-site risk
  # SEARCH view returns freshly-created rows (defects.md "Parallel create-seed hazard"), so a create in-flight
  # on another worker transiently adds a second methodTypes=P row. Same treatment as the Level=High arm in
  # search.feature. The exact base count (1) is still pinned by preflight/anchors.setup.ts on a quiescent DB.
  # Because "at least 1" gives up the "exactly 1" signal, the arm also asserts a known non-P row is ABSENT:
  # 1822 (client 00055821, site 614) is among the 9 unfiltered rows but is NOT a Piece Scale site, so its
  # absence proves the methodTypes=[P] filter actually applied — the discrimination a dropped multiselect
  # selection (search silently unfiltered, 1861 still present) would otherwise slip past.
  @S02 @p2
  Scenario: Filtering by Site Type through the ActiveMultiSelect widget
    Given I am on the Scale Site Risk Assessment Search page
    When I filter scale site risk assessments by Site Type "Piece Scale"
    Then the scale site risk assessment results should list assessment "1861"
    And the scale site risk assessment results should not list assessment "1822"
    And the scale site risk assessment results should show at least 1 records
