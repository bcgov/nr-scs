# Spec: roles-permissions.md §3 column `CET` + §4 › RolePermissions.ceTechnician()
#       › @RequiresPermission › THIS FILE
#
# LEVEL 3 of 3 — API. The only level here that carries a security assertion.
#
# ── TWO PAIRINGS, BECAUSE THIS COLUMN HAS BOTH SHAPES ──────────────────────────────────────────────
#   * DENY rows pair with an administrator, proving the endpoint exists and works.
#   * ALLOW rows pair with the ROLELESS SENTINEL (`X-Mock-Roles: none`), proving a 200 is authorization
#     passing rather than an ungated endpoint. Not a role that happens to hold nothing — all eleven roles
#     are enabled now, and two suites were invalidated by trying one (read-only suite defects V1, V6).
#
# ── WRITES ARE PROVEN BODY-FREE ────────────────────────────────────────────────────────────────────
# `@RequiresPermission` is method security, an AOP interceptor around the handler, so binding and bean
# validation run BEFORE it: a bodyless POST/PUT is rejected by the binder at the same status an
# administrator gets, whether the role was denied or wrongly granted. The create/edit INIT endpoints are
# GETs gated on the CREATE and UPDATE permissions, which makes them body-free proof of a write with
# nothing that could mutate. The check-scaler suite measured both inspection inits at 200 for a role that
# holds them.
#
# ── READ-ONLY SINCE 2026-09-02, AND THE LETTER SPLIT ───────────────────────────────────────────────
# The client's spec made this column read-only everywhere, so the init GETs that used to prove its writes
# now prove its denials instead — same endpoints, opposite table. They are the sharpest rows in the file,
# because §3's §H and §I still grant them on paper.
#
# The one thing this column gains is the LETTER VIEW. The old single `_LETTER` verb gated both the POST
# that composes a letter and the GET that fetches the stored one; the spec gives `CET` the second without
# the first, so the verb was split. The GET is the only place that split is observable — the composer is
# a POST with a body, which this suite cannot use as deny evidence for the reason above.
@sec @SEC-10 @CET @ce-technician
Feature: C&E Technician — API access

  # ---------------------------------------------------------------------------------------------
  # Allowed reads.

  @p0
  Scenario Outline: <endpoint> is allowed
    When I call "GET" "<endpoint>" as the "SCS_CE_TECHNICIAN" role
    Then the API should allow it

    Examples: §A/§B/§C/§D reads
      | endpoint                                  |
      | /api/welcome                              |
      | /api/static-lov                           |
      | /api/clients/search?clientNumber=00001110 |
      | /api/scalers/001B                         |
      | /api/scale-sites/520/summary              |
      | /api/scale-sites/520/contacts             |
      | /api/scale-sites/520/inspections          |
      | /api/scale-sites/520/check-scales         |
      | /api/scale-sites/520/software             |
      | /api/scale-sites/inspection/322429        |
      | /api/mark-site-designations/1101          |
      | /api/scaler-authorizations/147851         |

    # §I's READ row is R for this column and "-" for the read-only one, so the check-scale RECORD is
    # open here — the direct inverse of that suite's sharpest denial, and the one §I cell the client's
    # read-only rule left standing.
    Examples: §I the check-scale record, which the read-only column is refused
      | endpoint                                     |
      | /api/check-scales/search?checkScaleId=145988 |

    # THE ONLY §J CELL GRANTED TO ANY NON-ADMINISTRATOR COLUMN.
    Examples: §J Maintain Questions R
      | endpoint                  |
      | /api/inspection-questions |

    # READ verbs only. The client's 2026-09-02 spec names CHK/ADM/RSM/DSM as the create roles and puts
    # every other column on read, which withdrew this one's create and update — see the deny table below.
    Examples: risk assessment — read verbs on both subjects
      | endpoint                                            |
      | /api/scaler-risk-assessments/search?riskLevel=M     |
      | /api/scale-site-risk-assessments/search?riskLevel=H |
      | /api/scalers/001B/risk-ratings                      |
      | /api/scale-sites/520/risk-ratings                   |

  # THE ALLOW PAIRING. Without it an ungated endpoint reads exactly like a granted one.
  @p0
  Scenario Outline: <endpoint> is an allowed READ, and refused for a caller with no roles
    When I call "GET" "<endpoint>" as the "SCS_CE_TECHNICIAN" role
    Then the API should allow it
    When I call "GET" "<endpoint>" as a caller with no roles
    Then the same call should be refused for a caller with no roles

    Examples: one per matrix section, including the two cells unique to this column
      | endpoint                                     |
      | /api/scalers/001B                            |
      | /api/scale-sites/520/summary                 |
      | /api/scale-sites/inspection/322429           |
      | /api/check-scales/search?checkScaleId=145988 |
      | /api/inspection-questions                    |

  # THE TWO CELLS THAT MAKE THIS COLUMN DIFFERENT, contrasted against the column that is otherwise its
  # nearest read-only neighbour. Same call, two enabled internal roles, opposite outcomes — that is what
  # proves the permission is being read rather than the endpoint being open or broken.
  @p0
  Scenario Outline: <endpoint> is allowed here and refused for a read-only internal role
    When I call "GET" "<endpoint>" as the "SCS_CE_TECHNICIAN" role
    Then the API should allow it
    When I call "GET" "<endpoint>" as the "SCS_CLERICAL" role
    Then the API should refuse it with 403

    Examples:
      | endpoint                                     |
      | /api/check-scales/search?checkScaleId=145988 |
      | /api/inspection-questions                    |

  # ---------------------------------------------------------------------------------------------
  # THE LETTER SPLIT. `CET` is the only column that may open a letter someone else composed without being
  # able to compose one, so the view half is asserted here against the read-only internal column, which
  # holds neither. The GET is body-free and reaches authorization, and the administrator answers the same
  # non-403 status on a record with no stored letter — which is what rules out a broken route as the
  # explanation for the `CET` result.
  #
  # No advisory-letter row: SCS stores no advisory letter and exposes no GET for one, so
  # `CHECK_SCALE_ADVISORY_LETTER_CREATE` has no view counterpart and this column reaches no advisory
  # letter at all. That absence is asserted on the composer ROUTE in url-access.feature.
  @p0
  Scenario Outline: <endpoint> passes authorization here and is refused for a read-only internal role
    When I call "GET" "<endpoint>" as the "SCS_CE_TECHNICIAN" role
    Then the API should not refuse it on authorization
    When I call "GET" "<endpoint>" as the "SCS_CLERICAL" role
    Then the API should refuse it with 403

    Examples: the stored letter — `_LETTER_VIEW` granted, `_LETTER_CREATE` withheld
      | endpoint                                  |
      | /api/scaler-authorizations/147851/letter  |
      | /api/mark-site-designations/1101/letter   |

  # ---------------------------------------------------------------------------------------------
  # Refused.

  @p0
  Scenario Outline: <endpoint> is refused
    When I call "GET" "<endpoint>" as the "SCS_CE_TECHNICIAN" role
    Then the API should refuse it
    When I call "GET" "<endpoint>" as a system administrator
    Then the same call should succeed for a system administrator

    # §A is "-" for this column. All three queues, because the Work Bench is the single largest thing
    # separating it from CHK and from the read-only column, both of which read all three.
    Examples: the Work Bench — refused on every queue
      | endpoint                                 |
      | /api/scaler-authorizations/workbench     |
      | /api/scale-site-authorizations/workbench |
      | /api/mark-site-designations/workbench    |

    Examples: every §J area but Questions
      | endpoint                      |
      | /api/conditions               |
      | /api/appointment-types        |
      | /api/auth-clauses             |
      | /api/exam-upgrades            |
      | /api/scale-auth-templates     |
      | /api/valid-licence-attributes |
      | /api/signature-blocks         |

    # Not §J: the letter pages' signatory picker (LETTER_SIGNATORY_QUERY), held only by roles with a
    # _LETTER_CREATE verb. Added with it (nr-scs #286 follow-up) so the lookup cannot leak past them.
    # This column holds the three _LETTER_VIEW verbs but no _LETTER_CREATE, so it never opens a picker.
    Examples: the letter signatory picker — no letter to compose
      | endpoint                      |
      | /api/letter-signature-blocks  |

    # WITHDRAWN 2026-09-02, and the sharpest rows in this file: both were in the ALLOWED table until the
    # client's read-only rule, and §3's §H still grants them. They are the gated init GETs, so they are
    # body-free proof of a write with nothing that could mutate — the same evidence, now for the denial.
    Examples: §H site inspection — the create and edit inits, refused since the client's rule
      | endpoint                                                                       |
      | /api/scale-sites/520/inspections/create?inspectionTypeCode=MIN&siteTypeCodes=W |
      | /api/scale-sites/inspection/322429/edit                                        |

    # Same shape on the risk side: the create-init GETs are gated on `_ASSESSMENT_CREATE`, which this
    # column no longer holds, while the searches and rating reads above stay open.
    Examples: risk assessment — the create inits, refused while the reads are allowed
      | endpoint                                            |
      | /api/scalers/001B/risk-assessments/create-init      |
      | /api/scale-sites/520/risk-assessments/create-init   |

  # The destructive verb, asserted with a READ-BACK rather than on the status alone. §C has no scaler
  # delete row for this column, and a refusal reported while the row was deleted anyway is the one outcome
  # a status code cannot see.
  @p0
  Scenario: A scaler delete is refused and the record survives it
    When I call "DELETE" "/api/scalers/001B" as the "SCS_CE_TECHNICIAN" role
    Then the API should refuse it
    And the scaler record should still exist

  # The status contract, pinned once. See the read-only suite's api-access header for why this is one
  # scenario rather than a column on every deny row.
  @p1
  Scenario: A permission denial answers 403 rather than a server error
    When I call "GET" "/api/scaler-authorizations/workbench" as the "SCS_CE_TECHNICIAN" role
    Then the API should refuse it with 403
