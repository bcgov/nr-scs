# Spec: the roles & permissions matrix §3 column `OWN`
#       › routePaths.tsx (`ProtectedRoute permission=…`) › THIS FILE
#
# LEVEL 2 of 3 — URL. What the role reaches by ADDRESS BAR, ignoring what the navigation offers. This is
# the bookmark / emailed-link / typed-path case, where hiding a menu entry does nothing and only
# `ProtectedRoute`'s permission check stands between the user and the screen.
#
# The route list below was DERIVED, not hand-written: every `path:` in routePaths.tsx was matched to its
# `ProtectedRoute permission=` and classified by whether `SCALE_SITE_OWNER_PERMISSIONS` contains it. That
# is what makes the split auditable — **9 permission-gated routes resolve** for this role, 49 are refused,
# and 5 carry no permission at all (of which `/welcome` is exercised below). The refused set samples every
# area; the allowed set lists all 9 plus `/welcome`, so it is complete.
#
# Two of those nine are reachable without any navigation entry pointing at them — `/scale-site-authorizations`
# has no side-nav leaf at all — so this file is the ONLY level that can catch them regressing.
#
# Anchors are inline here on purpose (`019V`, `IB60`, `239313`, `400091`): a reader checking this file
# against §3 should see the whole route, and the provenance for each lives in
# fixtures/security/scale-site-owner-test-data.ts.
@sec @SEC-9 @OWN
Feature: Scale Site Owner — URL access

  Background:
    Given I am signed in as a scale site owner for my own client

  # ROUTING ONLY. These assert the route is not redirected away by `ProtectedRoute` — i.e. the role holds
  # the page's permission. They say nothing about whether the record behind it is in the caller's client
  # scope, which is `client-scoping.feature`'s job. `/scalers/view/IB60` is the one to read carefully:
  # since 2026-08-20 that record is refused on scope (the scaler is not authorized at a site this client
  # owns), so the page renders its access-denied card *without* redirecting — which is exactly what this
  # outline asserts and is still the correct routing outcome.
  @p0
  Scenario Outline: <route> is reachable by direct URL
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples: screens the OWN column grants
      | route                                     |
      | /welcome                                  |
      | /client                                   |
      | /scalers                                  |
      | /scalers/summary                          |
      | /scale-sites                              |
      | /scale-sites/view/019V                    |
      | /scalers/view/IB60                        |
      | /scale-site-authorizations                 |
      | /scale-site-authorizations/view/239313    |
      | /scale-sites/019V/inspections/view/400091 |

  # `/scale-sites` is the headline difference from the industry scaler, for whom this exact route is
  # refused: §3.D grants OWN "Queries – Scale Sites" as plain `R` where the IND column is "-". Stated as
  # its own scenario so the inversion is visible rather than buried in the outline above.
  @p0
  Scenario: The scale site register is reachable, unlike for an industry scaler
    When I browse directly to "/scale-sites"
    Then I should stay on "/scale-sites"

  @p0
  Scenario Outline: <route> is refused by direct URL
    When I browse directly to "<route>"
    Then I should be refused with the unauthorized page

    Examples: mark / site designations — §3.F is "-" for OWN on every row
      | route                          |
      | /mark-site-designations         |
      | /mark-site-designations/view    |
      | /mark-site-designations/create  |

    Examples: scaler authorizations — §3.E "Scaler Authorization" is "-" for OWN
      | route                                  |
      | /scaler-authorizations/create           |
      | /scaler-authorizations/view/147851      |

    # BOTH risk registers, this column's own subject included. It reads its sites' assessments from the
    # record — the Risk Rating tab lists and links them — so `_ASSESSMENT_READ` is granted and
    # `_ASSESSMENT_QUERY` is not (2026-09-03). The scaler subject is `IND`'s besides.
    #
    # `/scale-sites` is in the REACHABLE table above, which is what makes this a statement about the
    # assessment register rather than about registers generally.
    Examples: risk assessments — both registers
      | route                        |
      | /scaler-risk-assessments     |
      | /scale-site-risk-assessments |

    Examples: check scales — §3.I is "-" throughout, though the site's Check Scales TAB is granted
      | route                        |
      | /check-scales/view/145988    |
      | /check-scales/create         |

    Examples: work bench and reports
      | route                        |
      | /workbench                   |
      | /reports/scaler-register     |
      | /reports/scale-site-register |

    Examples: reference-data maintenance — every §3.J cell is "-"
      | route                         |
      | /maintenance/system           |
      | /maintenance/questions        |
      | /maintenance/templates        |
      | /maintenance/conditions       |
      | /maintenance/signature-blocks |

    Examples: create and edit forms — every write cell in the OWN column is "-"
      | route                                   |
      | /scalers/create                          |
      | /scale-sites/create                      |
      | /scale-site-authorizations/create        |
      | /scale-sites/019V/inspections/create     |
      | /scale-site-authorizations/edit/239313   |
      | /scale-sites/019V/inspections/edit/400091 |

  # A client-scoped role delivered without its forest client grants NOTHING — not even the welcome page
  # (`RolePermissions.expandAuthorities` withholds WELCOME_READ, `hasWelcomeAccess` agrees). This is the
  # misprovisioned-external-account case, and the rule is that it fails closed rather than falling back
  # to unscoped access. Asserted for OWN as well as IND because the rule is per-role data
  # (`Roles.CLIENT_SCOPED_ROLES`), not a single shared branch.
  @p1
  Scenario: A scale site owner with no forest client reaches nothing at all
    Given I am signed in as a scale site owner with no forest client
    When I browse directly to "/welcome"
    Then I should be refused with the unauthorized page

  # Contrast: the refused routes above are real, working screens — they resolve for a role that holds the
  # permission, so the refusals are the role's doing and not a broken route table.
  @p1
  Scenario Outline: An administrator reaches <route> that the scale site owner cannot
    Given I am signed in as a system administrator
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples:
      | route                    |
      | /mark-site-designations  |
      | /workbench               |
      | /maintenance/system      |
      | /scale-sites/create      |
