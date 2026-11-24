# Spec: epics.md Epic SEC (SEC-4 disabled interstitial), UC-SYS-002 / UC-SYS-006
#       › components/Layout (the guard) › pages/SystemDisabled › THIS FILE
#
# THE SHUT-OUT BOUNDARY — the third destination, alongside refused and not-found.
#
# When the system is disabled every authenticated NON-administrator is diverted to a standalone
# interstitial, and administrators are deliberately let through so somebody can turn it back on. That
# asymmetry is the whole design (`Layout` computes `enforceDisableCheck = isLoggedIn && !isAdmin`), and
# it is the part worth pinning: a guard that shut out administrators too would be unrecoverable.
#
# HOW THE STATE IS DRIVEN, and why it is honest. The flag is not a setting — `SystemStatusService` takes
# `@Value("${scs.app.enabled:true}")` into a FINAL field at construction, so nothing at runtime can
# change it and there is no endpoint to toggle. The scenarios therefore stub the status response the
# `Layout` guard reads.
#
# What that covers: the frontend guard, which is the entirety of the interstitial's behaviour.
# What it does NOT cover: `SystemStatusFilter`'s 503 on the backend. That needs a backend started with
# the property set, which no E2E run can arrange. Recorded as coverage.md CG-1 rather than faked.
#
# The stub is per-page-context and torn down with it, so nothing leaks to a parallel worker — which is
# also why this is not driven by mutating shared state even if there were a way to.
@sec @SEC-11 @cross-cutting @chrome
Feature: Cross-cutting — the system-disabled interstitial

  @p1
  Scenario: A non-administrator is shown the interstitial instead of the app
    Given I am signed in as an industry scaler with a forest client
    And the system reports itself disabled
    When I open the chrome route "/welcome"
    Then the disabled interstitial should be shown
    And the application shell should not be mounted

  # The asymmetry, and the reason the scenario above is not simply "the app is down for everyone".
  #
  # The last line is what makes this scenario mean anything. `Layout` gates the status query on
  # `!isSystemAdministrator(user)`, so an administrator never issues the probe — the stub above cannot
  # reach this path, and "reaches the app" alone would read identically with the system ENABLED.
  # Asserting the probe never happened tests the exemption at its actual mechanism.
  @p1
  Scenario: An administrator still reaches the app while the system is disabled
    Given I am signed in as a system administrator for the chrome pages
    And the system reports itself disabled
    When I open the chrome route "/welcome"
    Then the application should load normally
    And the system status should never have been consulted

  # The other half of the pairing: the same non-administrator, no stub, reaches the app. Without this
  # the first scenario would also pass against a user who could never load the app at all.
  @p1
  Scenario: The same non-administrator reaches the app when the system is enabled
    Given I am signed in as an industry scaler with a forest client
    When I open the chrome route "/welcome"
    Then the application should load normally
