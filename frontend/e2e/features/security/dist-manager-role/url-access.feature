# Spec: roles-permissions.md §3 column `DM` › routePaths.tsx `permission` › ProtectedRoute › THIS FILE
#
# LEVEL 2 of 3 — URL. What the role reaches by ADDRESS BAR.
#
# ── WHAT THIS FILE IS ACTUALLY FOR ─────────────────────────────────────────────────────────────────
# `SCALER_LICENCE_CANCEL` gates no route at all — no entry in `routePaths.tsx` names it, because the
# licence-cancel form lives on the Performance Remarks tab of a record this column already reads. So the
# route surface of `DM` must be IDENTICAL to the read-only internal column's, and that identity is the
# assertion: a difference here would mean the one extra permission is leaking into route-level surface it
# has no business touching.
#
# Sampled rather than exhaustive on both halves — the full 30-route matrix is asserted in
# `../read-only-internal-roles/url-access.feature`. One row per matrix section, plus the two rows where a
# reader might reasonably expect the extra cell to have opened something.
@sec @SEC-10 @DM @dist-manager
Feature: District Manager — URL access

  Background:
    Given I am signed in as the "SCS_DIST_MANAGER" role

  @p1
  Scenario Outline: <route> is reachable
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples: one per matrix section, as for the read-only column
      | route                                    |
      | /welcome                                 |
      | /workbench                               |
      | /client                                  |
      | /scalers                                 |
      | /scalers/summary                         |
      | /scaler-risk-assessments                 |
      | /scale-site-risk-assessments             |
      | /scalers/view/001B                       |
      | /scale-sites/view/520                    |
      | /mark-site-designations                  |
      | /scale-sites/520/inspections/view/322429 |
      | /reports/scaler-register                 |

  @p0
  Scenario Outline: <route> is refused
    When I browse directly to "<route>"
    Then I should be refused with the unauthorized page

    # The route a reader might expect the licence-cancel cell to have opened. It did not: §C's
    # "Summary – Edit" is "-" for this column, so the scaler record stays read-only, and the cancel form
    # is a control on a tab rather than a screen of its own.
    Examples: the scaler is still not creatable or editable
      | route           |
      | /scalers/create |

    Examples: one per matrix section, as for the read-only column
      | route                                 |
      | /check-scales/view/145988             |
      | /mark-site-designations/edit/1101     |
      | /scaler-authorizations/147851/letter  |
      | /scalers/001B/risk-assessments/create |
      | /maintenance/questions                |
      | /maintenance/system                   |

  # THE PAIRING for the deny table.
  @p1
  Scenario Outline: <route> is reachable for a role that holds the permission
    Given I am signed in as a system administrator
    When I browse directly to "<route>"
    Then I should stay on "<route>"

    Examples:
      | route                     |
      | /scalers/create           |
      | /check-scales/view/145988 |
      | /scalers/001B/risk-assessments/create |
      | /maintenance/system       |
