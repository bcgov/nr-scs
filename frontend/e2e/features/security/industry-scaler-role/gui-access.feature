# Spec: the roles & permissions matrix §3 column `IND` (+ §4 prose)
#       › RolePermissions.industryScaler() (backend enforcer) › permissions.ts (frontend mirror) › THIS FILE
#
# LEVEL 1 of 3 — GUI. What the application OFFERS an industry scaler: navigation entries, record tabs,
# and in-page write controls. This level proves the permission mirror turns a call the API would refuse
# into a control that was never rendered. It does NOT prove containment — see url-access.feature and
# api-access.feature for that.
#
# Every deny scenario is paired with the same assertion run as an administrator. Without that contrast a
# "the button is not there" test also passes when the button moved, was renamed, or the page failed to
# load — i.e. it would pass for reasons that have nothing to do with the role.
@sec @SEC-8 @IND
Feature: Industry Scaler — GUI access

  Background:
    Given I am signed in as an industry scaler for my own client

  @p0
  Scenario: The navigation offers only the three query screens the matrix grants
    When I open the side navigation
    Then the Queries menu should offer exactly the industry scaler screens

  @p0
  Scenario: No administrative, reporting or create menu is offered
    When I open the side navigation
    Then no restricted menu should be offered

  # Contrast: the same three menus DO render for a role that holds them, so the scenario above is
  # asserting a role decision rather than an empty or broken navigation.
  @p1
  Scenario Outline: An administrator is offered the menus the industry scaler is not
    Given I am signed in as a system administrator
    When I open the side navigation
    Then the "<menu>" menu should be offered

    Examples:
      | menu           |
      | Reports        |
      | Create         |
      | Administration |

  @p0
  Scenario: Every read-only tab of the scaler record is available
    When I open my own scaler record
    Then the scaler record should offer every read-only tab

  # The Risk Rating tab is now OFFERED. §3's "Risk Rating Criteria" reads "-" for the IND column, but the
  # client's 2026-09-02 spec overrides it: this column reads the assessments on the record it lives on,
  # client-scoped. The scaler record therefore opens whole for this role.
  @p1
  Scenario: The Risk Rating tab is offered on the role's own scaler record
    When I open my own scaler record
    Then the scaler record should offer the Risk Rating tab

  # Every write cell in the IND column is "-", so no tab of the record may offer a create or edit
  # control. One scenario per tab, because each tab renders its own control and a single check would
  # silently stop covering the others.
  @p0
  Scenario Outline: No write control is offered on the <tab> tab
    When I open my own scaler record on the "<tab>" tab
    Then the "<control>" control should not be offered

    Examples:
      | tab                 | control                |
      | summary             | Edit Record            |
      | authorizations      | Add Authorization      |
      | check-scales        | Add Check Scale        |
      | exams-upgrades      | Add Exam / Upgrade     |
      | appointments        | Add Appointment        |
      | performance-remarks | Add Performance Remark |

  # Contrast for the outline above: each of those controls exists for a role that holds the permission.
  @p1
  Scenario Outline: An administrator is offered the <control> control the industry scaler is not
    Given I am signed in as a system administrator
    When I open my own scaler record on the "<tab>" tab
    Then the "<control>" control should be offered

    Examples:
      | tab                 | control                |
      | summary             | Edit Record            |
      | authorizations      | Add Authorization      |
      | check-scales        | Add Check Scale        |
      | exams-upgrades      | Add Exam / Upgrade     |
      | appointments        | Add Appointment        |
      | performance-remarks | Add Performance Remark |
