# Re-grounded from UC-SST-008 (Maintain Scale Site Assigned Scalers) — the Authorized Scalers tab on
# /scale-sites/view/{id}. In the new app it is READ-ONLY plus a CLIENT-SIDE status filter
# (All/Active/Cancelled/Expired); the assign/remove of authorizations lives in the SCA domain (the
# "Add Authorization" button just routes to /scaler-authorizations/create). Also covers UC-SST-005 S09
# (filter authorized scalers). Driven against a REAL site read-only (site 520, 8 "Expired" scalers) — no
# seed/cleanup, parallel-safe. The whole extract's scalers are "Expired", so filtering to the present
# status keeps rows and filtering to an absent status empties the list — which is what proves the filter.
#
# Slices not covered here (see coverage.md): S04 ("Add Authorization" hidden without permission) and S06
# (not-authorized page) are role-gated -> blocked by single-role mock auth; S05 (legacy list-param
# validator on a submitted form) has no new-app equivalent -> not-applicable (this tab GETs by route id).
@sst @UC-SST-008
Feature: Maintain Scale Site Assigned Scalers

  @S01 @p0
  Scenario: View the authorized scalers for a scale site
    Given I am on the Authorized Scalers tab of a scale site with scalers
    Then the authorized scalers table lists the scalers

  @S02 @p1
  Scenario: Filter the authorized scalers by a status that has matches
    Given I am on the Authorized Scalers tab of a scale site with scalers
    When I filter the authorized scalers by the present status
    Then only scalers with that status are listed

  @S03 @p1
  Scenario: Filtering by a status with no matches shows the empty state
    Given I am on the Authorized Scalers tab of a scale site with scalers
    When I filter the authorized scalers by a status with no matches
    Then no authorized scalers are listed
