# Spec: the roles & permissions matrix §3 column `OWN` (+ §4 prose)
#       › RolePermissions.scaleSiteOwner() (backend enforcer) › permissions.ts (frontend mirror) › THIS FILE
#
# LEVEL 1 of 3 — GUI. What the application OFFERS a scale site owner: navigation entries, record tabs,
# and in-page write controls. This level proves the permission mirror turns a call the API would refuse
# into a control that was never rendered. It does NOT prove containment — see url-access.feature and
# api-access.feature for that.
#
# The role is the MIRROR IMAGE of the industry scaler, and this file is where that shows most: the owner
# lives on the SCALE-SITE record (nine readable tabs) and barely touches the scaler record (three), while
# the industry scaler is the other way round. Where a scenario exists only to pin that inversion, the
# comment says so.
#
# Every deny scenario is paired with the same assertion run as an administrator. Without that contrast a
# "the button is not there" test also passes when the button moved, was renamed, or the page failed to
# load — i.e. it would pass for reasons that have nothing to do with the role.
@sec @SEC-9 @OWN
Feature: Scale Site Owner — GUI access

  Background:
    Given I am signed in as a scale site owner for my own client

  @p0
  Scenario: The navigation offers only the three query screens the matrix grants
    When I open the side navigation
    Then the Queries menu should offer exactly the scale site owner screens

  @p0
  Scenario: No administrative, reporting or create menu is offered
    When I open the side navigation
    Then no restricted menu should be offered to a scale site owner

  # Contrast: those menus DO render for a role that holds them, so the scenario above is asserting a role
  # decision rather than an empty or broken navigation.
  @p1
  Scenario Outline: An administrator is offered the menus the scale site owner is not
    Given I am signed in as a system administrator
    When I open the side navigation
    Then the "<menu>" menu should be offered

    Examples:
      | menu           |
      | Reports        |
      | Create         |
      | Administration |

  # ------------------------------------------------------------------ the scale-site record

  @p0
  Scenario: Every readable tab of the scale site record is available
    When I open my own scale site record
    Then the scale site record should offer every readable tab

  # The Risk Rating tab is now OFFERED. §3's "Scale Site Record – Risk Rating Criteria" reads `-` for
  # OWN, but the client's 2026-09-02 spec overrides it: this column reads the assessments on the record
  # it lives on, client-scoped. The site record therefore opens whole for this role.
  @p1
  Scenario: The Risk Rating tab is offered on the role's own scale site record
    When I open my own scale site record
    Then the scale site record should offer the Risk Rating tab

  # Every write cell in the OWN column is "-", so no tab of the site record may offer a create or edit
  # control. One scenario per tab, because each tab renders its own control and a single check would
  # silently stop covering the others.
  @p0
  Scenario Outline: No "<control>" control is offered on the site record's <tab> tab
    When I open my own scale site record on the "<tab>" tab
    Then the "<control>" control should not be offered

    Examples:
      | tab                | control                    |
      | summary            | Edit Record                |
      | contacts           | Add Primary Contact        |
      | contacts           | Add Site Contact           |
      | authorizations     | Add Authorization          |
      | authorized-scalers | Add Authorization          |
      | msd                | Add Mark Site Designation  |
      | inspections        | Add Inspection             |
      | check-scales       | Add Check Scale            |

  # Contrast for the outline above: each of those controls exists for a role that holds the permission.
  @p1
  Scenario Outline: An administrator is offered the "<control>" control on the <tab> tab
    Given I am signed in as a system administrator
    When I open my own scale site record on the "<tab>" tab
    Then the "<control>" control should be offered

    Examples:
      | tab                | control                    |
      | summary            | Edit Record                |
      | contacts           | Add Primary Contact        |
      | contacts           | Add Site Contact           |
      | authorizations     | Add Authorization          |
      | authorized-scalers | Add Authorization          |
      | msd                | Add Mark Site Designation  |
      | inspections        | Add Inspection             |
      | check-scales       | Add Check Scale            |

  # The Contacts tab is the one place where hiding the buttons is not enough. Gating only Edit/Delete
  # leaves a headed "Actions" column full of empty cells, so the column itself is dropped for a role
  # holding neither verb. Asserted against a site with TWO real contact rows — on an empty tab the
  # row-action denial would pass vacuously.
  @p0
  Scenario: The contacts table offers no row actions and no Actions column
    When I open my own scale site record on the "contacts" tab
    Then the contacts table should list my site's contacts
    And the contacts table should offer no row actions

  @p1
  Scenario: An administrator gets the contacts Actions column on the same record
    Given I am signed in as a system administrator
    When I open my own scale site record on the "contacts" tab
    Then the contacts table should offer row actions

  # ------------------------------------------------------------------ the scaler record
  #
  # WHICH SCALER, and why it is seeded. Since 2026-08-20 an owner reaches a scaler only through an
  # in-force authorization at a site it owns, so these scenarios open one that has such an authorization,
  # seeded per scenario on its own anchor. The client's OWN scaler (IB60) is refused now — asserted that
  # way in client-scoping — so opening it here would fail on scope and prove nothing about tabs.

  # Three tabs only, and two of them (Address, Exams / Upgrades) are present because §4 was taken as
  # authoritative over §3's "-" for those rows — see RolePermissions.scaleSiteOwner() decision 1. This
  # scenario is the executable record of that decision: if it is ever reverted to §3, this fails.
  @p0
  Scenario: The scaler record offers only the three tabs the owner may read
    Given a scaler is authorized to scale at a site I own
    When I open the readable scaler record
    Then the scaler record should offer only the owner's readable tabs

  # The inversion against the industry scaler, stated as a denial: that role reads all eight scaler tabs,
  # this one reads three.
  @p0
  Scenario: The scaler record withholds every other tab
    Given a scaler is authorized to scale at a site I own
    When I open the readable scaler record
    Then the scaler record should not offer the tabs withheld from an owner

  @p1
  Scenario: An administrator is offered the scaler tabs the owner is not
    Given I am signed in as a system administrator
    When I open the readable scaler record
    Then the scaler record should offer the tabs withheld from an owner

  # ------------------------------------------------------------------ query pages

  # Searching and creating are separate matrix rows: §3.D grants OWN "Queries – Scale Sites" but leaves
  # "Scale Site – Create" as "-". This control was ungated until SCS_OWNER was enabled.
  @p0
  Scenario: The Scale Sites query page offers no Create Scale Site control
    When I search my own scale sites
    Then the "Create Scale Site" control should not be offered

  @p1
  Scenario: An administrator is offered Create Scale Site on the same page
    Given I am signed in as a system administrator
    When I search all scale sites as an administrator
    Then the "Create Scale Site" control should be offered
