# Spec: the roles & permissions matrix §3 columns `CLE`, `SUP` and `RM`
#       › RolePermissions.readOnlyInternalColumn() › @RequiresPermission › THIS FILE
#
# LEVEL 3 of 3 — API. What the SERVER allows, asked directly, with no browser involved.
#
# The other two levels describe an application that declines to OFFER something. Only this one shows the
# request being refused when it is made anyway — the difference between a tidy UI and an enforced
# permission model. This is the only level here that carries a security assertion.
#
# ── TWO CONTRASTS, BECAUSE A READ-ONLY COLUMN NEEDS BOTH ───────────────────────────────────────────
# Thirty permissions, not one of them a mutation, so there is no allow-side WRITE to prove. The exposure
# runs the other way: an endpoint that answered 200 for everyone would satisfy every allow row in this
# file, and an administrator contrast cannot detect that, because both callers hold the permission.
#
#   * ALLOW rows are paired with the ROLELESS SENTINEL (`X-Mock-Roles: none`), refused 403 everywhere
#     including `/welcome`. That difference is what proves the permission was read rather than never
#     consulted. Deliberately not a role that happens to hold nothing: all eleven roles are enabled now,
#     and the two suites that tried one were invalidated inside a day (defects.md V1 and V6).
#   * DENY rows are paired with an administrator, proving the endpoint exists and works.
#
# ── HOW DENIALS ARE ASSERTED ───────────────────────────────────────────────────────────────────────
# Matrix rows assert "refused"; ONE scenario pins the exact status. That split keeps a regression in how
# denials are MAPPED to a single failure instead of turning every deny row red — which is not
# hypothetical, it is what the check-scaler suite's Divergence #1 did before
# `GlobalApiExceptionHandler.handleAccessDenied` was added. Denials now answer 403 (measured 2026-08-26
# across 11 endpoints × 3 roles), and the pinning scenario is what will notice if that stops being true.
@sec @SEC-10 @CLE @SUP @RM @readonly-internal
Feature: Read-only internal column — API access

  # ---------------------------------------------------------------------------------------------
  # Allowed reads. Outlined over the three roles: identical API behaviour is the equality claim, and
  # this is the level where it is actually enforced.

  @p0
  Scenario Outline: <endpoint> is allowed for <role>
    When I call "GET" "<endpoint>" as the "<role>" role
    Then the API should allow it

    Examples: SCS_CLERICAL — the full column
      | role         | endpoint                                       |
      | SCS_CLERICAL | /api/welcome                                   |
      | SCS_CLERICAL | /api/static-lov                                |
      | SCS_CLERICAL | /api/clients/search?clientNumber=00001110      |
      | SCS_CLERICAL | /api/scalers/search?clientNumber=00001110      |
      | SCS_CLERICAL | /api/scalers/001B                              |
      | SCS_CLERICAL | /api/scale-sites/search?scaleSiteIdNmbr=520    |
      | SCS_CLERICAL | /api/scale-sites/520/summary                   |
      | SCS_CLERICAL | /api/scale-sites/520/contacts                  |
      | SCS_CLERICAL | /api/scale-sites/520/activity-summary          |
      | SCS_CLERICAL | /api/scale-sites/520/authorizations            |
      | SCS_CLERICAL | /api/scale-sites/520/authorized-scalers        |
      | SCS_CLERICAL | /api/scale-sites/520/mark-site-designations     |
      | SCS_CLERICAL | /api/scale-sites/520/inspections               |
      | SCS_CLERICAL | /api/scale-sites/520/check-scales              |
      | SCS_CLERICAL | /api/scale-sites/520/software                  |
      | SCS_CLERICAL | /api/scale-sites/inspection/322429             |
      | SCS_CLERICAL | /api/mark-site-designations/1101               |
      | SCS_CLERICAL | /api/scaler-authorizations/147851              |
      | SCS_CLERICAL | /api/scaler-authorizations/workbench           |
      | SCS_CLERICAL | /api/scale-site-authorizations/workbench       |
      | SCS_CLERICAL | /api/mark-site-designations/workbench          |
      | SCS_CLERICAL | /api/scaler-risk-assessments/search?riskLevel=M |
      | SCS_CLERICAL | /api/scale-site-risk-assessments/search?riskLevel=H |
      | SCS_CLERICAL | /api/scalers/001B/risk-ratings                 |
      | SCS_CLERICAL | /api/scale-sites/520/risk-ratings              |

    Examples: SCS_BRANCH_SYS_SUPPORT — sampled across the matrix sections
      | role                   | endpoint                                 |
      | SCS_BRANCH_SYS_SUPPORT | /api/welcome                             |
      | SCS_BRANCH_SYS_SUPPORT | /api/clients/search?clientNumber=00001110 |
      | SCS_BRANCH_SYS_SUPPORT | /api/scalers/001B                        |
      | SCS_BRANCH_SYS_SUPPORT | /api/scale-sites/520/summary             |
      | SCS_BRANCH_SYS_SUPPORT | /api/scale-sites/inspection/322429       |
      | SCS_BRANCH_SYS_SUPPORT | /api/mark-site-designations/1101         |
      | SCS_BRANCH_SYS_SUPPORT | /api/scaler-authorizations/workbench     |

    Examples: SCS_REGIONAL_MANAGER — sampled across the matrix sections
      | role                 | endpoint                                 |
      | SCS_REGIONAL_MANAGER | /api/welcome                             |
      | SCS_REGIONAL_MANAGER | /api/clients/search?clientNumber=00001110 |
      | SCS_REGIONAL_MANAGER | /api/scalers/001B                        |
      | SCS_REGIONAL_MANAGER | /api/scale-sites/520/summary             |
      | SCS_REGIONAL_MANAGER | /api/scale-sites/inspection/322429       |
      | SCS_REGIONAL_MANAGER | /api/mark-site-designations/1101         |
      | SCS_REGIONAL_MANAGER | /api/scaler-authorizations/workbench     |

  # THE ALLOW PAIRING, and the assertion this suite would be hollow without: the same reads are REFUSED
  # for a role that holds nothing. Without it, an ungated endpoint reads exactly like a granted one.
  @p0
  Scenario Outline: <endpoint> is allowed for this column and refused for a caller with no roles
    When I call "GET" "<endpoint>" as the "SCS_CLERICAL" role
    Then the API should allow it
    When I call "GET" "<endpoint>" as a caller with no roles
    Then the same call should be refused for a caller with no roles

    Examples: one per matrix section
      | endpoint                                  |
      | /api/clients/search?clientNumber=00001110 |
      | /api/scalers/001B                         |
      | /api/scale-sites/520/summary              |
      | /api/scale-sites/inspection/322429        |
      | /api/mark-site-designations/1101          |
      | /api/scaler-authorizations/147851         |
      | /api/scaler-authorizations/workbench      |

  # ---------------------------------------------------------------------------------------------
  # Refused reads.

  @p0
  Scenario Outline: <endpoint> is refused for <role>
    When I call "GET" "<endpoint>" as the "<role>" role
    Then the API should refuse it
    When I call "GET" "<endpoint>" as a system administrator
    Then the same call should succeed for a system administrator

    # THE TAB/RECORD SPLIT at the level that enforces it — judgement call (2). CHECK_SCALE_QUERY is
    # withheld (§I is "-"), so the check-scale record and its unscoped lookup-by-number are closed, while
    # SCALER_CHECK_SCALE_QUERY and SCALE_SITE_CHECK_SCALE_QUERY keep both history tabs open (allowed
    # above: /api/scale-sites/520/check-scales). The two live side by side on purpose.
    Examples: the check-scale record — withheld while both check-scale tabs are allowed
      | role                   | endpoint                                    |
      | SCS_CLERICAL           | /api/check-scales/search?checkScaleId=145988 |
      | SCS_BRANCH_SYS_SUPPORT | /api/check-scales/search?checkScaleId=145988 |
      | SCS_REGIONAL_MANAGER   | /api/check-scales/search?checkScaleId=145988 |

    Examples: reference-data maintenance — every §J row is "-"
      | role         | endpoint                        |
      | SCS_CLERICAL | /api/inspection-questions       |
      | SCS_CLERICAL | /api/conditions                 |
      | SCS_CLERICAL | /api/appointment-types          |
      | SCS_CLERICAL | /api/auth-clauses               |
      | SCS_CLERICAL | /api/exam-upgrades              |
      | SCS_CLERICAL | /api/scale-auth-templates       |
      | SCS_CLERICAL | /api/valid-licence-attributes   |
      | SCS_CLERICAL | /api/signature-blocks           |

    # Not §J: the letter pages' signatory picker (LETTER_SIGNATORY_QUERY), held only by roles with a
    # _LETTER_CREATE verb. Added with it (nr-scs #286 follow-up) so the lookup cannot leak past them.
    Examples: the letter signatory picker — no letter to compose, for any of the three
      | role                   | endpoint                     |
      | SCS_CLERICAL           | /api/letter-signature-blocks |
      | SCS_BRANCH_SYS_SUPPORT | /api/letter-signature-blocks |
      | SCS_REGIONAL_MANAGER   | /api/letter-signature-blocks |

  # ---------------------------------------------------------------------------------------------
  # Refused WRITES, proven without sending a body.
  #
  # A bodyless POST/PUT cannot prove anything: `@RequiresPermission` is method security, an AOP
  # interceptor around the handler, so binding and bean validation run BEFORE it — a bodyless write is
  # rejected by the binder at the same status an administrator gets, whether the role was denied or
  # wrongly granted.
  #
  # The create/edit INIT endpoints are GETs gated on the CREATE and UPDATE permissions, which makes them
  # body-free proof of two write permissions with nothing that could mutate. The check-scaler suite
  # measured both at 200 for a role that holds them, so a 403 here is authorization doing its job.

  @p0
  Scenario Outline: <endpoint> is refused for <role> — a write permission this column does not hold
    When I call "GET" "<endpoint>" as the "<role>" role
    Then the API should refuse it
    When I call "GET" "<endpoint>" as a system administrator
    Then the same call should succeed for a system administrator

    Examples: §H Site Inspection – Create CR (init) and Site Inspection RU (edit init)
      | role                   | endpoint                                                                       |
      | SCS_CLERICAL           | /api/scale-sites/520/inspections/create?inspectionTypeCode=MIN&siteTypeCodes=W |
      | SCS_CLERICAL           | /api/scale-sites/inspection/322429/edit                                        |
      | SCS_BRANCH_SYS_SUPPORT | /api/scale-sites/520/inspections/create?inspectionTypeCode=MIN&siteTypeCodes=W |
      | SCS_REGIONAL_MANAGER   | /api/scale-sites/inspection/322429/edit                                        |

  # The destructive verb, asserted with a READ-BACK rather than on the status alone. A refusal reported
  # while the row was deleted anyway is the one outcome a status code cannot see.
  #
  # Deliberately NOT paired with an administrator: the contrast for a write denial is carried by the
  # init-GET pair above, which is safe to run as an administrator. Running this one as an administrator
  # would delete a pinned anchor every other suite depends on.
  @p0
  Scenario: A delete is refused and the record survives it
    When I call "DELETE" "/api/scalers/001B" as the "SCS_CLERICAL" role
    Then the API should refuse it
    And the scaler record should still exist

  # ---------------------------------------------------------------------------------------------
  # The status contract, pinned once. See this file's header for why it is one scenario and not a column
  # on every deny row.
  @p1
  Scenario: A permission denial answers 403 rather than a server error
    When I call "GET" "/api/inspection-questions" as the "SCS_CLERICAL" role
    Then the API should refuse it with 403

  # ---------------------------------------------------------------------------------------------
  # THE EQUALITY CLAIM, asserted end to end rather than inferred from three passing outlines.
  #
  # `RolePermissionsTest` asserts the three sets are equal in Java. This asserts the same thing over
  # HTTP, on both sides of the boundary — a granted read, a withheld one, and the write init. If a real
  # requirement ever separates these columns, this is the scenario that says so.
  @p0
  Scenario Outline: All three roles answer identically on <endpoint>
    Then all three read-only internal roles should agree on "GET" "<endpoint>"

    Examples:
      | endpoint                                                                       |
      | /api/scalers/001B                                                              |
      | /api/scale-sites/520/summary                                                    |
      | /api/scaler-authorizations/workbench                                            |
      | /api/check-scales/search?checkScaleId=145988                                    |
      | /api/inspection-questions                                                       |
      | /api/scale-sites/520/inspections/create?inspectionTypeCode=MIN&siteTypeCodes=W  |
