# Spec: SEC-7 (external BCeID authentication & client restriction) › security/ActiveClientResolver
#       › filter/MockRequestFilter + filter/JwtRequestFilter › THIS FILE
#
# WHICH CLIENT AM I? — the seam both external role suites left open.
#
# `../industry-scaler-role/` and `../scale-site-owner-role/` each exercise an external user with exactly
# ONE forest client, and each logged the same gap in the same words: "the multi-client external user is
# not covered". Neither could close it, because the property is not about either role —
# `ActiveClientResolver` never looks at a role. It is about how a REQUEST chooses its client, which is
# why it sits here with the other cross-cutting seams.
#
# ── THE BEHAVIOUR CHANGED, AND NOTHING WAS WATCHING ────────────────────────────────────────────────
# SEC-7 originally refused a multi-client token with 403 outright. The switcher now supports it, so
# there are four rules where there used to be one — and no scenario asserted any of them.
#
#   no selection           → the LOWEST-NUMBERED entitled client (sorted, so the default cannot vary)
#   an entitled selection  → that client
#   an unentitled one      → 403. Refused, NOT quietly downgraded to a client they do hold
#   an internal user       → ignored entirely
#
# The third is the security-relevant one, and the resolver's own comment says why: "a silent fallback
# would let a caller probe which clients are theirs by watching whether the response changed."
#
# ── WHAT MAKES THE ACTIVE CLIENT OBSERVABLE ───────────────────────────────────────────────────────
# `GET /api/welcome` resolves `userOrganization` from the active client, so the response NAMES which one
# won. A status code cannot. The two anchors are chosen so their organizations are unmistakably
# different strings — a company name (`AINSWORTH LUMBER CO. LTD. - 00001009`) versus a bare number
# (`00048273`, a client absent from the supported client view) — which is what lets one field
# distinguish four outcomes.
@sec @SEC-11 @cross-cutting @active-client
Feature: Cross-cutting — which forest client a request acts as

  @p0 @UC-SEC-001 @S02
  Scenario: With no selection, a multi-client user acts as their lowest-numbered client
    When a multi-client owner calls the API with no client selected
    Then the request should act as the lowest-numbered client

  @p0 @UC-SEC-001 @S02
  Scenario: A selection the token grants takes effect
    When a multi-client owner switches to its other client
    Then the request should act as the selected client

  # The one that matters. Paired with an entitled selection inside the same scenario, so the 403 is
  # attributable to the SELECTION and not to the endpoint, the role, or the client header itself.
  @p0 @UC-SEC-001 @S02
  Scenario: A selection the token does not grant is refused, not downgraded
    When a multi-client owner asks to act as a client it does not hold
    Then the request should be refused rather than silently downgraded

  # An internal user is neither refused nor narrowed. Both halves are asserted: a refusal would break
  # every administrator whose browser ever sent a stale header, and honouring it would silently scope an
  # administrator's screens to one forest client.
  @p1 @UC-SEC-001 @S01
  Scenario: An internal user's client selection is ignored in both directions
    When an internal user asks to act as a forest client
    Then the selection should be ignored

  # Regression guard for the case every other external scenario in the suite depends on: a
  # single-client user still resolves without sending any selection at all.
  @p1 @UC-SEC-001 @S02
  Scenario: A single-client external user still acts as its only client
    When a single-client industry scaler calls the API
    Then it should act as its only client
