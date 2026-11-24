# Spec: the roles & permissions matrix §3 column `CHK`
#       › Permissions.java + RolePermissions.checkScaler() › @RequiresPermission on each handler › THIS FILE
#
# LEVEL 3 of 3 — API. What the SERVER allows when the request is made anyway, with no browser involved.
# The other two levels describe an application that declines to OFFER something; this one shows the
# request being REFUSED, which is the difference between a tidy UI and an enforced permission model.
#
# Identity travels in the dev-only X-Mock-Roles header the frontend mock bridge already sends, so each
# call is authorized through the same expandAuthorities → @RequiresPermission path a real request takes
# (see pages/security/ApiAccessProbe.ts). No X-Mock-Client here: the role is internal, so an empty client set
# is its complete identity rather than an under-specified one.
#
# ── THREE ASSERTION SHAPES, NOT TWO ────────────────────────────────────────────────────────────────
# The two read-only columns tested before this one needed "allowed" and "refused". A writing column needs
# a third, because for a WRITE neither status alone is evidence:
#
#   1. READ ALLOWED   — 200. Self-evident; no pairing needed.
#   2. READ REFUSED   — asserted loosely as "refused", with the exact status pinned by ONE scenario at
#                       the foot of this file. That split keeps a regression in how denials are MAPPED to
#                       a single clear failure instead of turning the whole matrix red with one root
#                       cause — which is exactly what industry-scaler Divergence #1 did.
#   3. WRITE          — needs a body, and needs a CONTRAST. Body binding and bean validation run BEFORE
#                       @RequiresPermission (method security is an AOP interceptor around the handler),
#                       so a bodyless POST answers 500 for an administrator, for this role, and for a
#                       welcome-only role alike — measured, see defects.md V2. Every write below
#                       therefore sends a body that binds AND passes bean validation AND then violates a
#                       service-side rule, so it reaches authorization and can never mutate anything.
#
# For a write the column GRANTS, the proof is that the identical call+body is refused with 403 for a
# welcome-only role and is not refused for this one. For a write the column DENIES, it is the mirror: 403
# here, and the administrator reaching the service. Neither direction is assertable without its pair.
@sec @SEC-10 @CHK
Feature: Check Scaler — API access

  # ---------------------------------------------------------------------------------------------
  # Reads the column grants.

  @p0
  Scenario Outline: <method> <endpoint> is allowed
    When I call "<method>" "<endpoint>" as a check scaler
    Then the API should allow it

    Examples: cross-cutting — WELCOME_READ, LOV_READ
      | method | endpoint                 |
      | GET    | /api/welcome             |
      | GET    | /api/region-district-lov |
      | GET    | /api/static-lov          |

    Examples: §B client + §C scaler queries — unscoped, no "(ltd)" on an internal column
      | method | endpoint                                 |
      | GET    | /api/clients/search?clientNumber=00048273 |
      | GET    | /api/scalers/search?clientNumber=00048273 |

    Examples: §C scaler record — Summary R, Address R
      | method | endpoint                    |
      | GET    | /api/scalers/001B           |
      | GET    | /api/scalers/001B/summary   |
      | GET    | /api/scalers/001B/address   |
      | GET    | /api/scalers/001B/tombstone |

    Examples: §C scaler tabs — Authorizations R, Check Scales CR, Exams R, Appointments R, Remarks CRD
      | method | endpoint                               |
      | GET    | /api/scalers/001B/authorizations       |
      | GET    | /api/scaler-authorizations/147851      |
      | GET    | /api/scalers/001B/check-scales         |
      | GET    | /api/scalers/001B/summary-check-scales |
      | GET    | /api/scalers/001B/exams                |
      | GET    | /api/scalers/001B/appointments         |
      | GET    | /api/scalers/001B/performance-remarks  |

    Examples: §D scale site register and record
      | method | endpoint                                    |
      | GET    | /api/scale-sites/search?scaleSiteIdNmbr=520 |
      | GET    | /api/scale-sites/520/summary                |
      | GET    | /api/scale-sites/520/tombstone              |
      | GET    | /api/scale-sites/520/activity-summary       |

    Examples: §D scale site tabs — Contacts R, Site Authorizations R, Authorized Scalers R, Software R
      | method | endpoint                                  |
      | GET    | /api/scale-sites/520/contacts             |
      | GET    | /api/scale-sites/520/authorizations       |
      | GET    | /api/scale-sites/520/authorized-scalers   |
      | GET    | /api/scale-sites/520/software             |
      | GET    | /api/scale-sites/520/mark-site-designations |
      | GET    | /api/scale-sites/520/inspections          |
      | GET    | /api/scale-sites/520/check-scales         |

    Examples: §H site inspection RU, §I check scale search, §F MSD RU
      | method | endpoint                                     |
      | GET    | /api/scale-sites/inspection/322429            |
      | GET    | /api/check-scales/search?checkScaleId=145988  |
      | GET    | /api/mark-site-designations/search?timberMark=%25 |
      | GET    | /api/mark-site-designations/1101              |

    # RISK ASSESSMENT, allowed since `dbf826c`: risk assessment follows the record it hangs off, and this
    # column authors across both records. Asserted refused until then, under the literal reading of §D's
    # lone "Risk Rating Criteria" row.
    Examples: risk assessment — read verbs on both subjects
      | method | endpoint                                            |
      | GET    | /api/scaler-risk-assessments/search?riskTypeCode=M  |
      | GET    | /api/scale-site-risk-assessments/search?riskTypeCode=H |
      | GET    | /api/scalers/001B/risk-ratings                      |
      | GET    | /api/scale-sites/520/risk-ratings                   |

    Examples: §A Work Bench CRU — all three queues
      | method | endpoint                                  |
      | GET    | /api/scaler-authorizations/workbench      |
      | GET    | /api/scale-site-authorizations/workbench  |
      | GET    | /api/mark-site-designations/workbench     |

    # The letter pages' signatory picker (LETTER_SIGNATORY_QUERY, held by every _LETTER_CREATE role).
    # The nr-scs #286 follow-up: the picker used to call /api/signature-blocks, which §J denies this
    # column (refused below), so its letters went out with no signatory. Both rows together are the fix.
    Examples: §3.1.2 letters — the signatory picker, not §J's Maintain Signatories
      | method | endpoint                                 |
      | GET    | /api/letter-signature-blocks             |
      | GET    | /api/letter-signature-blocks?orgUnitNo=1 |

  # ---------------------------------------------------------------------------------------------
  # Reads the column denies.

  @p0
  Scenario Outline: <method> <endpoint> is refused
    When I call "<method>" "<endpoint>" as a check scaler
    Then the API should refuse it


    Examples: reference-data maintenance — every §J row is "-" for CHK
      | method | endpoint                      |
      | GET    | /api/inspection-questions     |
      | GET    | /api/conditions               |
      | GET    | /api/signature-blocks         |
      | GET    | /api/appointment-types        |
      | GET    | /api/auth-clauses             |
      | GET    | /api/valid-licence-attributes |
      | GET    | /api/exam-upgrades            |
      | GET    | /api/scale-auth-templates     |

  # Contrast for the deny table: these are working endpoints. Without this the whole matrix would pass
  # just as happily against a backend that was down.
  @p1
  Scenario Outline: <endpoint> works for a role that holds the permission
    When I call "GET" "<endpoint>" as a system administrator
    Then the same call should succeed for a system administrator

    Examples:
      | endpoint                                          |
      | /api/scaler-risk-assessments/search?riskTypeCode=M |
      | /api/scalers/001B/risk-ratings                    |
      | /api/inspection-questions                         |
      | /api/scale-auth-templates                         |

  # ---------------------------------------------------------------------------------------------
  # Writes the column DENIES. Each carries a body that binds, passes bean validation, and then violates a
  # SERVICE-side rule — so @RequiresPermission is the only thing left that can refuse it, and a wrongful
  # grant still could not mutate anything. See fixtures buildWriteProbeBody for each body's rule.

  @p0
  Scenario Outline: <method> <endpoint> is refused by authorization, not by the body
    When I call "<method>" "<endpoint>" with a bindable body as a check scaler
    Then the API should refuse it with 403

    Examples: §D "Scale Site – Create" and "Scale Site Contact – Create" are "-"
      | method | endpoint                        |
      | POST   | /api/scale-sites                |
      | POST   | /api/scale-sites/520/contacts   |

    Examples: §C "Scaler Exam / Upgrade – Create/Edit" and "– Appointment – Create/Edit" are "-"
      | method | endpoint                          |
      | POST   | /api/scalers/001B/exams           |
      | POST   | /api/scalers/001B/appointments    |

  # The other half of each denial: the SAME body as an administrator reaches the service and dies in its
  # business rule (400/404/422). Without it, a 403 above could equally be a blanket refusal, an unmapped
  # route, or a body the server rejects for every caller.
  @p1
  Scenario Outline: <method> <endpoint> passes authorization for a role that holds the permission
    When I call "<method>" "<endpoint>" with a check-scaler probe body as a system administrator
    Then the same write should pass authorization for a system administrator

    Examples:
      | method | endpoint                        |
      | POST   | /api/scale-sites                |
      | POST   | /api/scale-sites/520/contacts   |
      | POST   | /api/scalers/001B/exams         |
      | POST   | /api/scalers/001B/appointments  |

  # DELETE is separated out because it is body-free, so it reaches authorization unaided — and because it
  # is the one probe that would destroy a pinned anchor if authorization were broken. The status alone
  # cannot see that outcome, so the record is read back. §H has no delete row for ANY column.
  @p0
  Scenario: Deleting a site inspection is refused and the record survives
    When I call "DELETE" "/api/scale-sites/inspection/322429" as a check scaler
    Then the API should refuse it with 403
    And the site inspection should still exist

  # The sharpest cell in this column. CHECK_SCALE_DELETE and SUMMARY_CHECK_SCALE_DELETE are granted to NO
  # column in RolePermissions — only ADM reaches them via ALL_PERMISSIONS — yet §I gives this column CR/RU
  # on the record and the view screen renders it an ENABLED Delete button (asserted in gui-access.feature).
  # So the refusal lands after the click, and only this level can show it. Unlike the anchors above, the
  # target is SEEDED and disposable: the probe cannot know the answer in advance, and a wrongful grant
  # would destroy whatever it was aimed at. The ADM contrast is not repeated here — UC-CHK-004 S01 and
  # UC-CHK-006 S04 already delete both kinds as the administrator, which is what makes these 403s the
  # role's doing rather than a broken endpoint.
  @p0
  Scenario Outline: Deleting a <kind> check scale is refused and the record survives
    When I request deletion of a disposable "<kind>" check scale as a check scaler
    Then the API should refuse it with 403
    And that check scale should still exist

    Examples: §I has no delete row for ANY column
      | kind    |
      | detail  |
      | summary |

  # ---------------------------------------------------------------------------------------------
  # Writes the column GRANTS. The assertion that could not be borrowed from the read-only suites.
  #
  # Read the two steps together: "not refused on authorization" for THIS role is only meaningful because
  # the identical call and body IS refused with 403 for a welcome-only role. One without the other proves
  # nothing, because authorization might never have been consulted for either caller.

  @p0
  Scenario Outline: <method> <endpoint> passes authorization for a check scaler but not for a role without the permission
    When I call "<method>" "<endpoint>" with a bindable body as a check scaler
    Then the API should not refuse it on authorization
    When I call "<method>" "<endpoint>" with a bindable body as a welcome-only role
    Then the same call should be refused for a welcome-only role

    Examples: §F Mark Site Designation – Create CR, §C Performance Remark – Create/Edit CRU
      | method | endpoint                                  |
      | POST   | /api/mark-site-designations               |
      | POST   | /api/scalers/001B/performance-remarks     |

  # The create/edit INIT endpoints are GETs gated on the CREATE and UPDATE permissions, which makes them
  # body-free proof of two write permissions — no crafted body, nothing that could mutate. The welcome-only
  # contrast is what shows the 200 is authorization passing rather than an ungated endpoint.
  @p0
  Scenario Outline: <endpoint> is reachable for a check scaler and refused for a role without the permission
    When I call "GET" "<endpoint>" as a check scaler
    Then the API should allow it
    When I call "GET" "<endpoint>" as a welcome-only role
    Then the same call should be refused for a welcome-only role

    Examples: §H Site Inspection – Create CR (init) and Site Inspection RU (edit init)
      | endpoint                                                              |
      | /api/scale-sites/520/inspections/create?inspectionTypeCode=MIN&siteTypeCodes=W |
      | /api/scale-sites/inspection/322429/edit                               |

  # THE LETTERS — ALL OF THEM, since the client's 2026-09-02 spec: "CHECK_SCALER, SYS_ADMIN,
  # REG_SCAL_MAN and REG_DIST_MAN have access to all letters and can create letters."
  #
  # THIS REVERSES judgement call (3). RolePermissions.checkScaler() used to grant MSD_LETTER and withhold
  # SCALER_AUTHORIZATION_LETTER on an "owns the workflow end to end" test — §F gave this column CRUD on
  # the designation it was lettering, §E only R on the authorization. The client named the role
  # explicitly, so the test no longer decides it and the authorization letter moved from the deny table
  # to this one. The test still governs the C&E Technician, which the same spec limits to viewing.
  #
  # Both endpoints are body-free GETs, so both reach authorization, and the administrator gets 404 on
  # BOTH — which is what rules out a broken route or a missing anchor as the explanation for either.
  @p0
  Scenario: Both the designation letter and the authorization letter are granted
    When I request the designation letter as a check scaler
    Then the designation letter should pass authorization
    When I request the designation letter as a welcome-only role
    Then the same call should be refused for a welcome-only role
    When I call "GET" "/api/scaler-authorizations/147851/letter" as a check scaler
    Then the API should not refuse it on authorization

  # ---------------------------------------------------------------------------------------------

  # The role is internal, so it holds its column with no forest client — the opposite of IND/OWN, where
  # a missing client withholds everything including the welcome page. Worth pinning: adding this role to
  # Roles.CLIENT_SCOPED_ROLES would be a total lockout rather than a tightening.
  @p1
  Scenario: An internal role needs no forest client to hold its column
    When I call "GET" "/api/clients/search?clientNumber=00048273" as a check scaler
    Then the client search should be unscoped

  # ---------------------------------------------------------------------------------------------
  # The status-code contract for a permission denial, carried by ONE scenario on purpose. The matrix
  # scenarios above assert only that a read is refused, so a future regression in how denials are MAPPED
  # shows up here as a single clear failure rather than turning two dozen rows red with one root cause.
  #
  # This was RED for the industry-scaler suite until GlobalApiExceptionHandler.handleAccessDenied landed
  # (method security throws AuthorizationDeniedException from inside the dispatch, so SecurityConfig's
  # filter-chain accessDeniedHandler never saw it and the catch-all answered 500). It is green here.
  @p1
  Scenario: A permission denial answers 403 rather than a server error
    When I call "GET" "/api/inspection-questions" as a check scaler
    Then the API should refuse it with 403
