# Spec: the roles & permissions matrix §3 column `OWN`
#       › Permissions.java + RolePermissions.scaleSiteOwner() › @RequiresPermission on each handler › THIS FILE
#
# LEVEL 3 of 3 — API. What the SERVER allows when the request is made anyway, with no browser involved.
# The other two levels describe an application that declines to OFFER something; this one shows the
# request being REFUSED, which is the difference between a tidy UI and an enforced permission model.
#
# Identity travels in the dev-only X-Mock-Roles / X-Mock-Client headers the frontend mock bridge already
# sends, so each call is authorized through the same expandAuthorities → @RequiresPermission path a real
# request takes (see pages/security/ApiAccessProbe.ts). Nothing here is a test-only auth path.
#
# On the deny assertion: matrix scenarios assert "refused", not a specific status, with ONE scenario at
# the foot pinning 403. The industry-scaler suite needed that split because denials answered 500
# (its Divergence #1, since fixed); the split is kept because it localises any future mapping regression
# to one red instead of two dozen.
#
# WRITES ARE PROBED DIFFERENTLY HERE, and the reason is a finding rather than a preference — see
# defects.md Divergence #1. A write carrying a @RequestBody never reaches method security at all, so the
# usual bodyless POST/PUT probe proves nothing about the role. Only bodyless mutations are used below.
@sec @SEC-9 @OWN
Feature: Scale Site Owner — API access

