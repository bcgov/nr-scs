# Spec: the roles & permissions matrix §3 column `IND`
#       › Permissions.java + RolePermissions.industryScaler() › @RequiresPermission on each handler › THIS FILE
#
# LEVEL 3 of 3 — API. What the SERVER allows when the request is made anyway, with no browser involved.
# The other two levels describe an application that declines to OFFER something; this one shows the
# request being REFUSED, which is the difference between a tidy UI and an enforced permission model.
#
# Identity travels in the dev-only X-Mock-Roles / X-Mock-Client headers the frontend mock bridge already
# sends, so each call is authorized through the same expandAuthorities → @RequiresPermission path a real
# request takes (see pages/security/ApiAccessProbe.ts). Nothing here is a test-only auth path.
#
# On the deny assertion: the READ matrix asserts "refused", not a specific status, and ONE scenario at
# the foot of this file pins 403. That split is deliberate — it kept defects.md Divergence #1 (a denial
# answering 500) to a single red instead of two dozen rows all reporting the same root cause, and it
# keeps any future mapping regression equally legible.
#
# WRITES do not get that loose assertion, because for them the status IS the evidence. Body binding and
# bean validation run BEFORE @RequiresPermission (method security is an AOP interceptor around the
# handler), so a body-less POST is rejected by the binder at 400 with authorization never consulted —
# the same 400 an administrator gets. ">= 400" would then hold whether the role is denied or wrongly
# granted. Each write therefore sends a body that reaches authorization and pins 403, and is paired with
# an administrator contrast. Measured, not assumed: defects.md V5.
@sec @SEC-8 @IND
Feature: Industry Scaler — API access

  @p0
  Scenario Outline: <method> <endpoint> is allowed
    When I call "<method>" "<endpoint>" as an industry scaler
    Then the API should allow it

    Examples: cross-cutting — WELCOME_READ, LOV_READ
      | method | endpoint             |
      | GET    | /api/welcome         |
      | GET    | /api/region-district-lov |
      | GET    | /api/static-lov      |

    Examples: client + scaler queries — CLIENT_QUERY, SCALER_QUERY
      | method | endpoint                                  |
      | GET    | /api/clients/search?clientNumber=00048273  |
      | GET    | /api/scalers/search?clientNumber=00048273  |

    Examples: own scaler record — SCALER_READ, SCALER_ADDRESS_READ
      | method | endpoint                      |
      | GET    | /api/scalers/001B             |
      | GET    | /api/scalers/001B/summary     |
      | GET    | /api/scalers/001B/address     |
      | GET    | /api/scalers/001B/tombstone   |

    Examples: own scaler tabs — the "R (ltd)" list permissions
      | method | endpoint                                   |
      | GET    | /api/scalers/001B/authorizations           |
      | GET    | /api/scaler-authorizations/147851          |
      | GET    | /api/scalers/001B/check-scales             |
      | GET    | /api/scalers/001B/summary-check-scales     |
      | GET    | /api/scalers/001B/exams                    |
      | GET    | /api/scalers/001B/appointments             |
      | GET    | /api/scalers/001B/performance-remarks      |

    Examples: mark site designations — MSD_QUERY
      | method | endpoint                                  |
      | GET    | /api/mark-site-designations/search?timberMark=%25 |

    # Granted by the client's 2026-09-02 spec: "read permissions with limitations", narrowed 2026-09-03
    # to the RECORD only — the Risk Rating tab below lists the scaler's own assessments and links each to
    # the view page, so the standalone search screen is withheld. The limitation is enforced in the
    # service: the read-by-id resolves the assessment's scaler and calls ClientScopeGuard, which
    # `ClientScopeInterceptorTest` pins. The cross-client half is proven in cross-cutting-record-scope.
    Examples: risk assessment — the scaler's Risk Rating tab, read only and own-client only
      | method | endpoint                       |
      | GET    | /api/scalers/001B/risk-ratings |

  @p0
  Scenario Outline: <method> <endpoint> is refused
    When I call "<method>" "<endpoint>" as an industry scaler
    Then the API should refuse it

    Examples: scale-site register and summary — SCALE_SITE_QUERY / SCALE_SITE_SUMMARY_READ withheld
      | method | endpoint                                 |
      | GET    | /api/scale-sites/search?scaleSiteIdNmbr=520 |
      | GET    | /api/scale-sites/520/summary             |

    # Two separate denials in one table. The SITE subject belongs to `OWN` — each external column gets
    # the assessments on the record it lives on. And BOTH search endpoints are refused, this column's own
    # subject included: since 2026-09-03 it holds `_ASSESSMENT_READ` without `_ASSESSMENT_QUERY`, so it
    # reaches assessments from the record and never from a register.
    Examples: risk assessments — the site subject, and both standalone searches
      | method | endpoint                                               |
      | GET    | /api/scaler-risk-assessments/search?riskTypeCode=M      |
      | GET    | /api/scale-site-risk-assessments/search?riskTypeCode=H |
      | GET    | /api/scale-sites/520/risk-ratings                      |

    Examples: check scales and work bench
      | method | endpoint                                  |
      | GET    | /api/check-scales/search?checkScaleId=145988 |
      | GET    | /api/scaler-authorizations/workbench       |

    Examples: reference-data maintenance — every MAINTAIN_* cell is "-"
      | method | endpoint                     |
      | GET    | /api/inspection-questions    |
      | GET    | /api/conditions              |
      | GET    | /api/signature-blocks        |
      | GET    | /api/appointment-types       |
      | GET    | /api/auth-clauses            |
      | GET    | /api/valid-licence-attributes |
      | GET    | /api/exam-upgrades           |

    # Not §J: the letter pages' signatory picker (LETTER_SIGNATORY_QUERY), held only by roles with a
    # _LETTER_CREATE verb. Added with it (nr-scs #286 follow-up) so the lookup cannot leak past them.
    Examples: the letter signatory picker — no letter to compose
      | method | endpoint                     |
      | GET    | /api/letter-signature-blocks |

  # The role holds no create, update or delete permission whatsoever. Each probe carries a body that
  # binds and passes bean validation — so @RequiresPermission is the only thing left that can refuse it,
  # and 403 is pinned to say the refusal came from there — but that then fails a SERVICE-side business
  # rule, which runs after authorization. That is what makes it safe to aim these at real anchors: a
  # wrongful grant cannot mutate anything, it answers 400. See fixtures buildWriteProbeBody.
  @p0
  Scenario Outline: <method> <endpoint> is refused by authorization, not by the body
    When I call "<method>" "<endpoint>" with a bindable body as an industry scaler
    Then the API should refuse it with 403

    Examples:
      | method | endpoint                   |
      | POST   | /api/scalers               |
      | PUT    | /api/scalers/001B          |
      | POST   | /api/scaler-authorizations |

  # Contrast for the writes, and the other half of the proof: the SAME body as an administrator gets
  # past authorization and dies in service validation (400). Without it, a 403 above could equally be a
  # blanket refusal, an unmapped route, or a body the server rejects for every caller.
  @p1
  Scenario Outline: <method> <endpoint> passes authorization for a role that holds the permission
    When I call "<method>" "<endpoint>" with a bindable body as a system administrator
    Then the same call should pass authorization for a system administrator

    Examples:
      | method | endpoint                   |
      | POST   | /api/scalers               |
      | PUT    | /api/scalers/001B          |
      | POST   | /api/scaler-authorizations |

  # Contrast: the endpoints refused above are working endpoints. Without this the whole deny matrix
  # would pass just as happily against a backend that was down.
  @p1
  Scenario Outline: <endpoint> works for a role that holds the permission
    When I call "GET" "<endpoint>" as a system administrator
    Then the same call should succeed for a system administrator

    Examples:
      | endpoint                                    |
      | /api/scale-sites/search?scaleSiteIdNmbr=520 |
      | /api/scale-sites/520/summary                |
      | /api/inspection-questions                   |
      | /api/check-scales/search?checkScaleId=145988 |

  # DELETE is separated from the write matrix because it is the one probe that would destroy a pinned
  # seed anchor if authorization were broken. The status assertion alone cannot see that outcome — a
  # refusal reported while the row was deleted anyway is the worst case — so the record is read back.
  @p0
  Scenario: Deleting a scaler is refused and the record survives
    When I call "DELETE" "/api/scalers/001B" as an industry scaler
    Then the API should refuse it
    And my own scaler record should still exist

  # A client-scoped role without its forest client holds no permissions, so even the welcome endpoint
  # that every recognised role otherwise reaches is closed. Fails closed, by design.
  @p1
  Scenario: An industry scaler with no forest client is refused the welcome endpoint
    When I call "GET" "/api/welcome" as an industry scaler with no forest client
    Then the API should refuse it

  # ---------------------------------------------------------------------------------------------
  # The status-code contract for a permission denial, carried by ONE scenario on purpose (defects.md
  # Divergence #1, now fixed). The matrix scenarios above assert only that the call is refused, so a
  # future regression in how denials are MAPPED shows up here as a single clear failure instead of
  # turning two dozen matrix rows red with one root cause — which is exactly what this defect did
  # before the handler was added.
  #
  # Was RED until `GlobalApiExceptionHandler.handleAccessDenied` landed: method security throws
  # AuthorizationDeniedException from inside the dispatch, so SecurityConfig's filter-chain
  # accessDeniedHandler never saw it and the catch-all answered 500.
  @p1
  Scenario: A permission denial answers 403 rather than a server error
    When I call "GET" "/api/scale-sites/search?scaleSiteIdNmbr=520" as an industry scaler
    Then the API should refuse it with 403
