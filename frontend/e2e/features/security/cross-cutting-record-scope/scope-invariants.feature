# Spec: ClientScopeInterceptor / ClientScopeGuard / SecurityContextUtils.isClientRestricted › THIS FILE
#
# Two properties of the scoping layer that hold for EVERY caller and so belong to no role's suite.
#
# 1. SCOPING FOLLOWS CLIENT-RESTRICTION, NOT ROLE.
#    Role and forest client are orthogonal axes: the role decides what a caller may do, the client header
#    decides whose rows it may see. `ClientScopeInterceptor.preHandle` branches on
#    `isClientRestricted()` — the client header — and never looks at the role at all.
#
#    Asserted with an ADMINISTRATOR carrying a client header. That identity holds ALL_PERMISSIONS, so a
#    refusal cannot be a permission decision; it can only be the scope guard. Nothing else in the suite
#    can separate those two layers, because every other scoped caller is also permission-limited, and a
#    403 from either looks identical.
#
#    Why it is worth a test: it is the property that makes enabling a twelfth role safe by default. If
#    scoping were keyed on the two external role names instead, a new external role would arrive
#    unscoped and silently — and every role suite would still pass.
#
# 2. NO EXISTENCE ORACLE.
#    A client-restricted caller asking for an id that exists in no table gets 403, not 404, because the
#    scope lookup runs before the handler. Internal callers still get 404. Collapsing the two denies an
#    external user a probe over the whole scaler / site / authorization keyspace.
#
#    Each row is paired with the same id as an unrestricted administrator. Without that pairing a 403
#    here is unreadable: it would equally well mean the endpoint is broken for everyone.
@sec @SEC-11 @cross-cutting @record-scope
Feature: Cross-cutting — client-scope invariants

  # ---------------------------------------------------------------- 1. scoping is role-independent

  @p0
  Scenario Outline: An administrator carrying a forest client is scoped exactly like an external role
    When I request "<endpoint>" as an administrator restricted to the industry scaler's client
    Then the API should refuse it as out of my client scope

    Examples: records outside forest client 00048273
      | endpoint                          |
      | /api/scalers/0001                 |
      | /api/scaler-authorizations/143648 |

  @p0
  Scenario Outline: The same administrator reads the same records once the client restriction is gone
    When I request "<endpoint>" as an unrestricted administrator
    Then the same call should succeed for a system administrator

    Examples: the contrast — identical role, identical id, no client header
      | endpoint                          |
      | /api/scalers/0001                 |
      | /api/scaler-authorizations/143648 |

  # The same property from the owner's side, so it is not shown on one bridge only. `ClientScopeGuard`
  # resolves site scope PER ROLE, and an administrator holds neither external role's bridge — so it
  # reaches a site its client owns and nothing else, which is what these two rows show.
  @p1
  Scenario: An administrator restricted to the owner's client reaches a site that client owns
    When I request "/api/scale-sites/019V/tombstone" as an administrator restricted to the owner's client
    Then the API should allow it

  @p1
  Scenario: The same administrator is refused a site that client does not own
    When I request "/api/scale-sites/561/tombstone" as an administrator restricted to the owner's client
    Then the API should refuse it as out of my client scope

  # ---------------------------------------------------------------- 2. no existence oracle

  @p0
  Scenario Outline: A nonexistent id is refused rather than reported missing to a scoped caller
    When I request "<endpoint>" as a client-restricted industry scaler
    Then the API should refuse it as out of my client scope

    Examples: ids that exist in no table — path-keyed and by-other-id alike
      | endpoint                              |
      | /api/scalers/ZZZZ                     |
      | /api/scaler-authorizations/99999999   |

  @p0
  Scenario Outline: The same nonexistent ids are reported missing to an internal caller
    When I request "<endpoint>" as an unrestricted administrator
    Then the API should report it as not found for a system administrator

    Examples: the contrast that makes the 403s above readable
      | endpoint                              |
      | /api/scalers/ZZZZ                     |
      | /api/scaler-authorizations/99999999   |

  # Repeated on the owner's records, because the guard reaches them through a different bridge and the
  # collapse has to hold on both or the oracle is only half closed.
  @p1
  Scenario Outline: A nonexistent owner-side id is refused rather than reported missing
    When I request "<endpoint>" as a client-restricted scale site owner
    Then the API should refuse it as out of my client scope

    Examples: owner-side keyspace
      | endpoint                                |
      | /api/scale-site-authorizations/99999999 |
      | /api/scale-sites/inspection/99999999    |

  @p1
  Scenario Outline: The same owner-side ids are reported missing to an internal caller
    When I request "<endpoint>" as an unrestricted administrator
    Then the API should report it as not found for a system administrator

    Examples: owner-side contrast
      | endpoint                                |
      | /api/scale-site-authorizations/99999999 |
      | /api/scale-sites/inspection/99999999    |
