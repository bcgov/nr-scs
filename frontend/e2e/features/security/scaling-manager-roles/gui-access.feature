# Spec: roles-permissions.md §3 columns `DSM` and `RSM` › RolePermissions.scalingManagerColumn()
#       › permissions.ts › navigation.ts › THIS FILE
#
# LEVEL 1 of 3 — GUI. What the application OFFERS.
#
# ── ONE SUITE, TWO ROLES ───────────────────────────────────────────────────────────────────────────
# `RolePermissions` maps `SCS_DIST_SCALING_MANAGER` and `SCS_REGIONAL_SCALING_MANAGER` to
# `scalingManagerColumn()` VERBATIM. §3 separates the two columns by exactly one thing: `(dist)` against
# `(rgn)` on Templates and Signatories — org-unit breadth, not a permission letter. So
# the two roles are behaviourally identical today and every scenario is outlined over both.
#
# Same shape as the read-only internal suite, and the same expiry: when reg/dist scoping lands these two
# columns diverge and this suite must be split. That axis is out of scope here by instruction, so unlike
# the read-only suite there is no org-unit feature file — the dependency is recorded in coverage.md
# instead.
#
# ── THE WIDEST NON-ADMINISTRATOR COLUMN ────────────────────────────────────────────────────────────
# Hold it as "almost the administrator, minus the deletes": §3 gives it CRU or CR nearly everywhere the
# administrator has CRUD. Two consequences shape this file:
#
#   1. EVERY top-level menu renders, including Create — legacy parity is
#      `MenuUtils.getDistScaleManMenus()` = getAQRMenus() + Create + Handheld. And every leaf renders
#      except ONE: Maintenance → System, because §J's Maintain System row is `-`.
#   2. THE CONTRAST HAS TO INVERT. Almost nothing is denied, so an administrator pairing proves nothing —
#      both hold everything. What proves a control is GATED rather than ungated is that the same controls
#      are HIDDEN for a narrow enabled role (`SCS_CLERICAL`) on the identical pages.
@sec @SEC-10 @DSM @RSM @scaling-manager
Feature: Scaling manager column — GUI access

  # ---------------------------------------------------------------------------------------------
  # Navigation. Every group, every leaf but one.

  @p0
  Scenario Outline: <role> is offered every top-level menu, Create included
    Given I am signed in as the "<role>" role
    When I open the side navigation as that role
    Then the "<role>" column should be offered exactly its own menus

    Examples:
      | role                         |
      | SCS_DIST_SCALING_MANAGER     |
      | SCS_REGIONAL_SCALING_MANAGER |

  # The whole-list comparison, and the one that matters most for this column: all seven Create leaves,
  # both risk-assessment Queries leaves, eight of nine Maintenance leaves — and System withheld. Asserted
  # together because "System is hidden" would also hold if Maintenance had failed to render at all.
  @p0
  Scenario Outline: <role> is offered every menu leaf except Maintenance → System
    Given I am signed in as the "<role>" role
    When I open the side navigation as that role
    Then the "<role>" column should be offered exactly its own menu leaves

    Examples:
      | role                         |
      | SCS_DIST_SCALING_MANAGER     |
      | SCS_REGIONAL_SCALING_MANAGER |

  @p1
  Scenario Outline: <role> is offered the Maintenance sub-group
    Given I am signed in as the "<role>" role
    When I open the side navigation as that role
    Then the "<role>" column should be offered exactly its own sub-groups

    Examples:
      | role                         |
      | SCS_DIST_SCALING_MANAGER     |
      | SCS_REGIONAL_SCALING_MANAGER |

  # ---------------------------------------------------------------------------------------------
  # Record tabs — and the first non-administrator column to be offered Risk Rating.
  #
  # This is the visible consequence of the "risk assessment follows the record it hangs off" rule: §3 has
  # one risk row and no scaler-subject row at all, so an assessment takes the level the role holds on that
  # record's other tabs. These columns author across both records whole, so they hold every verb both
  # subjects expose. Every other non-administrator column is denied the tab — the read-only, DM and CET
  # suites all assert it hidden, so this scenario is the other side of theirs.

  @p0
  Scenario Outline: <role> reads the Risk Rating tab that every narrower column is denied
    Given I am signed in as the "<role>" role
    When I browse directly to "/scalers/view/001B"
    Then the scaler record should offer the "<role>" column its tabs
    And the "<role>" column should see the Risk Rating tab as its column allows

    Examples:
      | role                         |
      | SCS_DIST_SCALING_MANAGER     |
      | SCS_REGIONAL_SCALING_MANAGER |

  @p0
  Scenario Outline: <role> reads every scale site tab, Risk Rating included
    Given I am signed in as the "<role>" role
    When I browse directly to "/scale-sites/view/520"
    Then the scale site record should offer the "<role>" column its tabs
    And the "<role>" column should see the Risk Rating tab as its column allows

    Examples:
      | role                         |
      | SCS_DIST_SCALING_MANAGER     |
      | SCS_REGIONAL_SCALING_MANAGER |

  # ---------------------------------------------------------------------------------------------
  # In-page write controls. All fourteen, on both records.
  #
  # Note `Save Record` on the Performance Remarks tab is offered here ALONGSIDE `Add Performance Remark`.
  # That pairing is unique to this column: `DM` has the cancel and not the remark writes, `CET` has the
  # remark writes and not the cancel, the read-only columns have neither, and only these two and the
  # administrator hold both.

  @p0
  Scenario Outline: <role> is offered every write control on both records
    Given I am signed in as the "<role>" role
    When I sweep every write control as the "<role>" role
    Then every control the "<role>" column grants should be offered

    Examples:
      | role                         |
      | SCS_DIST_SCALING_MANAGER     |
      | SCS_REGIONAL_SCALING_MANAGER |

  # THE INVERTED PAIRING, and the only thing that makes the scenario above meaningful. An administrator
  # contrast would pass against a UI that rendered every write control unconditionally; a narrow role
  # cannot. Same pages, same locators, same sweep — opposite verdict.
  @p0
  Scenario: A narrow role is offered none of the controls the scaling managers hold
    When I sweep the same controls as a narrow role
    Then a narrow role should be offered none of them
