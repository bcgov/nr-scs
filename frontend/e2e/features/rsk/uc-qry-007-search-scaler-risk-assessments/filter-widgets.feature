# UC-QRY-007 S01, filter-WIDGET arms (Scaler subject). search.feature covers the text/Select filters; the
# two remaining S01 filters reach the search params through richer WIDGETS whose selection→param wiring the
# plain filters can't exercise:
#   • Reg / Dist  → DistrictSelect (#orgUnitNo): the chosen LOV code is coerced with Number() and sent as
#     `orgUnitNo` (index.tsx:293);
#   • Scaler (Client / Loc) → ClientLocSearch (#clientNumber): the typed client number is sent as
#     `clientNumber` (index.tsx:294) — the "/ Loc" box is a dead input (defects.md Bug #1), so only the
#     Client # half is driven here.
# These were previously logged "covered (symmetry)" / deferred (coverage.md gap #7) on the argument that the
# param path is shared with the covered arms — true for the params object, but NOT proof the widget commits
# its selection. Each scenario here drives the real widget and asserts the resulting rows, closing that gap.
# The picker-MODAL writeback path (open modal → pick a client) stays deferred (gap #7). Values pinned in
# fixtures/rsk/scaler-risk-assessment-test-data.ts (districtFilter / clientFilter), drift-guarded in preflight.
@rsk @UC-QRY-007
Feature: Search Scaler Risk Assessments — filter widgets

  # DistrictSelect: choosing "RKB - Selkirk Natural Resource District" (LOV code 1902) sends orgUnitNo=1902,
  # resolving the 9 Selkirk assessments — which include the anchor 723 (its results-cell orgUnitName drops
  # the "RKB - " region prefix the LOV label carries).
  @S01 @p2
  Scenario: Filtering by Reg / Dist through the DistrictSelect widget
    Given I am on the Scaler Risk Assessment Search page
    When I filter scaler risk assessments by Reg/Dist "RKB - Selkirk Natural Resource District"
    Then the scaler risk assessment results should list assessment "723"
    And the scaler risk assessment results should show 9 records

  # ClientLocSearch (Client # box): typing 00047212 (zero-padded) sends clientNumber=00047212, resolving the
  # 5-row set for that scaler (the same scaler as licence 9710), which includes the anchor 723.
  @S01 @p2
  Scenario: Filtering by Scaler Client # through the ClientLocSearch widget
    Given I am on the Scaler Risk Assessment Search page
    When I filter scaler risk assessments by Scaler Client # "00047212"
    Then the scaler risk assessment results should list assessment "723"
    And the scaler risk assessment results should show 5 records