# WHY THREE OUTLINES SEED AN AUTHORIZATION. Since 2026-08-20 an owner reaches a scaler only through an
# in-force authorization at a site it owns, so the scaler rows below use a scaler that has one (`4313`,
# seeded per scenario) rather than the client's own `IB60`, which is now refused.
#
# That matters as much for the REFUSED rows as the allowed ones: `ClientScopeInterceptor` runs before
# method security, so an unreadable scaler would answer 403 on scope and the row would stop proving
# anything about the permission it names — the vacuous-denial trap `defects.md` Divergence #1 documents.
#
# The Given sits on the outline, so it also seeds for that outline's non-scaler rows. That is wasted
# work (one POST + one DELETE each) rather than a correctness problem, and it was preferred to splitting
# every outline in two: the tables stay grouped by the matrix section they assert, which is what makes
# them reviewable against §3.

  @p0
  Scenario Outline: <method> <endpoint> is allowed
    Given a scaler is authorized to scale at a site I own
    When I call "<method>" "<endpoint>" as a scale site owner
    Then the API should allow it

    Examples: cross-cutting — WELCOME_READ, LOV_READ
      | method | endpoint                 |
      | GET    | /api/welcome             |
      | GET    | /api/region-district-lov |
      | GET    | /api/static-lov          |

    Examples: client + scaler + site queries — CLIENT_QUERY, SCALER_QUERY, SCALE_SITE_QUERY
      | method | endpoint                                            |
      | GET    | /api/clients/search?clientNumber=00001009            |
      | GET    | /api/scalers/search?clientNumber=00001009            |
      | GET    | /api/scale-sites/search?ownerClientNumber=00001009   |

    Examples: a scaler of my client — SCALER_READ, plus the two §4 grants
      | method | endpoint                    |
      | GET    | /api/scalers/4313           |
      | GET    | /api/scalers/4313/summary   |
      | GET    | /api/scalers/4313/tombstone |
      | GET    | /api/scalers/4313/address   |
      | GET    | /api/scalers/4313/exams     |

    Examples: my own scale site record — SCALE_SITE_READ + SCALE_SITE_SUMMARY_READ
      | method | endpoint                          |
      | GET    | /api/scale-sites/019V/tombstone   |
      | GET    | /api/scale-sites/019V/summary     |

    # Granted by the client's 2026-09-02 spec: "read permissions with limitations", narrowed 2026-09-03
    # to the RECORD only — the Risk Rating tab below lists the site's own assessments and links each to
    # the view page, so the standalone search screen is withheld. The limitation is enforced in the
    # service: the read-by-id resolves the assessment's site and calls ClientScopeGuard, which
    # `ClientScopeInterceptorTest` pins. The cross-client half is proven in cross-cutting-record-scope.
    Examples: risk assessment — the site's Risk Rating tab, read only and own-client only
      | method | endpoint                           |
      | GET    | /api/scale-sites/019V/risk-ratings |

    Examples: my own site's tabs — every §3.D row granted "R (ltd)"
      | method | endpoint                                       |
      | GET    | /api/scale-sites/019V/contacts                 |
      | GET    | /api/scale-sites/019V/owner                    |
      | GET    | /api/scale-sites/019V/activity-summary         |
      | GET    | /api/scale-sites/019V/authorizations           |
      | GET    | /api/scale-sites/019V/authorized-scalers       |
      | GET    | /api/scale-sites/019V/mark-site-designations   |
      | GET    | /api/scale-sites/019V/inspections              |
      | GET    | /api/scale-sites/019V/check-scales             |
      | GET    | /api/scale-sites/019V/software                 |

    Examples: single-record reads §3.D/E/H grant — contact, site authorization, inspection
      | method | endpoint                                |
      | GET    | /api/scale-sites/019V/contacts/2497     |
      | GET    | /api/scale-site-authorizations/239313   |
      | GET    | /api/scale-sites/inspection/400091      |

  @p0
  Scenario Outline: <method> <endpoint> is refused
    Given a scaler is authorized to scale at a site I own
    When I call "<method>" "<endpoint>" as a scale site owner
    Then the API should refuse it

    Examples: scaler tabs §3.C withholds — the inversion against the industry scaler
      | method | endpoint                                   |
      | GET    | /api/scalers/4313/authorizations           |
      | GET    | /api/scalers/4313/check-scales             |
      | GET    | /api/scalers/4313/summary-check-scales     |
      | GET    | /api/scalers/4313/appointments             |
      | GET    | /api/scalers/4313/performance-remarks      |

    Examples: standalone mark / site designations — §3.F is "-" throughout
      | method | endpoint                                          |
      | GET    | /api/mark-site-designations/search?timberMark=%25  |
      | GET    | /api/mark-site-designations/workbench             |

    # Two separate denials in one table. The SCALER subject belongs to `IND` — each external column gets
    # the assessments on the record it lives on. And BOTH search endpoints are refused, this column's own
    # subject included: since 2026-09-03 it holds `_ASSESSMENT_READ` without `_ASSESSMENT_QUERY`.
    #
    # Note the contrast that makes that deliberate rather than a blanket rule: this role DOES search the
    # site register (`/api/scale-sites/search`, in the allowed table above). What is withheld is the
    # assessment register specifically.
    Examples: risk — the scaler subject, and both standalone searches
      | method | endpoint                                               |
      | GET    | /api/scalers/4313/risk-ratings                         |
      | GET    | /api/scaler-risk-assessments/search?riskTypeCode=M     |
      | GET    | /api/scale-site-risk-assessments/search?riskTypeCode=H |

    Examples: check scales and the work benches
      | method | endpoint                                      |
      | GET    | /api/check-scales/search?checkScaleId=145988   |
      | GET    | /api/scaler-authorizations/workbench           |
      | GET    | /api/scale-site-authorizations/workbench       |

    Examples: reference-data maintenance — every §3.J cell is "-"
      | method | endpoint                      |
      | GET    | /api/inspection-questions     |
      | GET    | /api/conditions               |
      | GET    | /api/signature-blocks         |
      | GET    | /api/appointment-types        |
      | GET    | /api/auth-clauses             |
      | GET    | /api/valid-licence-attributes |
      | GET    | /api/exam-upgrades            |

    # Not §J: the letter pages' signatory picker (LETTER_SIGNATORY_QUERY), held only by roles with a
    # _LETTER_CREATE verb. Added with it (nr-scs #286 follow-up) so the lookup cannot leak past them.
    Examples: the letter signatory picker — no letter to compose
      | method | endpoint                      |
      | GET    | /api/letter-signature-blocks  |

  # Contrast: the endpoints refused above are working endpoints. Without this the whole deny matrix would
  # pass just as happily against a backend that was down.
  @p1
  Scenario Outline: <endpoint> works for a role that holds the permission
    When I call "GET" "<endpoint>" as a system administrator
    Then the same call should succeed for a system administrator

    Examples:
      | endpoint                                     |
      | /api/scalers/4313/authorizations             |
      | /api/mark-site-designations/search?timberMark=%25 |
      # Was /api/scale-sites/019V/risk-ratings, which the owner now holds — a contrast row has to be an
      # endpoint the deny matrix above actually refuses, or it proves nothing about that matrix.
      | /api/scalers/4313/risk-ratings               |
      | /api/inspection-questions                    |
      | /api/check-scales/search?checkScaleId=145988 |

  # ---------------------------------------------------------------------------------------------
  # WRITES. Every write cell in the OWN column is "-", and these are the only probes that actually
  # demonstrate it. A POST/PUT carrying a @RequestBody is rejected by deserialization (no body → 500) or
  # bean validation (body `{}` → 400) BEFORE method security runs — identically for an administrator — so
  # such a probe cannot distinguish "refused by authorization" from "rejected for a bad payload".
  # Bodyless mutations have no body to resolve, so they reach @RequiresPermission and answer 403.
  # See defects.md Divergence #1.
  @p0
  Scenario Outline: <method> <endpoint> is refused, and reaches the handler for an administrator
    Given a scaler is authorized to scale at a site I own
    When I call "<method>" "<endpoint>" as a scale site owner
    Then the API should refuse it with 403
    When I call "<method>" "<endpoint>" as a system administrator
    Then the same call should not be refused for a system administrator

    Examples: deletes on my own site's child records — §3.D grants no D
      | method | endpoint                                     |
      | DELETE | /api/scale-sites/019V/contacts/999999        |
      | DELETE | /api/scale-sites/inspection/999999           |

    Examples: deletes and renewals on records the owner may only read
      | method | endpoint                                          |
      | DELETE | /api/scale-site-authorizations/999999             |
      | POST   | /api/scaler-authorizations/999999/workbench/remove |

    Examples: writes on a scaler of my own client — §3.C grants the owner no C/U/D
      | method | endpoint                                    |
      | DELETE | /api/scalers/4313/appointments/999999       |
      | DELETE | /api/scalers/4313/performance-remarks/999999 |

  # The one probe that would destroy a pinned anchor if authorization were broken, so it verifies the
  # record survived rather than trusting the status code. A refusal reported while the row was deleted
  # anyway is the worst case, and the one a status assertion cannot see.
  @p0
  Scenario: Deleting a scaler the owner may read is refused and the record survives
    Given a scaler is authorized to scale at a site I own
    When I call "DELETE" "/api/scalers/4313" as a scale site owner
    Then the API should refuse it
    And the scaler of my own client should still exist

  # A client-scoped role without its forest client holds no permissions, so even the welcome endpoint
  # every recognised role otherwise reaches is closed. Fails closed, by design.
  @p1
  Scenario: A scale site owner with no forest client is refused the welcome endpoint
    When I call "GET" "/api/welcome" as a scale site owner with no forest client
    Then the API should refuse it

  # The status-code contract for a permission denial, carried by ONE scenario on purpose so a future
  # regression in how denials are MAPPED shows up as a single clear failure rather than turning the whole
  # matrix red with one root cause. Green as of 2026-08-19 (the industry-scaler suite's Divergence #1 fix
  # applies to every role).
  @p1
  Scenario: A permission denial answers 403 rather than a server error
    When I call "GET" "/api/mark-site-designations/search?timberMark=%25" as a scale site owner
    Then the API should refuse it with 403
