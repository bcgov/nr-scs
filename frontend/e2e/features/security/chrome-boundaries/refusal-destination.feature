# Spec: epics.md Epic SEC (SEC-2 Not Authorized, SEC-5 global error) › ProtectedRoute › routePaths.tsx
#       › pages/RoleError, pages/NotFound › THIS FILE
#
# WHERE A REFUSAL LANDS — the other side of every role suite's deny matrix.
#
# Eleven role suites prove that routes a role must not reach are refused. Not one of them asks what the
# DESTINATION of that refusal is like. Yet `/unauthorized` is a single page reached from ~73 use-case
# slices across every domain (epics.md SEC-2), so anything wrong with it is wrong everywhere at once —
# and nothing else in the suite would see it.
#
# Three questions, none of which belongs to a role:
#
#   Does the destination leak?     Chrome pages are NOT permission-gated — they cannot be, or a refusal
#                                  would forward to a route that refuses, and loop. So the only thing
#                                  keeping them from showing a user the whole app is the nav tree.
#   Does the way out work?         The page is a dead end reached by navigation. Its own javadoc says
#                                  the buttons exist for a role with no side-nav entries at all.
#   Is an unknown URL the same?    `path: '*'` has no ProtectedRoute, so NotFound renders for anyone.
#
# THE IDENTITY UNDER TEST is a user with no recognised role. That is not a contrived case: a
# client-scoped role provisioned without a forest client resolves to exactly it — the documented
# fail-closed behaviour for a misprovisioned BCeID account.
#
# Navigation is COUNTED, not enumerated. The side nav renders labels into nested spans, so a name-based
# assertion matches nothing and passes silently. Counts at authoring time: administrator 31 affordances,
# industry scaler 3, no recognised role 0.
@sec @SEC-11 @cross-cutting @chrome
Feature: Cross-cutting — the refusal and not-found destinations

  # ---------------------------------------------------------------- the refusal page leaks nothing

  @p0
  Scenario: A user with no recognised role reaches the refusal page and is offered no way in
    Given I am signed in with no recognised role
    When I open the chrome route "/unauthorized"
    Then the refusal page should be shown
    And no navigation should be offered

  # The contrast, on the SAME page. Without it the assertion above is satisfied by a page that renders
  # no navigation for anybody — which would prove nothing about the role.
  @p1
  Scenario: The same page offers an administrator its navigation
    Given I am signed in as a system administrator for the chrome pages
    When I open the chrome route "/unauthorized"
    Then the refusal page should be shown
    And navigation should be offered

  # And to a role between the two, so the count is tracking the role's entitlement rather than merely
  # "signed in or not".
  @p1
  Scenario: The same page offers an industry scaler its own navigation
    Given I am signed in as an industry scaler with a forest client
    When I open the chrome route "/unauthorized"
    Then the refusal page should be shown
    And navigation should be offered

  # ---------------------------------------------------------------- the not-found catch-all
  #
  # `path: '*'` carries no ProtectedRoute, so an unmatched URL renders for anyone — correct, since a
  # 404 that required a permission would leak which URLs exist. What matters is that it leaks no
  # navigation either.

  @p1
  Scenario: An unknown route falls through to Not Found and offers a roleless user no way in
    Given I am signed in with no recognised role
    When I open the chrome route "/no-such-page-xyz"
    Then the not-found page should be shown
    And no navigation should be offered

  @p1
  Scenario: The same unknown route offers an administrator its navigation
    Given I am signed in as a system administrator for the chrome pages
    When I open the chrome route "/no-such-page-xyz"
    Then the not-found page should be shown
    And navigation should be offered

  # ---------------------------------------------------------------- a deliberately-removed screen
  #
  # defects.md D3. Legacy carried an administrator-only diagnostic at `/testMessages.do` (Epic SEC story
  # SEC-6), which the new app does not reimplement — an INTENTIONAL product decision, not an omission.
  #
  # Asserted rather than left as prose because the not-found catch-all is what makes that decision safe:
  # a removed screen has to become "no such page", and it has to become that for the one role legacy
  # granted it to. An administrator is used deliberately — a roleless user landing on Not Found proves
  # nothing about a screen that was administrator-only in the first place.
  #
  # Both the bare path and the legacy `.do` form, because a stale bookmark or a legacy link carries the
  # suffix, and the two are separate strings to the router.
  @p2
  Scenario Outline: The removed diagnostic screen is not served, even to an administrator
    Given I am signed in as a system administrator for the chrome pages
    When I open the chrome route "<legacy route>"
    Then the not-found page should be shown

    Examples:
      | legacy route     |
      | /testMessages    |
      | /testMessages.do |

  # ---------------------------------------------------------------- the way out

  @p1
  Scenario: The way out of the refusal page works for a role that has a home
    Given I am signed in as an industry scaler with a forest client
    When I open the chrome route "/maintenance/templates"
    Then the refusal page should be shown
    When I follow the way out of the refusal page
    Then I should reach the home page

  # defects.md D1 — was RED, FIXED 2026-08-31.
  #
  # The page used to offer "Go to home page" to a user with no recognised role, and `/welcome` requires
  # WELCOME_READ — so the guard bounced them straight back here, silently. The page's javadoc said
  # these controls existed precisely for "an unrecognised role, or one whose permissions are not
  # enabled yet", which is the user they did not serve.
  #
  # The fix branches on the same predicate the guard uses (`hasWelcomeAccess`). The scenario below is
  # kept deliberately fix-agnostic — it guards the property (no silent loop) rather than the shape of
  # today's remedy, which the two scenarios after it pin explicitly.
  @p2
  Scenario: The way out does not loop for a user with no home to go to
    Given I am signed in with no recognised role
    When I open the chrome route "/unauthorized"
    Then the refusal page should be shown
    And the way out should not lead back to the refusal page

  # What shipped: the two controls that cannot work are replaced by the one that can. Logging out is
  # the only action available to a user every route refuses, since signing in as someone else is the
  # whole remedy.
  @p1
  Scenario: A user with no home is offered a logout instead of the two dead controls
    Given I am signed in with no recognised role
    When I open the chrome route "/unauthorized"
    Then the refusal page should be shown
    And the refusal page should offer a way to log out
    And the refusal page should not offer a way out it cannot honour

  # The other half of the branch, and what stops the fix from over-reaching: a user refused only THIS
  # page still has a home, so nothing changes for them. Without this the fix could have swapped every
  # user onto a logout button and both scenarios above would still pass.
  @p1
  Scenario: A role refused only this page keeps the ordinary controls
    Given I am signed in as an industry scaler with a forest client
    When I open the chrome route "/maintenance/templates"
    Then the refusal page should be shown
    And the refusal page should offer the ordinary way out
