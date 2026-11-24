# Spec: the roles & permissions matrix §3 column `CHK`
#       › permissions.ts CHECK_SCALER_PERMISSIONS › routePaths.tsx `permission` › ProtectedRoute › THIS FILE
#
# LEVEL 2 of 3 — URL. What the role reaches by ADDRESS BAR, ignoring what the navigation offers.
#
# This is the level that matters when someone follows a bookmark, an emailed link, or types a path they
# remember. Hiding a menu entry does nothing here; only `ProtectedRoute`'s permission check does. A gap
# at this level is the difference between a tidy menu and a contained role.
#
# The assertion is on the LANDED PATH rather than on page content, because a denied route REDIRECTS to
# `/unauthorized` (the port of the legacy `notAuthorized` forward). The URL is therefore the primary
# evidence, and it stays true however that page is later restyled.
#
# On the allow half: `I should stay on {string}` waits for the route guard to COMMIT before reading the
# URL. `ProtectedRoute` refuses from inside a `useEffect`, so the redirect lands after `networkidle` —
# without that wait the allow rows pass on machine speed alone, and the deny rows flake in the dangerous
# direction. See references/role-scoping-mechanics.md §3.
@sec @SEC-10 @CHK
Feature: Check Scaler — URL access

  Background:
    Given I am signed in as a check scaler

  # ---------------------------------------------------------------------------------------------
  # Reachable. Grouped by matrix section.

  @p0
  Scenario Outline: <route> is reachable
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples: general — §A SCS Home Page R, Work Bench CRU
      | route     |
      | /welcome  |
      | /workbench |

    Examples: queries — §B Clients R, §C Scalers R, §D Scale Sites R, §F Query MSD R
      | route                       |
      | /client                     |
      | /scalers                    |
      | /scalers/summary            |
      | /scale-sites                |
      | /mark-site-designations     |
      | /mark-site-designations/view |

    Examples: records — §C Scaler Record R, §D Scale Site Record R, §E Scaler Authorization R
      | route                                |
      | /scalers/view/001B                   |
      | /scale-sites/view/520                |
      | /scaler-authorizations/view/147851   |

    Examples: check scales — §I Create (both steps) CR, Edit RU, and the summary flavour
      | route                          |
      | /check-scales/create           |
      | /check-scales/view/145988      |
      | /check-scales/edit/145988      |
      | /summary-check-scales/create   |

    Examples: site inspections — §H Create CR, Site Inspection RU
      | route                                       |
      | /scale-sites/520/inspections/create         |
      | /scale-sites/520/inspections/view/322429    |
      | /scale-sites/520/inspections/edit/322429    |

    # Every letter composer this column reaches, which since the client's 2026-09-02 spec is all of
    # them: "CHECK_SCALER … have access to all letters and can create letters". The authorization letter
    # was in the REFUSED table until then, on the "owns the workflow end to end" test §E supported.
    Examples: mark site designations — §F Create CR, Create/Edit CRUD, and the granted letter
      | route                                  |
      | /mark-site-designations/create         |
      | /mark-site-designations/edit/1101      |
      | /mark-site-designations/1101/letter    |
      | /scaler-authorizations/147851/letter   |

    # RISK ASSESSMENT, reachable since `dbf826c`. §D's lone "Risk Rating Criteria" row was followed
    # literally and these were asserted refused. The client's 2026-09-02 spec settles it directly: this
    # column is one of the four it names as risk-assessment create roles, on both subjects.
    Examples: risk assessment — read AND author, by the client's spec
      | route                                 |
      | /scaler-risk-assessments              |
      | /scale-site-risk-assessments          |
      | /scalers/001B/risk-assessments/create |

    Examples: reports — §4 "View reports", gated as one menu-level permission
      | route                                        |
      | /reports/scaler-register                     |
      | /reports/district-check-scale-performance    |

  # ---------------------------------------------------------------------------------------------
  # Refused. Every row is a "-" cell in the CHK column.

  @p0
  Scenario Outline: <route> is refused
    When I browse directly to "<route>"
    Then I should be refused with the unauthorized page

    Examples: create wizards — §C/§D "– Create" rows are "-"
      | route               |
      | /scalers/create     |
      | /scale-sites/create |

    Examples: authorizations — §E gives this column plain R, with no create or edit row
      | route                                       |
      | /scaler-authorizations/create               |
      | /scale-site-authorizations/create           |
      | /scaler-authorizations/edit/147851          |

    Examples: reference-data maintenance — every §J row is "-" for CHK
      | route                                   |
      | /maintenance/templates                  |
      | /maintenance/conditions                 |
      | /maintenance/questions                  |
      | /maintenance/signature-blocks           |
      | /maintenance/exam-upgrades              |
      | /maintenance/appointment-types          |
      | /maintenance/valid-licence-attributes   |
      | /maintenance/authorization-clauses      |
      | /maintenance/system                     |

  # THE PAIRING for the deny table. Without it every row above would pass just as happily against a
  # frontend that redirected everything, or a route table that had lost these entries entirely.
  # Sampled rather than exhaustive (the skill's rule): one representative route per matrix section.
  @p1
  Scenario Outline: <route> is reachable for a role that holds the permission
    Given I am signed in as a system administrator
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples:
      | route                                  |
      | /scalers/create                        |
      | /scaler-authorizations/create          |
      | /maintenance/questions                 |
      | /maintenance/system                    |
