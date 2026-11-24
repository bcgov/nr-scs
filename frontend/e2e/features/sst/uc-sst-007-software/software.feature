# Re-grounded from UC-SST-007 (Maintain Scale Site Software Inventory). The new app's Software tab is
# READ-ONLY — the controller exposes only GET /scale-sites/{id}/software (no create/update/delete), so the
# legacy "maintain" is a display-only list here. Two observable states: a site WITH software (S01) and one
# with NONE (S02), driven against REAL sites read-only (no seed/cleanup, parallel-safe).
#
# Slices not covered here (see coverage.md): S03 (District-Scaling-Manager side-menu contents) and S04
# (Search button hidden without permission) are role/permission-gated -> blocked by single-role mock auth;
# S05 (legacy session-tombstone null) has no new-app equivalent -> not-applicable (the empty case is S02).
@sst @UC-SST-007
Feature: Scale Site Software Inventory

  @S01 @p0
  Scenario: View the software inventory for a site that has records
    Given I am on the Software tab of a scale site with software
    Then the software table lists the scale site software

  @S02 @p1
  Scenario: The software tab shows an empty state when the site has no software
    Given I am on the Software tab of a scale site with no software
    Then the software tab shows the empty state
