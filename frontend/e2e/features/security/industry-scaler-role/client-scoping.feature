# Spec: the roles & permissions matrix §3 "(ltd)" qualifier + §4 prose
#       › SEC-7 (sec-7-external-bceid-auth-client-restriction.md) › ClientScopeInterceptor / ClientScopeGuard
#       › THIS FILE
#
# The role's SECOND axis. Role gating (the other three features) answers *what* an industry scaler may
# do; this answers *whose rows* this particular one may see — the "(ltd)" qualifier on every IND cell,
# and §4's "their own record / their own authorizations / scale sites they are authorized to scale at".
#
# Asserted on all three levels, because it is enforced in three different places and a gap in any one of
# them is a live data leak:
#   GUI — the query pages seed and LOCK the client filter, so the search cannot be widened.
#   URL — another client's record, opened by deep link, renders the access-denied card.
#   API — the same record requested directly answers 403.
#
# Every case is PAIRED: one anchor the user is entitled to, one they are not. A restriction assertion on
# its own proves nothing, because a broken screen refuses everything equally.
@sec @SEC-8 @IND
Feature: Industry Scaler — client scoping

  Background:
    Given I am signed in as an industry scaler for my own client

  # ------------------------------------------------------------------ GUI level

  @p0
  Scenario: The scaler search filter is locked to my own client and returns only its scalers
    When I open the Scalers query page
    Then the client filter should be locked to my own client
    When I search scalers with the locked filter
    Then only my own client's scalers should be listed

  # Contrast: the same field is freely editable for an internal user, so the lock above is the client
  # scope acting and not a permanently read-only input.
  @p1
  Scenario: An administrator's client filter is not locked
    Given I am signed in as a system administrator
    When I open the Scalers query page
    Then the client filter should be free to edit

  # ------------------------------------------------------------------ URL level

  @p0
  Scenario: My own scaler record opens by direct URL
    When I browse directly to my own scaler record
    Then the record should load

  @p0
  Scenario: Another client's scaler record is refused by direct URL
    When I browse directly to another client's scaler record
    Then I should be told I have no access to that record

  # §4's "view scale sites they are authorized to scale at". The site is owned by a DIFFERENT client, so
  # access here comes purely from an in-force authorization held by one of this client's scalers —
  # `ClientScopeGuard.assertScaleSiteInScope` admits a non-owned site on exactly that basis. The
  # authorization is seeded per-scenario and deleted on teardown, because it must be in force TODAY and
  # a static extract cannot hold today-relative state.
  @p0
  Scenario: A scale site my client is authorized at opens by direct URL
    Given my client has been authorized to scale at the entitled site
    When I browse directly to the entitled scale site record
    Then the record should load

  # The same shape of record, without the authorization — which is what makes the scenario above a real
  # assertion rather than a site that happened to be readable anyway.
  @p0
  Scenario: A scale site my client is not authorized at is refused by direct URL
    When I browse directly to a scale site I am not authorized at
    Then I should be told I have no access to that record

  # ------------------------------------------------------------------ API level

  @p0
  Scenario: My own scaler record is served by the API
    When I request my own scaler record from the API
    Then the API should allow it

  @p0
  Scenario: Another client's scaler record is refused by the API
    When I request another client's scaler record from the API
    Then the API should refuse it as out of my client scope

  @p0
  Scenario: A scale site my client is authorized at is served by the API
    Given my client has been authorized to scale at the entitled site
    When I request the entitled scale site from the API
    Then the API should allow it

  @p0
  Scenario: A scale site my client is not authorized at is refused by the API
    When I request a scale site I am not authorized at from the API
    Then the API should refuse it as out of my client scope
