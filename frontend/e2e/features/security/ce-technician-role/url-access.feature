# Spec: roles-permissions.md §3 column `CET` › routePaths.tsx `permission` › ProtectedRoute › THIS FILE
#
# LEVEL 2 of 3 — URL. What the role reaches by ADDRESS BAR, ignoring what the navigation offers.
#
# `CET` is the first column where the URL level and the GUI level disagree in an interesting way: the
# Work Bench is absent from its menu AND refused by route, while `/maintenance/questions` is present in
# its menu AND reachable — the only maintenance route any non-administrator column can enter.
#
# ── READ-ONLY SINCE 2026-09-02 ─────────────────────────────────────────────────────────────────────
# The client's spec — "in general they should only have read permissions. No where in the app should they
# be able to edit, delete or create something" — moved every create and edit route in this file from the
# reachable table to the refused one. What survives is the reads, plus one thing no other column has: the
# LETTER VIEW. That is not a route, though. A letter is viewed by downloading the stored PDF from a
# button on the record page, and the `/…/letter` routes are the COMPOSER — gated on `_LETTER_CREATE`,
# which this column does not hold. So both letter routes stay in the refused table, and the view half of
# the split is asserted at the API level instead.
@sec @SEC-10 @CET @ce-technician
Feature: C&E Technician — URL access

  Background:
    Given I am signed in as the "SCS_CE_TECHNICIAN" role

  # ---------------------------------------------------------------------------------------------
  # Reachable. Grouped by matrix section.

  @p0
  Scenario Outline: <route> is reachable
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples: general and queries — §A home, §B clients, §C/§D registers, §F MSD query
      | route                       |
      | /welcome                    |
      | /client                     |
      | /scalers                    |
      | /scalers/summary            |
      | /scale-sites                |
      | /mark-site-designations     |
      | /mark-site-designations/view |

    Examples: records — §C scaler, §D site, §E authorization reads
      | route                                  |
      | /scalers/view/001B                     |
      | /scale-sites/view/520                  |
      | /scaler-authorizations/view/147851     |

    # §I's READ row survives the client's rule, and it is still what separates this column from the
    # read-only internal one, which is refused this route outright.
    Examples: check scales — the record only
      | route                     |
      | /check-scales/view/145988 |

    Examples: site inspections — the record only
      | route                                    |
      | /scale-sites/520/inspections/view/322429 |

    # THE ONLY §J ROUTE ANY NON-ADMINISTRATOR COLUMN CAN ENTER. Legacy delivered this capability through
    # Handheld → "Download Questions" (`siteInspectionQuestions.do`), the read that loaded questions onto
    # a field device. Handheld is descoped, so it survives on the only surface SCS still has for it.
    Examples: reference data — §J "Maintain Questions" R
      | route                  |
      | /maintenance/questions |

    # RISK ASSESSMENT, read only. The client's spec names CHK/ADM/RSM/DSM as the create roles and puts
    # every other column on read, which withdrew this one's create and update.
    Examples: risk assessment — the searches, not the create form
      | route                        |
      | /scaler-risk-assessments     |
      | /scale-site-risk-assessments |

    Examples: reports — §4 "View reports", gated as one menu-level permission
      | route                                     |
      | /reports/scaler-register                  |
      | /reports/district-site-inspection-performance |

  # ---------------------------------------------------------------------------------------------
  # Refused.

  @p0
  Scenario Outline: <route> is refused
    When I browse directly to "<route>"
    Then I should be refused with the unauthorized page

    # THE DISTINCTIVE ABSENCE. §A is "-" for this column — the first internal role with no Work Bench.
    Examples: the Work Bench — refused by route as well as hidden from the menu
      | route      |
      | /workbench |

    Examples: create wizards — §C/§D "– Create" rows are "-"
      | route               |
      | /scalers/create     |
      | /scale-sites/create |

    # WITHDRAWN 2026-09-02. Every one of these was in the reachable table until the client's read-only
    # rule; §3's §I and §H granted them and the spec overrode both. Listed together so the reversal is
    # legible as one decision rather than six scattered denials.
    Examples: check scales and inspections — read-only since the client's rule
      | route                                    |
      | /check-scales/create                     |
      | /check-scales/edit/145988                |
      | /summary-check-scales/create             |
      | /check-scales/145988/advisory-letter     |
      | /scale-sites/520/inspections/create      |
      | /scale-sites/520/inspections/edit/322429 |

    Examples: risk assessment — read-only, so neither create form opens
      | route                                       |
      | /scalers/001B/risk-assessments/create       |
      | /scale-sites/520/risk-assessments/create    |

    Examples: mark site designations — §F is "-" on both create rows
      | route                             |
      | /mark-site-designations/create    |
      | /mark-site-designations/edit/1101 |

    Examples: authorizations — §E is plain R with no create or edit row
      | route                              |
      | /scaler-authorizations/create      |
      | /scale-site-authorizations/create  |
      | /scaler-authorizations/edit/147851 |

    # THE COMPOSER HALF OF THE LETTER SPLIT. Both are `_LETTER_CREATE` routes, and the client's
    # 2026-09-02 spec gives this column only `_LETTER_VIEW` — "CE_TECH should only be able to view
    # letters". Refusing the composer while the record page still offers a View Letter download is the
    # whole point of splitting the old single `_LETTER` verb, so it is asserted rather than assumed.
    Examples: letter composers — view is granted, compose is not
      | route                                |
      | /mark-site-designations/1101/letter  |
      | /scaler-authorizations/147851/letter |

    Examples: every §J row but Questions
      | route                                 |
      | /maintenance/templates                |
      | /maintenance/conditions               |
      | /maintenance/signature-blocks         |
      | /maintenance/exam-upgrades            |
      | /maintenance/appointment-types        |
      | /maintenance/valid-licence-attributes |
      | /maintenance/authorization-clauses    |
      | /maintenance/system                   |

  # THE PAIRING for the deny table — sampled, one per matrix section. Note `/maintenance/questions` is
  # deliberately NOT here: it is in the reachable table above, so its contrast is the read-only column
  # being refused it, asserted in api-access.feature.
  @p1
  Scenario Outline: <route> is reachable for a role that holds the permission
    Given I am signed in as a system administrator
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples:
      | route                               |
      | /workbench                          |
      | /scalers/create                     |
      | /mark-site-designations/1101/letter |
      | /scaler-authorizations/create       |
      | /maintenance/system                 |
