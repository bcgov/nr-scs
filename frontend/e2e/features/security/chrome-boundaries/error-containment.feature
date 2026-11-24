# Spec: epics.md Epic SEC (SEC-4 System Errors / Global Error) › pages/GlobalError › main.tsx
#       ErrorBoundary › services/APIs.ts interceptors › THIS FILE
#
# WHERE A FAILURE LANDS — the third chrome destination, and the one that was recorded as unreachable.
#
# `coverage.md` used to carry three gaps here, all with the same shape: "not drivable".
#
#   CG-2  /error          — "reaching it needs a router-level throw that no navigation produces"
#   CG-3  ErrorBoundary   — "needs a fault-injection hook the app does not have"
#   CG-4  the 401 path    — "mock auth never expires, so the path cannot be entered"
#
# Two of those were wrong about the lever rather than the destination, and this file is the correction.
#
#   A render crash needs no hook. A response whose SHAPE is wrong is a fault: the scaler read is stubbed
#   with a well-formed HTTP 200 whose `licenceTypes` is a string instead of an array, and
#   `formatLicenceTypes` calls `.map` on it after a length check that a string passes.
#
#   The 401 path needs no clock. The interceptor branches on the RESPONSE — 401 plus an `Authorization`
#   header — and every SCS call carries one via `jsonHeaders(token)`. A stubbed 401 enters exactly the
#   branch a real expiry would.
#
# CG-2 was right that /error could not be reached in its intended state — but not for the reason it
# gave, and the real reason is a defect rather than a testing limitation. That defect (defects.md D2) is
# DOCUMENTED here rather than asserted; see the last section for what that costs.
#
# ── THE FAULT INJECTION IS IMPLEMENTATION-COUPLED, DELIBERATELY ─────────────────────────────────────
# There is no other lever. If the app hardens that path, the injection stops crashing anything and the
# scenario FAILS with a message saying precisely that — because the ErrorBoundary would then be
# untested again, and a scenario that quietly asserts nothing is worse than a red one.
@sec @SEC-11 @cross-cutting @chrome
Feature: Cross-cutting — failures are contained, reported, and disclose nothing

  # ---------------------------------------------------------------- the crash boundary (known debt F5)
  #
  # F5 is recorded as "No React Error Boundary — uncaught component error takes down the full app". The
  # boundary exists now (`components/ErrorBoundary`, mounted in main.tsx) and had NO test at any level.
  # This is that test.

  @p0
  Scenario: A malformed server response is contained instead of blanking the application
    Given I am signed in as a system administrator for the chrome pages
    And the server answers the record read with the wrong shape
    When I open a record that needs the server
    Then the crash should be contained instead of blanking the app

  # ---------------------------------------------------------------- the 5xx reporting path (debt F6)

  @p1
  Scenario: A server error is reported through the global handler
    Given I am signed in as a system administrator for the chrome pages
    And the server fails on the record read
    When I open a record that needs the server
    Then a server error should be reported to the user

  # ---------------------------------------------------------------- session expiry (was CG-4)
  #
  # The ledger recorded this as "a 401 shows a banner with no re-authentication redirect". That is not
  # what the code does: `services/APIs.ts:67-95` signs out and redirects to the landing page on any 401
  # that carried an Authorization header. The banner is the 5xx path, above. Both are asserted here so
  # the two are not confused again.

  @p0
  Scenario: An expired session sends the user back to sign in
    Given I am signed in as a system administrator for the chrome pages
    And the session has expired
    When I open a record that needs the server
    Then I should be returned to the welcome page to sign in again

  # The loop-prevention branch. The redirect TARGET is the welcome page, so a 401 raised BY the welcome
  # page would redirect to the page that raised it — forever. `!isAlreadyOnWelcome` is what stops that,
  # and this is the only scenario that can tell the guard from its absence.
  @p1
  Scenario: A 401 raised by the welcome page does not redirect to itself
    Given I am signed in as a system administrator for the chrome pages
    And the session has expired and the welcome read is the one that notices
    When I open the chrome route "/welcome"
    Then I should be left on the welcome page rather than redirected in a loop

  # ---------------------------------------------------------------- /error: SEC-4's page never renders
  #
  # CG-2 said reaching this page "needs a router-level throw that no navigation produces on demand".
  # The truth is worse and simpler: the page cannot render AT ALL, by either route in.
  #
  #   By a throw.   `routePaths.tsx` declares `errorElement` as a route option and NO route sets one —
  #                 and it would be inert anyway, because `errorElement` is a data-router feature and
  #                 `App.tsx` composes plain <Routes>/<Route>.
  #   By its URL.   `pages/GlobalError` calls `useRouteError()`, which throws
  #                 "useRouteError must be used within a data router." So navigating to /error crashes,
  #                 and the app-level ErrorBoundary catches it.
  #
  # Measured 2026-09-04: `/error` renders `<h1>Something went wrong</h1>` — the ErrorBoundary fallback,
  # not the Global Error page — with zero `<pre>` elements.
  #
  # ── THE DIVERGENCE IS DOCUMENTED, NOT ASSERTED — AND THAT IS A DELIBERATE DEPARTURE ───────────────
  # This file briefly carried a `@discovered-divergence` scenario asserting the SPEC (that the Global
  # Error page renders), kept deliberately red the way this suite's README prescribes. It was removed on
  # request so the branch runs clean.
  #
  # What that costs, stated so nobody has to rediscover it: the divergence is now prose only. Nothing
  # will flip green when `/error` is fixed, and nothing here will notice if the fix ships with the
  # `<pre>{error.stack}</pre>` disclosure still in place. `defects.md` D2 carries the finding and the
  # verbatim scenario + step to restore, so putting it back is a copy-paste.
  #
  # What is kept is the behaviour that actually ships, asserted green: opening /error is CONTAINED. That
  # is also the more valuable of the two ErrorBoundary probes — it needs no stub and no payload
  # knowledge, because the page throws on its own every time.

  @p0
  Scenario: Opening the global error route is contained rather than blanking the app
    Given I am signed in as a system administrator for the chrome pages
    When I open the chrome route "/error"
    Then the crash fallback should be shown instead

  # And the containment holds for a roleless user too — who reaches the same crash, since the chrome
  # routes carry no permission gate.
  @p2
  Scenario: A roleless user opening the global error route is also contained
    Given I am signed in with no recognised role
    When I open the chrome route "/error"
    Then the crash fallback should be shown instead
    And no navigation should be offered
