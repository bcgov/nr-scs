# Spec: roles-permissions.md §3 column `CET` + §4 › RolePermissions.ceTechnician()
#       › permissions.ts › navigation.ts › THIS FILE
#
# LEVEL 1 of 3 — GUI. What the application OFFERS.
#
# ── THE MOST DISTINCTIVE NAVIGATION IN THE MATRIX ──────────────────────────────────────────────────
# Read `CET` as a delta from the READ-ONLY INTERNAL column, which is what it became on 2026-09-02 when
# the client's spec withdrew its writes — "No where in the app should they be able to edit, delete or
# create something". Two absences and one presence:
#
#   * NO WORK BENCH. §A is `-` here where the read-only internal columns have `R (ltd)`. Still the only
#     INTERNAL column with no Work Bench at all.
#   * NO CREATE MENU. It held two of seven leaves — Check Scale and Summary Check Scale — and both went
#     with `CHECK_SCALE_CREATE`. The group is dropped for having no visible child, which is the same
#     mechanism that drops Maintenance for every other non-administrator; no special case either way.
#   * BUT Administration still renders, because §J's "Maintain Questions" is `R` for this column — the
#     ONLY §J cell granted to any non-administrator. So Administration appears carrying Maintenance
#     alone, and Maintenance carries exactly one leaf.
#
# That last combination is still the exact inverse of the read-only internal column, which has the Work
# Bench and no Maintenance. Two columns, opposite halves of the same menu.
#
# Visibility, never presence — Carbon mounts modal contents into the DOM while hidden.
@sec @SEC-10 @CET @ce-technician
Feature: C&E Technician — GUI access

  Background:
    Given I am signed in as the "SCS_CE_TECHNICIAN" role

  # ---------------------------------------------------------------------------------------------
  # Navigation. Three of the four top-level groups render — the interesting claims are mostly at leaf
  # level, which is why the leaf assertion is exhaustive rather than sampled.

  @p0
  Scenario: Three top-level menus render, Create among the absent
    When I open the side navigation as that role
    Then the "SCS_CE_TECHNICIAN" column should be offered exactly its own menus

  # THE HEADLINE: Work Bench absent, Create absent, Questions present. Asserted as one whole-list
  # comparison across every group, because each half is only meaningful beside the others — "Work Bench
  # is hidden" would also hold if the whole Administration group had failed to render.
  @p0
  Scenario: Work Bench is withheld while Maintenance offers Questions alone
    When I open the side navigation as that role
    Then the "SCS_CE_TECHNICIAN" column should be offered exactly its own menu leaves

  @p0
  Scenario: The Maintenance sub-group renders, unlike every other non-administrator column
    When I open the side navigation as that role
    Then the "SCS_CE_TECHNICIAN" column should be offered exactly its own sub-groups

  # ---------------------------------------------------------------------------------------------
  # Record tabs. Both records still open WHOLE — Risk Rating included. The client's 2026-09-02 spec puts
  # every column it does not name as a create role on READ, and this is one of them, so the tabs survive
  # its read-only rule intact even though the create and update verbs behind them did not. No tab is
  # withheld from this column.

  @p1
  Scenario: The scaler record offers every tab this column reads, Risk Rating included
    When I browse directly to "/scalers/view/001B"
    Then the scaler record should offer the "SCS_CE_TECHNICIAN" column its tabs
    And the "SCS_CE_TECHNICIAN" column should see the Risk Rating tab as its column allows

  @p1
  Scenario: The scale site record offers every tab this column reads, Risk Rating included
    When I browse directly to "/scale-sites/view/520"
    Then the scale site record should offer the "SCS_CE_TECHNICIAN" column its tabs
    And the "SCS_CE_TECHNICIAN" column should see the Risk Rating tab as its column allows

  # ---------------------------------------------------------------------------------------------
  # In-page write controls. NONE. This is the whole of the client's 2026-09-02 rule at GUI level, and the
  # sweep now runs in one direction only: every control the suite knows about must be absent.
  #
  # The four this column used to offer — Add Performance Remark, both Add Check Scale buttons and Add
  # Inspection — are the ones to watch on a regression, because §3's §C, §I and §H all still grant them
  # on paper. There is no "granted" half to assert any more, so the scenario that paired with this one
  # was removed rather than left to pass vacuously.

  @p0
  Scenario: No write control anywhere is offered to this column
    When I sweep every write control as the "SCS_CE_TECHNICIAN" role
    Then no control the "SCS_CE_TECHNICIAN" column withholds should be offered

  # THE PAIRING, and it carries the whole weight now: every control the sweep looked for renders for a
  # caller that holds it, so a clean sweep cannot also be describing a record page that never loaded.
  @p0
  Scenario: An administrator is offered every control this column withholds
    Given I am signed in as a system administrator
    When I sweep every write control as the "SCS_CE_TECHNICIAN" role
    Then an administrator should be offered every control swept
