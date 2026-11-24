# Spec: the roles & permissions matrix §3 columns `CLE`, `SUP` and `RM`
#       › RolePermissions.readOnlyInternalColumn() › permissions.ts › navigation.ts › THIS FILE
#
# LEVEL 1 of 3 — GUI. What the application OFFERS: side-nav entries, record tabs, in-page controls.
#
# ── ONE SUITE, THREE ROLES ─────────────────────────────────────────────────────────────────────────
# These three columns agree on 78 of §3's 79 rows, and `RolePermissions` maps all three to the SAME
# 30-permission set. The one variation is §A's Work Bench — `R (ltd)` for CLE/RM, plain `R` for SUP — and
# `(ltd)` is org-unit breadth, not a permission letter, so it changes nothing that is enforced today
# (see org-unit-scoping.feature). Every scenario is therefore outlined over the three roles: running the
# same assertions three times is what PROVES the equality `RolePermissionsTest` claims, instead of
# writing it down three times and trusting it.
#
# ── WHAT THIS LEVEL BUYS ───────────────────────────────────────────────────────────────────────────
# A usability guarantee, not a security one: it asserts `permissions.ts` turns a call the API would
# refuse into a control that was never rendered. The URL and API levels are what prove containment.
#
# Visibility, never presence — Carbon mounts modal contents (Save Record, Confirm Delete) into the DOM
# while hidden, so a presence check reports write controls this column is correctly never shown.
@sec @SEC-10 @CLE @SUP @RM @readonly-internal
Feature: Read-only internal column — GUI access

  # ---------------------------------------------------------------------------------------------
  # Navigation. Legacy parity: MenuUtils gave both support roles getAQRMenus() — Administration,
  # Queries, Reports. No Create menu, which is exactly what holding no _CREATE permission produces.

  @p0
  Scenario Outline: <role> is offered the three read-only menus and not Create
    Given I am signed in as the "<role>" role
    When I open the side navigation as an internal reader
    Then the "Queries" menu should be offered
    And the "Reports" menu should be offered
    And the "Administration" menu should be offered
    But the "Create" menu should not be offered

    Examples:
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |

  # All six leaves. The two risk screens were withheld until `dbf826c` introduced "risk assessment follows
  # the record it hangs off" — this column reads both records whole, so it holds the risk query/read verbs.
  # Still a whole-list comparison, so a Queries group that failed to render cannot pass.
  @p0
  Scenario Outline: <role> is offered all six Queries screens
    Given I am signed in as the "<role>" role
    When I open the side navigation as an internal reader
    Then the Queries menu should offer exactly the internal read-only screens

    Examples:
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |

  # REPORT_READ is menu-level — the matrix has no per-report rows, so there is nothing to withhold.
  @p1
  Scenario Outline: <role> is offered every report screen
    Given I am signed in as the "<role>" role
    When I open the side navigation as an internal reader
    Then every report screen should be offered

    Examples:
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |

  # The shape of this column, visible in one assertion: Administration renders (Work Bench is R) but
  # collapses to that single leaf, because §J is "-" throughout and the nested group is dropped for
  # having no visible child.
  @p0
  Scenario Outline: <role> is offered the Work Bench but no Maintenance sub-group
    Given I am signed in as the "<role>" role
    When I open the side navigation as an internal reader
    Then Administration should offer only the Work Bench

    Examples:
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |

  # THE PAIRING for the Maintenance denial above. The nested group only renders once Administration is
  # expanded, so this cannot use the generic `the {string} menu should be offered` step — that reads the
  # collapsed tree and would report the sub-group missing for an administrator too.
  @p1
  Scenario: An administrator is offered the Maintenance sub-group
    Given I am signed in as a system administrator
    When I open the side navigation as an internal reader
    Then an administrator should be offered the Maintenance sub-group

  # ---------------------------------------------------------------------------------------------
  # Record tabs. Both records open WHOLE — Risk Rating included since `dbf826c` ("risk assessment
  # follows the record it hangs off"). This column holds the risk query/read verbs but NOT
  # create/update, so the tab opens and the assessment create routes behind it stay refused —
  # asserted in url-access.feature.

  @p0
  Scenario Outline: <role> reads every scaler record tab, Risk Rating included
    Given I am signed in as the "<role>" role
    When I browse directly to "/scalers/view/001B"
    Then the scaler record should offer every tab this column reads
    And the record should offer the Risk Rating tab

    Examples:
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |

  @p0
  Scenario Outline: <role> reads every scale site record tab, Risk Rating included
    Given I am signed in as the "<role>" role
    When I browse directly to "/scale-sites/view/520"
    Then the scale site record should offer every tab this column reads
    And the record should offer the Risk Rating tab

    Examples:
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |

  # The Risk Rating tab needs no administrator pairing any more: this column reads it itself, so the
  # assertion above is an ALLOW rather than a deny. What still needs pairing is the create/update half,
  # which is withheld — asserted at the URL level, where the assessment create routes stay refused.

  # ---------------------------------------------------------------------------------------------
  # THE DEFINING PROPERTY. Thirty permissions, not one of them a mutation — so no write control on any
  # readable tab may render. Swept in one scenario across both records so every leak is reported at
  # once rather than failing on the first.

  @p0
  Scenario Outline: <role> is offered no write control on any tab it can read
    Given I am signed in as the "<role>" role
    When I sweep every tab that carries a write control
    Then no write control should be offered anywhere

    Examples:
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |

  # THE PAIRING, and the reason the sweep above is trustworthy: every control it looked for DOES render
  # for a role that holds its permission. Without this, a record page that failed to load its tabs would
  # report a clean sweep.
  @p0
  Scenario: An administrator is offered every write control the read-only column is denied
    Given I am signed in as a system administrator
    When I sweep every tab that carries a write control
    Then an administrator should be offered every one of them
