# Spec: the roles & permissions matrix §3 column `DM` + §4's "Suspend scaler
#       licence / recommend cancellations" › RolePermissions.districtManager() › permissions.ts › THIS FILE
#
# LEVEL 1 of 3 — GUI. What the application OFFERS.
#
# ── THIS IS A DELTA SUITE ──────────────────────────────────────────────────────────────────────────
# `DM` is `readOnlyInternalColumn()` ∪ `{SCALER_LICENCE_CANCEL}` — thirty reads plus exactly one write.
# The read half is already proven by `../read-only-internal-roles/`, which asserts the same thirty
# permissions across three roles. Re-running all of it here would buy nothing, so this suite asserts:
#
#   1. the ONE cell that differs, in the direction that column asserts it withheld, and
#   2. that the delta is invisible everywhere else — same menus, same tabs, no other control.
#
# (2) is the assertion worth having. `SCALER_LICENCE_CANCEL` gates a CONTROL and no route or menu entry,
# so a nav or tab difference here would mean the permission is leaking into surface it should not touch.
#
# ── THE COMBINATION IS NEW ─────────────────────────────────────────────────────────────────────────
# `Save Record` on the Performance Remarks tab is the licence suspend/cancel form, NOT a scaler edit. So
# this column is the first to hold *cancel without remark writes*: the administrator has both, the Check
# Scaler has the remark writes and not the cancel, the read-only columns have neither. The two controls
# live on the same tab, which is what makes the pair a single sharp assertion.
@sec @SEC-10 @DM @dist-manager
Feature: District Manager — GUI access

  Background:
    Given I am signed in as the "SCS_DIST_MANAGER" role

  # ---------------------------------------------------------------------------------------------
  # (2) The delta is invisible in navigation. Identical to the read-only column.

  @p0
  Scenario: The navigation is exactly the read-only column's — the licence-cancel cell adds nothing
    When I open the side navigation as that role
    Then the "SCS_DIST_MANAGER" column should be offered exactly its own menus
    And the "SCS_DIST_MANAGER" column should be offered exactly its own menu leaves

  @p0
  Scenario: Administration still collapses to the Work Bench
    When I open the side navigation as that role
    Then the "SCS_DIST_MANAGER" column should be offered exactly its own sub-groups

  # ---------------------------------------------------------------------------------------------
  # (2) The delta is invisible in the record tabs — including Risk Rating, which this column READS.
  # Its risk permissions are the query/read verbs only (the create/update half stays withheld, and
  # the read-only suite asserts the assessment create routes refused). Identical to that column, so
  # the licence-cancel cell changes nothing here either.

  @p1
  Scenario: The scaler record offers the read-only column's tabs, Risk Rating included
    When I browse directly to "/scalers/view/001B"
    Then the scaler record should offer the "SCS_DIST_MANAGER" column its tabs
    And the "SCS_DIST_MANAGER" column should see the Risk Rating tab as its column allows

  @p1
  Scenario: The scale site record offers the read-only column's tabs, Risk Rating included
    When I browse directly to "/scale-sites/view/520"
    Then the scale site record should offer the "SCS_DIST_MANAGER" column its tabs
    And the "SCS_DIST_MANAGER" column should see the Risk Rating tab as its column allows

  # ---------------------------------------------------------------------------------------------
  # (1) THE DELTA ITSELF, and the whole reason this suite exists.
  #
  # One sweep across both records asserts both halves at once: `Save Record` on Performance Remarks IS
  # offered, and all thirteen other write controls — including `Add Performance Remark` on the very same
  # tab — are not. The read-only suite asserts `Save Record` HIDDEN for its three roles, so the two
  # suites pin opposite sides of one control.

  @p0
  Scenario: The licence-cancel control is offered and no other write control is
    When I sweep every write control as the "SCS_DIST_MANAGER" role
    Then every control the "SCS_DIST_MANAGER" column grants should be offered
    And no control the "SCS_DIST_MANAGER" column withholds should be offered

  # THE PAIRING. Every control the sweep looked for renders for a role that holds it, so a clean sweep is
  # a permission decision rather than a record page that failed to load its tabs.
  @p0
  Scenario: An administrator is offered every control this column withholds
    Given I am signed in as a system administrator
    When I sweep every write control as the "SCS_DIST_MANAGER" role
    Then an administrator should be offered every control swept
