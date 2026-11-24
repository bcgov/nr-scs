# Spec: the roles & permissions matrix §3 columns `CLE`, `SUP` and `RM`
#       › RolePermissions.readOnlyInternalColumn() › routePaths.tsx `permission` › ProtectedRoute › THIS FILE
#
# LEVEL 2 of 3 — URL. What the role reaches by ADDRESS BAR, ignoring what the navigation offers.
#
# The level that matters for a bookmark, an emailed link, or a remembered path. Hiding a menu entry does
# nothing here; only `ProtectedRoute`'s permission check does.
#
# Asserted on the LANDED PATH rather than page content, because a denied route REDIRECTS to
# `/unauthorized` (the port of the legacy `notAuthorized` forward). `I should stay on` waits for the guard
# to COMMIT first — it refuses from inside a `useEffect`, so the redirect lands after `networkidle`, and
# without that wait the allow rows pass on machine speed alone.
#
# Every route below was cross-checked against routePaths.tsx's own `permission` prop, so the tables are
# grounded in the route table rather than in a reading of the matrix.
@sec @SEC-10 @CLE @SUP @RM @readonly-internal
Feature: Read-only internal column — URL access

  # ---------------------------------------------------------------------------------------------
  # Reachable. Grouped by matrix section. Run for all three roles: identical route reachability is
  # part of the equality claim, and the route table is where a divergence would show up first.

  @p0
  Scenario Outline: <route> is reachable for <role>
    Given I am signed in as the "<role>" role
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples: SCS_CLERICAL
      | role         | route                                    |
      | SCS_CLERICAL | /welcome                                 |
      | SCS_CLERICAL | /workbench                               |
      | SCS_CLERICAL | /client                                  |
      | SCS_CLERICAL | /scalers                                 |
      | SCS_CLERICAL | /scalers/summary                         |
      | SCS_CLERICAL | /scale-sites                             |
      | SCS_CLERICAL | /mark-site-designations                  |
      | SCS_CLERICAL | /mark-site-designations/view             |
      | SCS_CLERICAL | /scale-site-authorizations               |
      | SCS_CLERICAL | /scalers/view/001B                       |
      | SCS_CLERICAL | /scale-sites/view/520                    |
      | SCS_CLERICAL | /scaler-authorizations/view/147851       |
      | SCS_CLERICAL | /scale-site-authorizations/view/239313   |
      | SCS_CLERICAL | /scale-sites/520/inspections/view/322429 |
      | SCS_CLERICAL | /scaler-risk-assessments                 |
      | SCS_CLERICAL | /scale-site-risk-assessments             |
      | SCS_CLERICAL | /reports/scaler-register                 |
      | SCS_CLERICAL | /reports/district-check-scale-performance |

    Examples: SCS_BRANCH_SYS_SUPPORT
      | role                   | route                                    |
      | SCS_BRANCH_SYS_SUPPORT | /welcome                                 |
      | SCS_BRANCH_SYS_SUPPORT | /workbench                               |
      | SCS_BRANCH_SYS_SUPPORT | /client                                  |
      | SCS_BRANCH_SYS_SUPPORT | /scalers                                 |
      | SCS_BRANCH_SYS_SUPPORT | /scale-sites                             |
      | SCS_BRANCH_SYS_SUPPORT | /mark-site-designations                  |
      | SCS_BRANCH_SYS_SUPPORT | /scalers/view/001B                       |
      | SCS_BRANCH_SYS_SUPPORT | /scale-sites/view/520                    |
      | SCS_BRANCH_SYS_SUPPORT | /scale-sites/520/inspections/view/322429 |
      | SCS_BRANCH_SYS_SUPPORT | /reports/scaler-register                 |

    Examples: SCS_REGIONAL_MANAGER
      | role                 | route                                    |
      | SCS_REGIONAL_MANAGER | /welcome                                 |
      | SCS_REGIONAL_MANAGER | /workbench                               |
      | SCS_REGIONAL_MANAGER | /client                                  |
      | SCS_REGIONAL_MANAGER | /scalers                                 |
      | SCS_REGIONAL_MANAGER | /scale-sites                             |
      | SCS_REGIONAL_MANAGER | /mark-site-designations                  |
      | SCS_REGIONAL_MANAGER | /scalers/view/001B                       |
      | SCS_REGIONAL_MANAGER | /scale-sites/view/520                    |
      | SCS_REGIONAL_MANAGER | /scale-sites/520/inspections/view/322429 |
      | SCS_REGIONAL_MANAGER | /reports/scaler-register                 |

  # ---------------------------------------------------------------------------------------------
  # Refused. Every row is a "-" cell. Run exhaustively for SCS_CLERICAL and sampled for the other two,
  # because the three resolve to the same permission set — the api-access equality scenario is what
  # holds that claim, so re-running 30 identical denials three times would buy nothing.

  @p0
  Scenario Outline: <route> is refused for a read-only internal role
    Given I am signed in as the "SCS_CLERICAL" role
    When I browse directly to "<route>"
    Then I should be refused with the unauthorized page

    Examples: create wizards — no _CREATE anywhere in the column, so the whole Create menu is gone
      | route                          |
      | /scalers/create                |
      | /scale-sites/create            |
      | /check-scales/create           |
      | /summary-check-scales/create   |
      | /mark-site-designations/create |
      | /scaler-authorizations/create  |
      | /scale-site-authorizations/create |

    # THE TAB/RECORD SPLIT — judgement call (2) in RolePermissions.clerical(), and the sharpest thing
    # this suite asserts. §I is "-" throughout for this column so CHECK_SCALE_QUERY is withheld and the
    # check-scale RECORD is closed, while §C's and §D's "Check Scales" tabs are both R and stay readable
    # (asserted in gui-access.feature). The rows disagree on purpose: §4's "check-scale history" is the
    # list, not the report.
    Examples: the check-scale record — withheld while both check-scale TABS are readable
      | route                          |
      | /check-scales/view/145988      |
      | /check-scales/edit/145988      |
      | /check-scales/145988/advisory-letter |

    Examples: edits — the column is R throughout, with no update row on any record
      | route                                     |
      | /mark-site-designations/edit/1101         |
      | /scaler-authorizations/edit/147851        |
      | /scale-site-authorizations/edit/239313    |
      | /scale-sites/520/inspections/edit/322429  |
      | /scale-sites/520/inspections/create       |

    # No _LETTER verb: §E and §F are plain R with no create row, so this column documents no lifecycle
    # of its own. Contrast with CHK, which is granted MSD_LETTER for exactly the opposite reason.
    Examples: letters — withheld on the "owns the workflow end to end" test
      | route                                       |
      | /scaler-authorizations/147851/letter        |
      | /scale-site-authorizations/239313/letter    |
      | /mark-site-designations/1101/letter         |

    # THE HALF THAT IS STILL WITHHELD. Since `dbf826c` this column holds the risk QUERY/READ verbs, so
    # both search screens are reachable (asserted above) — but not CREATE or UPDATE, so authoring an
    # assessment stays refused. The tab opens and the routes behind it do not.
    Examples: risk assessment — the create half, withheld while the read half is granted
      | route                                    |
      | /scalers/001B/risk-assessments/create    |
      | /scale-sites/520/risk-assessments/create |

    Examples: reference-data maintenance — every §J row is "-"
      | route                                 |
      | /maintenance/templates                |
      | /maintenance/conditions               |
      | /maintenance/questions                |
      | /maintenance/signature-blocks         |
      | /maintenance/exam-upgrades            |
      | /maintenance/appointment-types        |
      | /maintenance/valid-licence-attributes |
      | /maintenance/authorization-clauses    |
      | /maintenance/system                   |

  # The same denials sampled for the other two columns — one representative route per matrix section.
  # If a future requirement separates the three columns, this is one of the two places it surfaces.
  @p1
  Scenario Outline: <route> is refused for <role> too
    Given I am signed in as the "<role>" role
    When I browse directly to "<route>"
    Then I should be refused with the unauthorized page

    Examples:
      | role                   | route                      |
      | SCS_BRANCH_SYS_SUPPORT | /scalers/create            |
      | SCS_BRANCH_SYS_SUPPORT | /check-scales/view/145988  |
      | SCS_BRANCH_SYS_SUPPORT | /scalers/001B/risk-assessments/create |
      | SCS_BRANCH_SYS_SUPPORT | /maintenance/questions     |
      | SCS_REGIONAL_MANAGER   | /scalers/create            |
      | SCS_REGIONAL_MANAGER   | /check-scales/view/145988  |
      | SCS_REGIONAL_MANAGER   | /scalers/001B/risk-assessments/create |
      | SCS_REGIONAL_MANAGER   | /maintenance/questions     |

  # THE PAIRING for the deny tables. Without it every row above would pass just as happily against a
  # frontend that redirected everything, or a route table that had lost these entries entirely.
  # Sampled: one representative route per matrix section.
  @p1
  Scenario Outline: <route> is reachable for a role that holds the permission
    Given I am signed in as a system administrator
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples:
      | route                              |
      | /scalers/create                    |
      | /check-scales/view/145988          |
      | /mark-site-designations/edit/1101  |
      | /scaler-authorizations/147851/letter |
      | /scalers/001B/risk-assessments/create |
      | /maintenance/questions             |
      | /maintenance/system                |
