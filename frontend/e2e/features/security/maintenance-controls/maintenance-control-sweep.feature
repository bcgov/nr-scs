# Spec: the roles & permissions matrix §J (Reference-Data Maintenance)
#       › RolePermissions.scalingManagerColumn() / .ceTechnician() › MaintenanceListPage.addPermission
#       + MaintenanceFormModal.editPermission / .deletePermission › THIS FILE
#
# THE §J WRITE CONTROLS — the gap three role suites deferred, closed in one place.
#
# Every role suite sweeps in-page write controls on RECORD tabs. None of them judged the maintenance
# screens, because these three controls are not reachable the same way:
#
#   Add    is on the LIST page.
#   Edit   is inside a row's DETAIL MODAL — you must open a record first.
#   Delete is in the same modal.
#
# So they sat in `ALL_WRITE_CONTROLS`'s blind spot and were logged as gaps instead:
#   CET  CG-2 — Questions create/update/delete withheld, "needs a maintenance-page control sweep"
#   DSM  CG-3 — the withheld deletes
#   DSM  CG-4 — MAINTAIN_SIGNATORIES_CREATE withheld, "the sharpest untested cell in this column"
# This file closes all three.
#
# WHY IT IS WORTH THE TROUBLE. Both gates are OPT-IN PROPS, not a shared wrapper: `MaintenanceListPage`
# renders its Add button ungated when no `addPermission` is passed, and `MaintenanceFormModal` does the
# same for Edit and Delete. A page that simply omits a prop shows the control to every role that can
# open the screen, and nothing else in the suite is positioned to notice.
#
# Two traps are handled in `MaintenancePage` and both fail in the REASSURING direction, so read them
# before changing a locator: a second, hidden `.form-actions` belonging to the delete-confirmation modal
# carries its own danger button; and an absence assertion is vacuous unless the detail modal actually
# opened, so every one of them is anchored on the modal heading first.
@sec @SEC-11 @cross-cutting @maintenance-controls
Feature: Cross-cutting — §J maintenance write controls

  # ---------------------------------------------------------------- the scaling manager column
  #
  # §J grants this column CREATE + UPDATE on six of the eight areas, UPDATE alone on Signatories, and
  # nothing but reads on Questions. It holds NO delete anywhere in §J.

  @p0
  Scenario Outline: A district scaling manager is offered <control> on <page>
    Given I am signed in as the "SCS_DIST_SCALING_MANAGER" role
    When I open the maintenance list "<page>"
    Then the maintenance "<control>" control should be offered

    Examples: the six areas with a CREATE cell
      | page                                   | control |
      | /maintenance/templates                 | Add     |
      | /maintenance/conditions                | Add     |
      | /maintenance/exam-upgrades             | Add     |
      | /maintenance/appointment-types         | Add     |
      | /maintenance/valid-licence-attributes  | Add     |
      | /maintenance/authorization-clauses     | Add     |

  @p0
  Scenario Outline: A district scaling manager is offered Edit on <page>
    Given I am signed in as the "SCS_DIST_SCALING_MANAGER" role
    When I open the first record on the maintenance list "<page>"
    Then the maintenance "Edit" control should be offered

    Examples: the seven areas with an UPDATE cell — note Signatories is here but not in the Add table
      | page                                   |
      | /maintenance/templates                 |
      | /maintenance/conditions                |
      | /maintenance/exam-upgrades             |
      | /maintenance/appointment-types         |
      | /maintenance/valid-licence-attributes  |
      | /maintenance/authorization-clauses     |
      | /maintenance/signature-blocks          |

  # CG-4 — the sharpest cell. Signatories is the one area where §J gives this column UPDATE with no
  # CREATE, so Add must be hidden on the very screen whose Edit is offered above.
  @p0
  Scenario: A district scaling manager is not offered Add on the Signatories screen
    Given I am signed in as the "SCS_DIST_SCALING_MANAGER" role
    When I open the maintenance list "/maintenance/signature-blocks"
    Then the maintenance "Add" control should not be offered

  # CG-3 — the column holds no delete cell in §J at all, on any area.
  @p0
  Scenario Outline: A district scaling manager is not offered Delete on <page>
    Given I am signed in as the "SCS_DIST_SCALING_MANAGER" role
    When I open the first record on the maintenance list "<page>"
    Then the maintenance "Delete" control should not be offered

    Examples: every maintenance area
      | page                                   |
      | /maintenance/templates                 |
      | /maintenance/conditions                |
      | /maintenance/questions                 |
      | /maintenance/signature-blocks          |
      | /maintenance/exam-upgrades             |
      | /maintenance/appointment-types         |
      | /maintenance/valid-licence-attributes  |
      | /maintenance/authorization-clauses     |

  # Questions is read-only for this column — the one area where it gets neither write.
  @p0
  Scenario: A district scaling manager is not offered Add on the Questions screen
    Given I am signed in as the "SCS_DIST_SCALING_MANAGER" role
    When I open the maintenance list "/maintenance/questions"
    Then the maintenance "Add" control should not be offered

  @p0
  Scenario: A district scaling manager is not offered Edit on the Questions screen
    Given I am signed in as the "SCS_DIST_SCALING_MANAGER" role
    When I open the first record on the maintenance list "/maintenance/questions"
    Then the maintenance "Edit" control should not be offered

  # ---------------------------------------------------------------- the regional scaling manager
  #
  # `RolePermissions` maps DSM and RSM to the SAME list (`scalingManagerColumn()`), which
  # `RolePermissionsTest` pins in Java and the scaling-manager E2E suite pins at the route and API
  # levels. Repeating all 24 rows here would re-prove that rather than test anything new, so RSM takes
  # the four cells where a divergence would matter most: the area with UPDATE-but-no-CREATE, and the
  # read-only area.

  @p1
  Scenario: A regional scaling manager is offered Edit but not Add on the Signatories screen
    Given I am signed in as the "SCS_REGIONAL_SCALING_MANAGER" role
    When I open the maintenance list "/maintenance/signature-blocks"
    Then the maintenance "Add" control should not be offered
    When I open the first record on the maintenance list "/maintenance/signature-blocks"
    Then the maintenance "Edit" control should be offered
    And the maintenance "Delete" control should not be offered

  @p1
  Scenario: A regional scaling manager is offered no write control on the Questions screen
    Given I am signed in as the "SCS_REGIONAL_SCALING_MANAGER" role
    When I open the maintenance list "/maintenance/questions"
    Then the maintenance "Add" control should not be offered
    When I open the first record on the maintenance list "/maintenance/questions"
    Then the maintenance "Edit" control should not be offered
    And the maintenance "Delete" control should not be offered

  # ---------------------------------------------------------------- the CE Technician
  #
  # CG-2. Questions is the ONLY §J area this column may open at all — the other seven refuse at the
  # route, which its own url-access.feature already proves. §J grants it QUERY and READ there and
  # nothing else, so all three controls must be withheld on the one screen it can reach.

  @p0
  Scenario: A CE technician is offered no write control on the Questions screen
    Given I am signed in as the "SCS_CE_TECHNICIAN" role
    When I open the maintenance list "/maintenance/questions"
    Then the maintenance "Add" control should not be offered
    When I open the first record on the maintenance list "/maintenance/questions"
    Then the maintenance "Edit" control should not be offered
    And the maintenance "Delete" control should not be offered

  # ---------------------------------------------------------------- the contrast
  #
  # Without this every "should not be offered" row above is also satisfied by a control that was
  # renamed, restyled, or never rendered for anyone. The administrator holds ALL_PERMISSIONS, so each
  # control it IS offered proves the locator still finds a control that exists.

  @p0
  Scenario Outline: An administrator is offered Add on <page>
    Given I am signed in as the "SCS_SYS_ADMIN" role
    When I open the maintenance list "<page>"
    Then the maintenance "Add" control should be offered

    Examples: including the two the scaling manager column is denied
      | page                                   |
      | /maintenance/templates                 |
      | /maintenance/conditions                |
      | /maintenance/questions                 |
      | /maintenance/signature-blocks          |
      | /maintenance/exam-upgrades             |
      | /maintenance/appointment-types         |
      | /maintenance/valid-licence-attributes  |
      | /maintenance/authorization-clauses     |

  @p0
  Scenario Outline: An administrator is offered Edit and Delete on <page>
    Given I am signed in as the "SCS_SYS_ADMIN" role
    When I open the first record on the maintenance list "<page>"
    Then the maintenance "Edit" control should be offered
    And the maintenance "Delete" control should be offered

    Examples: the Delete column no other role is offered anywhere
      | page                                   |
      | /maintenance/templates                 |
      | /maintenance/conditions                |
      | /maintenance/questions                 |
      | /maintenance/signature-blocks          |
      | /maintenance/exam-upgrades             |
      | /maintenance/appointment-types         |
      | /maintenance/valid-licence-attributes  |
      | /maintenance/authorization-clauses     |
