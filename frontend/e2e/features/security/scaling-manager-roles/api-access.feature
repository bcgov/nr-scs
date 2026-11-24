# Spec: roles-permissions.md §3 columns `DSM` and `RSM` › RolePermissions.scalingManagerColumn()
#       › @RequiresPermission › THIS FILE
#
# LEVEL 3 of 3 — API. The only level here that carries a security assertion.
#
# ── THE CONTRAST INVERTS FOR THIS COLUMN ───────────────────────────────────────────────────────────
# For a narrow column, an administrator proves a denied endpoint exists. This column is denied almost
# nothing, so that pairing carries no information — both callers hold the permission.
#
# So the pairings here are:
#   * ALLOW rows → the ROLELESS SENTINEL (`X-Mock-Roles: none`), which proves the endpoint is gated at all
#     rather than open to anyone. Not a role that happens to hold nothing: all eleven roles are enabled,
#     and two suites were invalidated by trying one (read-only suite defects V1, V6).
#   * The cells that DISTINGUISH this column → `SCS_CLERICAL`, a narrow enabled role. Same call, two
#     enabled internal roles, opposite outcomes. That is the sharpest available evidence that a specific
#     permission is being read rather than the endpoint being ungated.
#   * The ONE denial → an administrator, proving the endpoint works.
#
# ── WHY THERE ARE NO BODY-CARRYING WRITE PROBES ────────────────────────────────────────────────────
# `@RequiresPermission` is method security, an AOP interceptor around the handler, so binding and bean
# validation run BEFORE it — a bodyless POST/PUT answers the same status for every caller and proves
# nothing. This column holds nearly every write in the application, so a crafted body that reached
# authorization would then reach a handler able to mutate shared seed data. The writes are therefore
# proven through the body-free gated init GETs and through one PATCH aimed at a nonexistent record.
@sec @SEC-10 @DSM @RSM @scaling-manager
Feature: Scaling manager column — API access

  # ---------------------------------------------------------------------------------------------
  # Allowed reads, across every matrix section.

  @p0
  Scenario Outline: <endpoint> is allowed for <role>
    When I call "GET" "<endpoint>" as the "<role>" role
    Then the API should allow it

    Examples: SCS_DIST_SCALING_MANAGER — the breadth of the column
      | role                     | endpoint                                            |
      | SCS_DIST_SCALING_MANAGER | /api/welcome                                        |
      | SCS_DIST_SCALING_MANAGER | /api/static-lov                                     |
      | SCS_DIST_SCALING_MANAGER | /api/clients/search?clientNumber=00001110           |
      | SCS_DIST_SCALING_MANAGER | /api/scalers/001B                                   |
      | SCS_DIST_SCALING_MANAGER | /api/scale-sites/520/summary                        |
      | SCS_DIST_SCALING_MANAGER | /api/scale-sites/inspection/322429                  |
      | SCS_DIST_SCALING_MANAGER | /api/mark-site-designations/1101                    |
      | SCS_DIST_SCALING_MANAGER | /api/scaler-authorizations/147851                   |
      | SCS_DIST_SCALING_MANAGER | /api/scaler-authorizations/workbench                |
      | SCS_DIST_SCALING_MANAGER | /api/check-scales/search?checkScaleId=145988        |
      | SCS_DIST_SCALING_MANAGER | /api/scaler-risk-assessments/search?riskLevel=M     |
      | SCS_DIST_SCALING_MANAGER | /api/scale-site-risk-assessments/search?riskLevel=H |
      | SCS_DIST_SCALING_MANAGER | /api/inspection-questions                           |
      | SCS_DIST_SCALING_MANAGER | /api/conditions                                     |
      | SCS_DIST_SCALING_MANAGER | /api/appointment-types                              |
      | SCS_DIST_SCALING_MANAGER | /api/auth-clauses                                   |
      | SCS_DIST_SCALING_MANAGER | /api/exam-upgrades                                  |
      | SCS_DIST_SCALING_MANAGER | /api/scale-auth-templates                           |
      | SCS_DIST_SCALING_MANAGER | /api/valid-licence-attributes                       |
      | SCS_DIST_SCALING_MANAGER | /api/signature-blocks                               |

    Examples: SCS_REGIONAL_SCALING_MANAGER — sampled; the equality scenario below carries the rest
      | role                         | endpoint                                        |
      | SCS_REGIONAL_SCALING_MANAGER | /api/welcome                                    |
      | SCS_REGIONAL_SCALING_MANAGER | /api/scalers/001B                               |
      | SCS_REGIONAL_SCALING_MANAGER | /api/scaler-risk-assessments/search?riskLevel=M |
      | SCS_REGIONAL_SCALING_MANAGER | /api/scale-auth-templates                       |
      | SCS_REGIONAL_SCALING_MANAGER | /api/signature-blocks                           |

    # The letter pages' signatory picker (LETTER_SIGNATORY_QUERY), which comes with this column's
    # _LETTER_CREATE verbs. Separate from §J's /api/signature-blocks above (nr-scs #286 follow-up).
    Examples: the letter signatory picker — both scaling managers compose letters
      | role                         | endpoint                     |
      | SCS_DIST_SCALING_MANAGER     | /api/letter-signature-blocks |
      | SCS_REGIONAL_SCALING_MANAGER | /api/letter-signature-blocks |

  # THE ALLOW PAIRING. Without it an ungated endpoint reads exactly like a granted one — and this column
  # holds so much that an ungated endpoint would hide here more easily than anywhere else.
  @p0
  Scenario Outline: <endpoint> is an allowed READ, and refused for a caller with no roles
    When I call "GET" "<endpoint>" as the "SCS_DIST_SCALING_MANAGER" role
    Then the API should allow it
    When I call "GET" "<endpoint>" as a caller with no roles
    Then the same call should be refused for a caller with no roles

    Examples: one per matrix section
      | endpoint                                        |
      | /api/scalers/001B                               |
      | /api/scale-sites/520/summary                    |
      | /api/check-scales/search?checkScaleId=145988    |
      | /api/scaler-risk-assessments/search?riskLevel=M |
      | /api/scale-auth-templates                       |
      | /api/signature-blocks                           |

    Examples: the letter signatory picker
      | endpoint                                        |
      | /api/letter-signature-blocks                    |

  # THE CELLS THAT DISTINGUISH THIS COLUMN, contrasted against a narrow enabled role. Same call, two
  # enabled internal roles, opposite outcomes — the sharpest evidence available that these specific
  # permissions are read.
  @p0
  Scenario Outline: <endpoint> is allowed here and refused for a read-only internal role
    When I call "GET" "<endpoint>" as the "SCS_DIST_SCALING_MANAGER" role
    Then the API should allow it
    When I call "GET" "<endpoint>" as the "SCS_CLERICAL" role
    Then the API should refuse it with 403

    # The risk endpoints are deliberately NOT in this table. Since `dbf826c` the read-only column holds
    # the risk query/read verbs too, so a risk row here would assert a denial that no longer happens —
    # it discriminates nothing. What still separates the columns is the check-scale record and the
    # maintenance areas.
    Examples: the check-scale record and maintenance — none reachable by CLE
      | endpoint                                     |
      | /api/check-scales/search?checkScaleId=145988 |
      | /api/scale-auth-templates                    |
      | /api/conditions                              |
      | /api/exam-upgrades                           |
      | /api/signature-blocks                        |

    Examples: the letter signatory picker — CLE composes no letter
      | endpoint                                     |
      | /api/letter-signature-blocks                 |

  # ---------------------------------------------------------------------------------------------
  # Allowed WRITES, proven without a body that could mutate anything.

  @p0
  Scenario Outline: <endpoint> is an allowed WRITE init, and refused for a caller with no roles
    When I call "GET" "<endpoint>" as the "SCS_DIST_SCALING_MANAGER" role
    Then the API should allow it
    When I call "GET" "<endpoint>" as a caller with no roles
    Then the same call should be refused for a caller with no roles

    Examples: §H the inspection create and edit inits, both gated on write permissions
      | endpoint                                                                       |
      | /api/scale-sites/520/inspections/create?inspectionTypeCode=MIN&siteTypeCodes=W |
      | /api/scale-sites/inspection/322429/edit                                        |

  # The licence-cancel write, aimed at a licence no scaler holds so authorization runs and the service then
  # fails to load the row. Held by this column alongside SCALER_UPDATE, unlike `DM` which holds the cancel
  # without the update.
  @p0
  Scenario: The licence-cancel endpoint passes authorization for this column
    When I patch the licence-cancelled date as the "SCS_DIST_SCALING_MANAGER" role
    Then the call should pass authorization rather than be refused

  # ---------------------------------------------------------------------------------------------
  # THE ONE DENIAL. §J's Maintain System row is "-", so MAINTAIN_SYSTEM_READ, _UPDATE and SYSTEM_ADMIN
  # stay with the administrator alone. `WMSG` is the key the maintenance screen itself reads.

  @p0
  Scenario Outline: The system setting is refused for <role>
    When I call "GET" "/api/system-settings/WMSG" as the "<role>" role
    Then the API should refuse it with 403
    When I call "GET" "/api/system-settings/WMSG" as a system administrator
    Then the same call should succeed for a system administrator

    Examples:
      | role                         |
      | SCS_DIST_SCALING_MANAGER     |
      | SCS_REGIONAL_SCALING_MANAGER |

  # The deletes this column does NOT hold. §C's "Summary – Edit" is RU against the administrator's RUD, so
  # the column authors the scaler it cannot destroy. Asserted with a read-back, because a refusal reported
  # while the row was deleted anyway is the one outcome a status code cannot see.
  @p0
  Scenario: A scaler delete is refused and the record survives it
    When I call "DELETE" "/api/scalers/001B" as the "SCS_DIST_SCALING_MANAGER" role
    Then the API should refuse it
    And the scaler record should still exist

  # ---------------------------------------------------------------------------------------------
  # THE EQUALITY CLAIM, asserted over HTTP rather than inferred from two passing outlines.
  #
  # `RolePermissions` maps both roles to `scalingManagerColumn()` verbatim; §3 separates them only by
  # `(dist)` against `(rgn)`, which is org-unit breadth, not a permission letter. So they must answer identically
  # today — on a granted read, a granted write init, and the one denial. When reg/dist scoping lands they
  # will diverge, and this is the scenario that says so.
  @p0
  Scenario Outline: Both scaling manager roles answer identically on <endpoint>
    Then both scaling manager roles should agree on "GET" "<endpoint>"

    Examples:
      | endpoint                                                                       |
      | /api/scalers/001B                                                              |
      | /api/scaler-risk-assessments/search?riskLevel=M                                |
      | /api/scale-auth-templates                                                      |
      | /api/signature-blocks                                                          |
      | /api/scale-sites/520/inspections/create?inspectionTypeCode=MIN&siteTypeCodes=W  |
      | /api/system-settings/WMSG                                                      |
