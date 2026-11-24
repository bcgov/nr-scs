# Spec: the roles & permissions matrix §3 column `CHK` (+ §4's summary)
#       › permissions.ts CHECK_SCALER_PERMISSIONS › navigation.ts + per-page hasPermission › THIS FILE
#
# LEVEL 1 of 3 — GUI. What the application OFFERS this role: side-navigation entries, record tabs, and
# in-page write controls. This level asserts the permission mirror in `permissions.ts` is doing its job —
# turning a call the API would refuse into a control that was never rendered. It is a USABILITY
# guarantee, not a security one; url-access.feature and api-access.feature are what prove containment.
#
# WHAT IS NEW AT THIS LEVEL FOR THIS ROLE. `CHK` is the first enabled column with write permissions, so
# the GUI assertions come in two directions instead of one. The two suites before it could assert "no
# write control anywhere"; here each control must be checked against its own matrix cell, because the role
# legitimately writes four record types and legitimately cannot touch four others. A blanket assertion
# either way would be wrong.
#
# It is also the first INTERNAL column, which is why all four top-level menus render — for `IND` and
# `OWN`, Reports, Create and Administration disappear entirely.
#
# Visibility, not presence, is asserted throughout: Carbon mounts modal contents (Save Record, Confirm
# Delete) into the DOM while hidden, so a `toBeAttached`-style check reports write controls this role is
# correctly never shown. See the industry-scaler defects.md V1.
@sec @SEC-10 @CHK
Feature: Check Scaler — GUI access

  Background:
    Given I am signed in as a check scaler

  # ---------------------------------------------------------------------------------------------
  # Navigation. Grouped by menu so a reviewer can check each against §3 without reading a step.

  @p0
  Scenario: Every top-level menu renders for an internal role
    When I open the side navigation as a check scaler
    Then every top-level menu should be offered

  @p0
  Scenario: The Queries menu offers every screen the column reads, both risk screens included
    When I open the side navigation as a check scaler
    Then the Queries menu should offer exactly the check scaler screens

  @p0
  Scenario: The Create menu offers only the records the role may record
    When I open the side navigation as a check scaler
    Then the Create menu should offer only what the role records

  @p1
  Scenario: The Reports menu offers every report screen
    When I open the side navigation as a check scaler
    Then the Reports menu should offer every report screen

  # The Maintenance sub-group is a nested nav GROUP, and filterNavigation drops a group whose children
  # are all filtered out. Every §J row is "-" for CHK, so the assertion is that the group vanishes.
  @p0
  Scenario: The Administration menu offers the Work Bench but no Maintenance sub-group
    When I open the side navigation as a check scaler
    Then the Administration menu should offer the Work Bench but no maintenance

  # Contrast: proves the Maintenance group exists to be hidden.
  @p1
  Scenario: An administrator is offered the Maintenance sub-group
    Given I am signed in as a system administrator
    When I open the side navigation as a check scaler
    Then the Administration menu should offer maintenance

  # ---------------------------------------------------------------------------------------------
  # Record tabs. The role reads EVERY tab on both records — Risk Rating included since `dbf826c`, which
  # replaced the literal reading of §3.D's lone "Risk Rating Criteria" row with "risk assessment follows
  # the record it hangs off". No tab is withheld from this column any more, so there is nothing here left
  # to pair with an administrator.

  @p0
  Scenario: The scaler record offers every tab the column reads, Risk Rating included
    When I open the scaler record
    Then the scaler record should offer every tab the column reads

  @p0
  Scenario: The scale site record offers every tab the column reads, Risk Rating included
    When I open the scale site record
    Then the scale site record should offer every tab the column reads

  # ---------------------------------------------------------------------------------------------
  # In-page write controls — the half of this level that only exists because the role writes.
  #
  # Both directions are checked across every tab in one scenario each, and the verdicts are collected so
  # a failure names EVERY leak rather than dying on the first. With nine withheld controls spread over six
  # tabs, failing one at a time would make a permission regression take six runs to understand.

  @p0
  Scenario: Every write control the column grants is offered
    When I open each tab that carries a write control
    Then every control the column grants should be offered

  # The nine controls here are each "-" in the CHK column. "Save Record" on Performance Remarks is the
  # one worth reading twice: it is the licence suspend/cancel control, gated on SCALER_LICENCE_CANCEL,
  # which §4 gives to the district and regional managers. So this role adds a performance remark to a
  # scaler and still cannot act on that scaler's licence — the boundary RolePermissions.checkScaler()
  # calls out, and the reason that permission was carved out of SCALER_UPDATE.
  @p0
  Scenario: No write control the column withholds is offered
    When I open each tab that carries a withheld write control
    Then no control the column withholds should be offered

  # THE PAIRING. Without this, every assertion in the scenario above would also pass against a renamed
  # button, a tab that failed to load, or a backend that was down.
  @p0
  Scenario: An administrator is offered every control the check scaler is denied
    Given I am signed in as a system administrator
    When I open each tab that carries a withheld write control
    Then an administrator should be offered all of them
