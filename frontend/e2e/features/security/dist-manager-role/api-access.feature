# Spec: roles-permissions.md §3 column `DM` + §4 › RolePermissions.districtManager()
#       › @RequiresPermission › THIS FILE
#
# LEVEL 3 of 3 — API. The only level here that carries a security assertion.
#
# ── A DELTA SUITE, SO THE READS ARE SAMPLED ────────────────────────────────────────────────────────
# `DM` = `readOnlyInternalColumn()` ∪ `{SCALER_LICENCE_CANCEL}`. The thirty reads are asserted in full by
# `../read-only-internal-roles/api-access.feature`, including its three-role equality scenario, so this
# file samples them (one per matrix section) and spends its length on the one cell that differs.
#
# ── PROBING A WRITE THAT EXISTS TO MUTATE ──────────────────────────────────────────────────────────
# `SCALER_LICENCE_CANCEL` gates exactly one endpoint:
# `PATCH /api/scalers/{scalerLicenceNo}/licence-cancelled-date` (`ScalerController:85`), whose entire
# purpose is to set or clear a scaler's cancelled date. Probing it against a pinned anchor would cancel a
# real licence on every run.
#
# So it is aimed at `ZZZZ`, a licence no scaler holds. `@RequiresPermission` is an AOP interceptor around
# the handler, so authorization runs BEFORE the service tries to load the row — and the permission is not
# record-scoped for an internal role. A non-403 therefore proves the permission was granted, while the
# service fails to find the record and writes nothing either way.
#
# Asserted as "not 403" rather than a pinned status: the point is that authorization let the call through,
# and coupling it to whichever status a missing record produces would make a security assertion hostage to
# a service-side behaviour that is free to change.
#
# The probe MUST carry a body. `requestBody` is required, and binding runs before authorization, so a
# bodyless PATCH answers 415 for every caller — which satisfied "not 403" and made the first version of
# this scenario pass while proving nothing. Measured with the body: DM 404, SCS_CLERICAL 403, no roles 403.
@sec @SEC-10 @DM @dist-manager
Feature: District Manager — API access

  # ---------------------------------------------------------------------------------------------
  # THE DELTA. The one endpoint that separates this column from the read-only one.

  @p0
  Scenario: The licence-cancel endpoint passes authorization for this column
    When I patch the licence-cancelled date as the "SCS_DIST_MANAGER" role
    Then the call should pass authorization rather than be refused

  # THE PAIRING, in two directions, because either alone can pass for the wrong reason.
  #
  # A caller with no roles shows the endpoint is gated at all rather than open to anyone. A read-only
  # internal role — which holds all thirty of this column's other permissions and NOT this one — shows the
  # 403 tracks this single cell rather than the whole column. The second is the sharper of the two: it is
  # the same call, the same body, two roles differing by exactly one permission.
  @p0
  Scenario: The same call is refused for a caller with no roles
    When I patch the licence-cancelled date as a caller with no roles
    Then the same call should be refused for a caller with no roles

  @p0
  Scenario: The same call is refused for a read-only internal role, which differs by this one cell
    When I patch the licence-cancelled date as the "SCS_CLERICAL" role
    Then the licence-cancel call should be refused with 403

  # ---------------------------------------------------------------------------------------------
  # The read half, sampled — one per matrix section. Full coverage lives in the read-only suite.

  @p1
  Scenario Outline: <endpoint> is allowed, as for the read-only column
    When I call "GET" "<endpoint>" as the "SCS_DIST_MANAGER" role
    Then the API should allow it

    Examples:
      | endpoint                                  |
      | /api/welcome                              |
      | /api/clients/search?clientNumber=00001110 |
      | /api/scalers/001B                         |
      | /api/scale-sites/520/summary              |
      | /api/scale-sites/inspection/322429        |
      | /api/mark-site-designations/1101          |
      | /api/scaler-authorizations/workbench      |
      | /api/scaler-risk-assessments/search?riskLevel=M |

  # Sampled denials, each paired with an administrator. The tab/record split on check scales is included
  # because it is this column's sharpest inherited deny: §I is "-" so the record is closed, while both
  # check-scale TABS stay readable.
  @p1
  Scenario Outline: <endpoint> is refused, as for the read-only column
    When I call "GET" "<endpoint>" as the "SCS_DIST_MANAGER" role
    Then the API should refuse it
    When I call "GET" "<endpoint>" as a system administrator
    Then the same call should succeed for a system administrator

    Examples:
      | endpoint                                     |
      | /api/check-scales/search?checkScaleId=145988 |
      | /api/inspection-questions                    |
      | /api/signature-blocks                        |

    # Not §J: the letter pages' signatory picker (LETTER_SIGNATORY_QUERY), held only by roles with a
    # _LETTER_CREATE verb. Added with it (nr-scs #286 follow-up) so the lookup cannot leak past them.
    Examples: the letter signatory picker — no letter to compose
      | endpoint                                     |
      | /api/letter-signature-blocks                 |

  # The scaler record itself stays read-only: holding the licence-cancel cell must not widen into
  # SCALER_UPDATE or SCALER_DELETE. §3's "Summary – Edit" is "-" for this column, and the scaling-manager
  # columns are the ones that hold SCALER_UPDATE alongside the cancel.
  @p0
  Scenario: The licence-cancel cell does not widen into deleting the scaler
    When I call "DELETE" "/api/scalers/001B" as the "SCS_DIST_MANAGER" role
    Then the API should refuse it
    And the scaler record should still exist
