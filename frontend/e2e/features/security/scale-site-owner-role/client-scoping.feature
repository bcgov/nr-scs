# Spec: the roles & permissions matrix §3 "(ltd)" qualifier + §4 prose
#       › SEC-7 (sec-7-external-bceid-auth-client-restriction.md) › ClientScopeInterceptor / ClientScopeGuard
#       › THIS FILE
#
# The role's SECOND axis. Role gating (the other three features) answers *what* a scale site owner may
# do; this answers *whose rows* this particular one may see — the "(ltd)" qualifier on almost every OWN
# cell, and §4's "their scale sites" / "scalers authorized to scale at their sites".
#
# Asserted on all three levels, because it is enforced in three different places and a gap in any one of
# them is a live data leak:
#   GUI — the query pages seed and LOCK the client filter, so the search cannot be widened.
#   URL — another client's record, opened by deep link, renders the access-denied card.
#   API — the same record requested directly answers 403.
#
# Every case is PAIRED: one anchor the user is entitled to, one they are not. A restriction assertion on
# its own proves nothing, because a broken screen refuses everything equally.
#
# TWO THINGS SPECIFIC TO THIS ROLE, both worth reading before changing anything here. BOTH INVERTED on
# 2026-08-20, when PR review found the pair the wrong way round in the implementation:
#
#  1. "Scale site OWNER" means EXACTLY "sites my client owns". `ClientScopeGuard.assertScaleSiteInScope`
#     resolves site scope PER ROLE: the industry scaler keeps the owner-OR-authorized rule, because an
#     authorization is the only way that role ever reaches a site; the owner does not get it. Sharing the
#     predicate over-granted this role — an owner whose client also employs an authorized scaler could
#     deep-link another company's site summary, contacts, authorizations and inspections, records its own
#     scale-site search never lists. Asserted below with the authorization SEEDED AND LIVE, since a
#     refusal with no authorization present would prove nothing about which rule is in force.
#
#  2. A scaler RECORD is reachable only when the scaler is authorized at a site the client owns. Being
#     filed under the owner's own forest client is not enough. §1's legend defines the owner's "(ltd)"
#     this way and §4's first bullet names the same population.
#
#     Legacy did the opposite: SecurityUtils.hasScalerAccess compared SCALER.CLIENT_NUMBER to the
#     caller's client and nothing else. The narrowing is deliberate — that column is documented only as
#     "Reference to CLIENT", so it records an association, not a current engagement.
#
#     THE SEARCH IS NOT NARROWED TO MATCH. It keeps legacy's own-client binding and legacy's read-only
#     client field, so it lists scalers whose records this rule refuses. Those dead links are accepted
#     (legacy had them too, via the Authorized Scalers tab) and are asserted from both sides below, so
#     nobody "fixes" the search without revisiting the decision.
@sec @SEC-9 @OWN
Feature: Scale Site Owner — client scoping

  Background:
    Given I am signed in as a scale site owner for my own client

  # ------------------------------------------------------------------ GUI level

  @p0
  Scenario: The scale site search filter is locked to my own client and returns only my sites
    When I open the Scale Sites query page
    Then the owner client filter should be locked to my own client
    When I search my own scale sites
    Then only my own scale sites should be listed

  # Contrast: the same field is freely editable for an internal user, so the lock above is the client
  # scope acting and not a permanently read-only input.
  @p1
  Scenario: An administrator's owner client filter is not locked
    Given I am signed in as a system administrator
    When I open the Scale Sites query page
    Then the owner client filter should be free to edit

  # The search keeps legacy's own-client binding and legacy's read-only field
  # (QueriesScalersSearchAction:103 + scalerSearch.jsp:37, both keyed on isRestrictUserToClient()).
  #
  # SO THE SEARCH IS WIDER THAN WHAT THE ROLE CAN OPEN, and that is accepted rather than filtered out:
  # IB60 is listed here and its record is REFUSED two scenarios down, because it holds no in-force
  # authorization at any site this client owns. Those two scenarios are the same fact stated twice, and
  # together they are the executable record of the decision — the client number is the criterion the
  # screen states, and whatever it returns is the correct answer to it. Narrowing the result to the
  # openable set was built on 2026-08-20 and reverted, because it makes the stated criterion and the
  # applied one differ. Do not re-add it here. (Decision: Jonah, 2026-08-20.)
  @p0
  Scenario: The scaler search is locked to my own client and lists its scalers, openable or not
    When I open the Scalers query page
    Then the scaler client filter should be locked to my client
    When I search scalers with the locked filter
    Then only my own client's scaler should be listed

  # ------------------------------------------------------------------ URL level

  @p0
  Scenario: My own scale site record opens by direct URL
    When I browse directly to my own scale site record
    Then the record should load

  @p0
  Scenario: Another client's scale site record is refused by direct URL
    When I browse directly to a scale site owned by another client
    Then I should be told I have no access to that record

  # Being filed under the owner's own forest client is NOT access. This scaler is the one their client is
  # registered against, and it holds no in-force authorization at any site they own — so it is refused,
  # exactly like a third party's. Legacy allowed this read (SecurityUtils.hasScalerAccess compared
  # SCALER.CLIENT_NUMBER and nothing else); the rule was narrowed deliberately on 2026-08-20 because that
  # column records an association, not a current engagement.
  @p0
  Scenario: A scaler of my own client is refused when it is not authorized at a site I own
    When I browse directly to a scaler record of my own client
    Then I should be told I have no access to that record

  @p0
  Scenario: Another client's scaler record is refused by direct URL
    When I browse directly to a scaler of another client
    Then I should be told I have no access to that record

  # §4's first bullet, and note 2 in this file's header: "select information on scalers authorized to
  # scale at their sites". The scaler belongs to a THIRD client and is employed by nobody this owner is
  # entitled to — the only thing that admits it is an in-force authorization at a site this client OWNS,
  # which is the mirror of the industry scaler's site bridge.
  #
  # Same seed-inside-one-scenario shape as the site scenarios, for the same `fullyParallel` reason, and on
  # its own scaler anchor: seeding onto `otherScalerLicenceNo` instead would make the two "another
  # client's scaler is refused" scenarios above flap, since that scaler would be reachable while the seed
  # was live.
  @p0
  Scenario: A scaler authorized at a site I own is readable only while that authorization exists
    When I browse directly to the scaler authorized at my site
    Then I should be told I have no access to that record
    Given another client's scaler has been authorized to scale at a site I own
    When I browse directly to the scaler authorized at my site
    Then the record should load

  # Owner-only site scope (note 1 in this file's header). The site is owned by a DIFFERENT client and one
  # of THIS client's scalers holds a currently in-force authorization there — the exact combination that
  # admits an industry scaler and must NOT admit an owner. The authorization is seeded mid-scenario and
  # deleted on teardown, because it must be in force TODAY and a static extract cannot hold
  # today-relative state.
  #
  # The seed is what gives this scenario its teeth. Refusing a site with no authorization present would
  # pass just as well under the old shared owner-OR-authorized predicate, so it would not detect a
  # regression to it; refusing one WITH a live authorization can only pass while site scope is resolved
  # per role. The seed fixture fails the scenario if the POST does not succeed, so the authorization
  # cannot be quietly absent.
  @p0
  Scenario: A site I do not own stays refused even while an in-force authorization exists
    When I browse directly to the site I am authorized at
    Then I should be told I have no access to that record
    Given my own scaler has been authorized to scale at another company's site
    When I browse directly to the site I am authorized at
    Then I should be told I have no access to that record

  # ------------------------------------------------------------------ API level

  @p0
  Scenario: My own scale site record is served by the API
    When I request my own scale site from the API
    Then the API should allow it

  @p0
  Scenario: Another client's scale site is refused by the API
    When I request a scale site owned by another client from the API
    Then the API should refuse it as out of my client scope

  # The API half of the same narrowing. Paired with the admin contrast two scenarios down, so the 403
  # cannot be a broken endpoint.
  @p0
  Scenario: A scaler of my own client is refused by the API when not authorized at a site I own
    When I request a scaler of my own client from the API
    Then the API should refuse it as out of my client scope

  @p0
  Scenario: Another client's scaler is refused by the API
    When I request a scaler of another client from the API
    Then the API should refuse it as out of my client scope

  # The API half of the scaler bridge, on its own scaler anchor for the same reason the site pair uses two
  # sites. It asks for the DETAIL read specifically: that endpoint carries a second, service-level guard
  # of its own (`ScalerService.getScaler`), and when the bridge was first added that guard still compared
  # employers only — so the interceptor admitted the request and the service then refused it. The tabs
  # (`/address`, `/exams`) had no such guard and passed, which is why nothing caught it. Asserting the
  # detail read is what pins the two layers agreeing.
  @p0
  Scenario: The API serves a scaler authorized at a site I own only while that authorization exists
    When I request the scaler authorized at my site from the API
    Then the API should refuse it as out of my client scope
    Given another client's scaler has been authorized at a site I own for the API query
    When I request the scaler authorized at my site from the API
    Then the API should allow it
    When I request that scaler's address and exam history from the API
    Then the API should allow both of them

  # Same single-scenario shape as the URL-level pair above, and against a DIFFERENT site — two scenarios
  # seeding one site overlap under `fullyParallel`, so each seeding scenario owns its own anchor.
  #
  # The last two steps are what make this more than a repeat of the URL scenario: the SAME site, the SAME
  # live authorization, the SAME forest client — only the role differs, and the industry scaler is
  # admitted. That is the per-role split stated as a contrast rather than asserted twice, and it also
  # proves the seeded authorization really is in force, so the owner's refusal cannot be explained away
  # as a dead or mis-seeded row.
  @p0
  Scenario: The API refuses a site I do not own even while an in-force authorization exists
    When I request the site I am authorized at from the API
    Then the API should refuse it as out of my client scope
    Given my own scaler has been authorized at the site I query by API
    When I request the site I am authorized at from the API
    Then the API should refuse it as out of my client scope
    When I request that same site as an industry scaler of my own client
    Then the API should allow it

  # ------------------------------------------------------------------ the server-side override
  #
  # Every other scoping assertion here sends the owner's OWN client, so all of them would still pass if
  # `ScaleSiteService`/`ScalerService`'s "override if the user messed with the form" were deleted. These
  # two are the only ones that ask for SOMEONE ELSE'S rows and check what comes back — the rows are the
  # evidence, because the status is 200 either way.
  @p0
  Scenario: Asking the API for another client's scale sites returns my own
    When I search the API for another client's scale sites
    Then the API should return only my own scale sites

  @p0
  Scenario: Asking the API for another client's scalers returns my own
    When I search the API for another client's scalers
    Then the API should return only my own client's scalers

  # 403 before 404 for a scoped caller: `ClientScopeInterceptor` runs before the handler, so a
  # nonexistent id is refused rather than reported missing. That is deliberate — it removes an existence
  # oracle over the whole site keyspace — and is asserted so nobody files it as a bug. Internal users
  # still get 404, which the contrast half proves.
  @p1
  Scenario: A scale site that does not exist is refused, not reported missing
    When I request a scale site that does not exist from the API
    Then the API should refuse it as out of my client scope

  @p1
  Scenario: An administrator is told the same scale site does not exist
    When I request a scale site that does not exist as a system administrator
    Then the API should report it as not found for a system administrator
