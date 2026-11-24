# Spec: roles-permissions.md §3 columns `DSM` and `RSM` › routePaths.tsx `permission`
#       › ProtectedRoute › THIS FILE
#
# LEVEL 2 of 3 — URL. What the role reaches by ADDRESS BAR.
#
# ── THE STRIKING FACT THIS FILE ASSERTS ────────────────────────────────────────────────────────────
# Cross-referencing `scalingManagerColumn()` against every `permission` prop in `routePaths.tsx`, this
# column holds the permission for EVERY protected route in the application except one:
# `/maintenance/system` (`MAINTAIN_SYSTEM_READ`, §J's Maintain System row is `-`).
#
# So the deny table here has a single row, and that is the assertion — not an omission. A second refused
# route appearing would mean either a permission was withdrawn or a new route was added gated on something
# this column does not hold; either way this file should be the thing that notices.
#
# The reachable table is exhaustive rather than sampled for the same reason: with only one denial, the
# coverage that carries weight is the breadth of what IS reachable, including the routes no narrower
# column can enter (the create wizards, risk assessment, and eight of nine maintenance screens).
@sec @SEC-10 @DSM @RSM @scaling-manager
Feature: Scaling manager column — URL access

  # ---------------------------------------------------------------------------------------------
  # Reachable. Exhaustive for DSM; sampled for RSM, since the api-access equality scenario is what
  # holds the claim that the two columns are the same.

  @p0
  Scenario Outline: <route> is reachable for a scaling manager
    Given I am signed in as the "SCS_DIST_SCALING_MANAGER" role
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples: general and queries
      | route                        |
      | /welcome                     |
      | /workbench                   |
      | /client                      |
      | /scalers                     |
      | /scalers/summary             |
      | /scale-sites                 |
      | /mark-site-designations      |
      | /mark-site-designations/view |
      | /scale-site-authorizations   |

    Examples: records
      | route                                    |
      | /scalers/view/001B                       |
      | /scale-sites/view/520                    |
      | /scaler-authorizations/view/147851       |
      | /scale-site-authorizations/view/239313   |
      | /scale-sites/520/inspections/view/322429 |

    # THE CREATE WIZARDS — all seven. The first enabled column to reach any of them.
    Examples: create wizards — §3 gives this column CR on every create row
      | route                             |
      | /scalers/create                   |
      | /scale-sites/create               |
      | /check-scales/create              |
      | /summary-check-scales/create      |
      | /mark-site-designations/create    |
      | /scaler-authorizations/create     |
      | /scale-site-authorizations/create |

    Examples: edits — CRU nearly everywhere the administrator has CRUD
      | route                                    |
      | /check-scales/edit/145988                |
      | /mark-site-designations/edit/1101         |
      | /scaler-authorizations/edit/147851        |
      | /scale-site-authorizations/edit/239313    |
      | /scale-sites/520/inspections/edit/322429  |
      | /scale-sites/520/inspections/create       |

    # ALL FOUR LETTERS, by the "owns the workflow end to end" test — the first column besides the
    # administrator that authors every document it can then issue.
    Examples: letters
      | route                                    |
      | /scaler-authorizations/147851/letter     |
      | /scale-site-authorizations/239313/letter |
      | /mark-site-designations/1101/letter      |
      | /check-scales/145988/advisory-letter     |

    # RISK ASSESSMENT — the first non-administrator column to reach any of it, by the "follows the record
    # it hangs off" rule. Includes the two edit routes that, under the earlier literal reading of §3's
    # lone "Risk Rating Criteria CR", were reachable by nobody but the administrator.
    Examples: risk assessment
      | route                                      |
      | /scaler-risk-assessments                   |
      | /scale-site-risk-assessments               |
      | /scalers/001B/risk-assessments/create      |
      | /scale-sites/520/risk-assessments/create   |

    Examples: reference-data maintenance — eight of nine §J screens
      | route                                 |
      | /maintenance/templates                |
      | /maintenance/conditions               |
      | /maintenance/questions                |
      | /maintenance/signature-blocks         |
      | /maintenance/exam-upgrades            |
      | /maintenance/appointment-types        |
      | /maintenance/valid-licence-attributes |
      | /maintenance/authorization-clauses    |

    Examples: reports
      | route                                     |
      | /reports/scaler-register                  |
      | /reports/district-check-scale-performance |

  # RSM, sampled across the same sections — one per group that no narrower column can enter.
  @p1
  Scenario Outline: <route> is reachable for the regional scaling manager too
    Given I am signed in as the "SCS_REGIONAL_SCALING_MANAGER" role
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples:
      | route                                 |
      | /welcome                              |
      | /workbench                            |
      | /scalers/create                       |
      | /scaler-risk-assessments              |
      | /scalers/001B/risk-assessments/create |
      | /maintenance/templates                |
      | /maintenance/signature-blocks         |

  # ---------------------------------------------------------------------------------------------
  # THE ONE REFUSED ROUTE IN THE APPLICATION.

  @p0
  Scenario Outline: /maintenance/system is refused for <role> — the column's only denied route
    Given I am signed in as the "<role>" role
    When I browse directly to "/maintenance/system"
    Then I should be refused with the unauthorized page

    Examples:
      | role                         |
      | SCS_DIST_SCALING_MANAGER     |
      | SCS_REGIONAL_SCALING_MANAGER |

  # THE PAIRING. With a single-row deny table this matters more than usual: without it, the scenario above
  # would pass just as well against a route that had been deleted, renamed, or broken for everyone.
  @p0
  Scenario: An administrator reaches /maintenance/system
    Given I am signed in as a system administrator
    When I browse directly to "/maintenance/system"
    Then I should stay on "/maintenance/system"
