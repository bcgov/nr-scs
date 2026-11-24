# Spec: the roles & permissions matrix §A (Work Bench) + §I (Check Scale)
#       › RolePermissions.checkScaler() / .scalingManagerColumn() / .readOnlyInternalColumn()
#       › @RequiresPermission on each handler › THIS FILE
#
# THE VERBS FOUR SUITES COULD NOT PROBE.
#
# `@RequiresPermission` is method security — an AOP interceptor around the handler — so body binding and
# bean validation run BEFORE it. A body-less or malformed write is rejected by the binder at 400 without
# authorization ever being consulted, which makes "refused" true for EVERY role, including one that
# holds the permission. So these verbs were recorded as untestable rather than asserted wrongly:
#
#   check-scaler-role        CG-2 — CHECK_SCALE_UPDATE, SUMMARY_CHECK_SCALE_*, WORKBENCH_CREATE/UPDATE
#   read-only-internal-roles CG-2 — Work Bench renew verbs "absent rather than refused"
#   dist-manager-role        CG-2 — the same, inherited
#   scaling-manager-roles    CG-2 — WORKBENCH_CREATE/UPDATE "held here but unproven"
#
# Two findings unblock them, and both were simply not looked for:
#
#   1. The Work Bench renew and remove endpoints take NO REQUEST BODY — only a path variable. They reach
#      authorization unaided and always did. The blocking reason ("no body-free gated endpoint") was
#      mistaken.
#   2. A bindable body for the two check-scale updates does exist; it just has to satisfy bean
#      validation completely. See `write-verb-test-data.ts` for the two values that make it work and
#      why each one is easy to get wrong.
#
# NOTHING HERE CAN MUTATE. Every probe targets id 99999999, which exists in no table: authorization is
# the only thing that can succeed, and the handler then fails to find the row. That is what lets a write
# permission be asserted against a shared seed DB at all.
#
# READING THE STATUSES:
#   403 → refused at authorization        404 → past authorization, row not found
#   500 → past authorization, the stored procedure threw on the missing row (the renew endpoints)
# The allow side asserts NOT 403 rather than a pinned status, because which of 404 / 500 a missing row
# produces is the handler's business and not the permission layer's. The deny side pins 403 exactly.
@sec @SEC-11 @cross-cutting @write-verbs
Feature: Cross-cutting — write verbs no single-role suite could probe

  # ---------------------------------------------------------------- §A Work Bench
  #
  # WORKBENCH_CREATE gates the three renew endpoints; WORKBENCH_UPDATE gates workbench/remove.
  # Held by CHK and the scaling manager column; withheld from the read-only internal column, which is
  # granted the Work Bench as `R (ltd)` — read, no renew.

  @p0
  Scenario Outline: <role> may renew from the Work Bench
    When I probe "POST" "/api/scaler-authorizations/99999999/renew" with an inert body as the "<role>" role
    Then the call should pass authorization rather than be refused

    Examples: columns holding WORKBENCH_CREATE
      | role                          |
      | SCS_SYS_ADMIN                 |
      | SCS_CHECK_SCALER              |
      | SCS_DIST_SCALING_MANAGER      |
      | SCS_REGIONAL_SCALING_MANAGER  |

  @p0
  Scenario Outline: <role> may not renew from the Work Bench
    When I probe "POST" "/api/scaler-authorizations/99999999/renew" with an inert body as the "<role>" role
    Then the API should refuse it with 403

    Examples: the read-only internal column — Work Bench is R, not CRU
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |
      | SCS_DIST_MANAGER        |
      | SCS_CE_TECHNICIAN       |

  # The designation renew, so the assertion is not resting on one of the three endpoints alone.
  @p1
  Scenario Outline: The designation renew follows the same column as the scaler renew for <role>
    When I probe "POST" "/api/mark-site-designations/99999999/renew" with an inert body as the "<role>" role
    Then the API should refuse it with 403

    Examples: columns without WORKBENCH_CREATE
      | role              |
      | SCS_CLERICAL      |
      | SCS_CE_TECHNICIAN |

  # Its contrast. Without this the two rows above are satisfied by an endpoint that refuses EVERYONE —
  # an unmapped route, say — and would prove nothing about the column. Every other endpoint in this file
  # is paired; this one was not, which is the whole reason the rule is stated rather than assumed.
  @p1
  Scenario Outline: <role> may renew a designation from the Work Bench
    When I probe "POST" "/api/mark-site-designations/99999999/renew" with an inert body as the "<role>" role
    Then the call should pass authorization rather than be refused

    Examples: columns holding WORKBENCH_CREATE
      | role                     |
      | SCS_SYS_ADMIN            |
      | SCS_DIST_SCALING_MANAGER |

  @p1
  Scenario Outline: <role> may remove an item from the Work Bench
    When I probe "POST" "/api/scaler-authorizations/99999999/workbench/remove" with an inert body as the "<role>" role
    Then the call should pass authorization rather than be refused

    Examples: columns holding WORKBENCH_UPDATE
      | role                     |
      | SCS_SYS_ADMIN            |
      | SCS_CHECK_SCALER         |
      | SCS_DIST_SCALING_MANAGER |

  @p1
  Scenario: The read-only internal column may not remove an item from the Work Bench
    When I probe "POST" "/api/scaler-authorizations/99999999/workbench/remove" with an inert body as the "SCS_CLERICAL" role
    Then the API should refuse it with 403

  # ---------------------------------------------------------------- §I check-scale updates
  #
  # The bindable-body half. Both bodies are complete and valid, so a 403 here is an authorization
  # decision and nothing else.

  @p0
  Scenario Outline: <role> may update a check scale
    When I probe "PUT" "/api/check-scales/99999999" with an inert body as the "<role>" role
    Then the call should pass authorization rather than be refused

    Examples: columns holding CHECK_SCALE_UPDATE
      | role                     |
      | SCS_SYS_ADMIN            |
      | SCS_CHECK_SCALER         |
      | SCS_DIST_SCALING_MANAGER |

  @p0
  Scenario Outline: <role> may not update a check scale
    When I probe "PUT" "/api/check-scales/99999999" with an inert body as the "<role>" role
    Then the API should refuse it with 403

    Examples: the read-only internal column — §I is `-` throughout
      | role                    |
      | SCS_CLERICAL            |
      | SCS_BRANCH_SYS_SUPPORT  |
      | SCS_REGIONAL_MANAGER    |
      | SCS_DIST_MANAGER        |

    # Kept in its own block rather than folded into the read-only column above: those four are refused
    # because §I gives them no `U` in the first place, whereas CET is refused despite §I giving that column
    # `RU`. Same outcome, different reason — one table would bury that.
    #
    # CET became read-only on 2026-09-02 under the client's spec — "No where in the app should they be
    # able to edit, delete or create something". `RolePermissions.ceTechnician()` is now a flat
    # `Set.of(...)` with no CREATE, UPDATE or DELETE at all, where it previously inherited twelve write
    # verbs from `fieldStaffColumn()` (check scales, summary check scales, inspections, performance
    # remarks, and both risk-assessment subjects). Pinned by `RolePermissionsTest`, so it is a deliberate
    # spec change rather than a refactor slip.
    Examples: the C&E Technician column — read-only by the client's spec, against §I's `RU`
      | role              |
      | SCS_CE_TECHNICIAN |

  @p0
  Scenario Outline: <role> may update a summary check scale
    When I probe "PUT" "/api/summary-check-scales/99999999" with an inert body as the "<role>" role
    Then the call should pass authorization rather than be refused

    Examples: summary check scales are governed by §I's Check Scale rows
      | role                     |
      | SCS_SYS_ADMIN            |
      | SCS_CHECK_SCALER         |
      | SCS_DIST_SCALING_MANAGER |

  @p0
  Scenario: The read-only internal column may not update a summary check scale
    When I probe "PUT" "/api/summary-check-scales/99999999" with an inert body as the "SCS_CLERICAL" role
    Then the API should refuse it with 403

  # ---------------------------------------------------------------- §I the deletes
  #
  # The `D` in §I appears ONLY in ADM's "Check Scale" `RUD` row. Every other column — including the
  # Check Scaler, which holds create and update on the same record — is denied it. That asymmetry is
  # the sharpest thing in this file, and a DELETE needs no body, so it was always probeable.

  @p0
  Scenario: An administrator may delete a check scale
    When I probe "DELETE" "/api/check-scales/99999999" with an inert body as the "SCS_SYS_ADMIN" role
    Then the call should pass authorization rather than be refused

  @p0
  Scenario Outline: <role> may not delete a check scale, though it may create and update one
    When I probe "DELETE" "/api/check-scales/99999999" with an inert body as the "<role>" role
    Then the API should refuse it with 403

    # CET is here for a different reason than the two above it: since 2026-09-02 it holds no check-scale
    # write at all, so its denial is the client's read-only rule rather than §I's missing `D`.
    Examples: every non-administrator column, including those holding CHECK_SCALE_UPDATE
      | role                     |
      | SCS_CHECK_SCALER         |
      | SCS_DIST_SCALING_MANAGER |
      | SCS_CE_TECHNICIAN        |
      | SCS_CLERICAL             |

  @p0
  Scenario: An administrator may delete a summary check scale
    When I probe "DELETE" "/api/summary-check-scales/99999999" with an inert body as the "SCS_SYS_ADMIN" role
    Then the call should pass authorization rather than be refused

  @p0
  Scenario Outline: <role> may not delete a summary check scale
    When I probe "DELETE" "/api/summary-check-scales/99999999" with an inert body as the "<role>" role
    Then the API should refuse it with 403

    Examples: SUMMARY_CHECK_SCALE_DELETE is administrator-only
      | role                     |
      | SCS_CHECK_SCALER         |
      | SCS_DIST_SCALING_MANAGER |
      | SCS_CLERICAL             |
