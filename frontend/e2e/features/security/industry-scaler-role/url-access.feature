# Spec: the roles & permissions matrix §3 column `IND`
#       › routePaths.tsx (`ProtectedRoute permission=…`) › THIS FILE
#
# LEVEL 2 of 3 — URL. What the role reaches by ADDRESS BAR, ignoring what the navigation offers. This is
# the bookmark / emailed-link / typed-path case, where hiding a menu entry does nothing and only
# `ProtectedRoute`'s permission check stands between the user and the screen.
#
# The route list below is the IND column read route-by-route: each allowed path names a permission the
# matrix grants, each refused path one it withholds. A denied route redirects to /unauthorized (the port
# of the legacy `notAuthorized` forward), so the landed path is the assertion.
@sec @SEC-8 @IND
Feature: Industry Scaler — URL access

  Background:
    Given I am signed in as an industry scaler for my own client

  @p0
  Scenario Outline: <route> is reachable by direct URL
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples: screens the IND column grants
      | route                    |
      | /welcome                 |
      | /client                  |
      | /scalers                 |
      | /mark-site-designations  |
      | /scalers/view/001B       |

  # The register screens, every reporting and maintenance screen, the work bench, and every create form.
  # Grouped in one outline because they share a single rule — no permission, no route — and listing them
  # individually is what makes the coverage auditable against the matrix.
  @p0
  Scenario Outline: <route> is refused by direct URL
    When I browse directly to "<route>"
    Then I should be refused with the unauthorized page

    # BOTH risk registers, this column's own subject included. It reads its scaler's assessments from the
    # record — the Risk Rating tab lists and links them — so `_ASSESSMENT_READ` is granted and
    # `_ASSESSMENT_QUERY` is not (2026-09-03). Same shape as `/scale-sites` here: open the record, never
    # search the register.
    Examples: search / register screens withheld from IND
      | route                        |
      | /scale-sites                 |
      | /scale-site-authorizations   |
      | /scaler-risk-assessments     |
      | /scale-site-risk-assessments |

    Examples: work bench and reports
      | route                     |
      | /workbench                |
      | /reports/scaler-register  |
      | /reports/scale-site-register |

    Examples: reference-data maintenance
      | route                     |
      | /maintenance/system       |
      | /maintenance/questions    |
      | /maintenance/templates    |
      | /maintenance/conditions   |
      | /maintenance/signature-blocks |

    Examples: create forms — every write cell in the IND column is "-"
      | route                          |
      | /scalers/create                |
      | /scale-sites/create            |
      | /scaler-authorizations/create  |
      | /scale-site-authorizations/create |
      | /check-scales/create           |
      | /mark-site-designations/create |

  # A client-scoped role delivered without its forest client grants NOTHING — not even the welcome page
  # (`RolePermissions.expandAuthorities` withholds WELCOME_READ, `hasWelcomeAccess` agrees). This is the
  # misprovisioned-external-account case, and the rule is that it fails closed rather than falling back
  # to unscoped access.
  @p1
  Scenario: An industry scaler with no forest client reaches nothing at all
    Given I am signed in as an industry scaler with no forest client
    When I browse directly to "/welcome"
    Then I should be refused with the unauthorized page

  # Contrast: the refused routes above are real, working screens — they resolve for a role that holds
  # the permission, so the refusals are the role's doing and not a broken route table.
  @p1
  Scenario Outline: An administrator reaches <route> that the industry scaler cannot
    Given I am signed in as a system administrator
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples:
      | route                    |
      | /scale-sites             |
      | /workbench               |
      | /maintenance/system      |
      | /scalers/create          |
