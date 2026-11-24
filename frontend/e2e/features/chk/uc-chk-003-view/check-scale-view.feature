# Re-grounded from UC-CHK-003 S01 (view from scaler list) + S02 (view from scale-site list).
# Legacy: click a Check Scale # hyperlink in .scalerCheckScales (P012) / .scaleSiteCheckScales (P057)
# -> .checkScaleView (P078). New app: there is NO standalone list route — the list is the Check Scales
# TAB inside the Scaler View (/scalers/view/{lic}?tab=check-scales) and Scale Site View
# (/scale-sites/view/{site}?tab=check-scales); its Check Scale # cell is a router link to
# /check-scales/view/{id}. Read-only UC — nothing mutates.
#
# Real data (2026-07-15): unlike the old mock (one record 905001 in both a scaler tab and a site tab),
# no single real record sits in both a viewable scaler's tab and a loaded site's tab, so S01 and S02 open
# SEPARATE records:
#  - S01: scaler 7443's tab lists check scale 145988 (7443 = its primary original; 7444 = its check; both
#    scalers have a working view page). 145988 has 1 species row.
#  - S02: scale site 28E's tab lists check scale 145849 (11 species rows).
# The species assertion is record-agnostic (>=1 row) since the two records differ in count.
@chk @UC-CHK-003
Feature: View Detail Check Scale — view from the check-scale lists

  @S01 @p0
  Scenario: View a detail check scale from the scaler Check Scales list
    Given I am on scaler "7443"'s Check Scales tab
    When I open check scale "145988" from the list
    Then I should be on the check scale view page for "145988"
    And the listed check scale's header fields are displayed read-only
    And the Check Scale Summary table shows the Original, Check, Difference, and Variance % rows
    And the Species Product Grade Summary lists the check scale's species rows
    And the Back and Edit Record buttons are present

  @S02 @p1
  Scenario: View a detail check scale from the scale site Check Scales list
    Given I am on scale site "28E"'s Check Scales tab
    When I open check scale "145849" from the list
    Then I should be on the check scale view page for "145849"
    And the Check Scale Summary table shows the Original, Check, Difference, and Variance % rows
    And the Species Product Grade Summary lists the check scale's species rows
