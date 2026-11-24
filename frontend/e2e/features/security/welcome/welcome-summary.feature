# Spec: epics.md Epic SEC — SEC-1 (Welcome / Landing) › UC-SYS-004, UC-SEC-001-S02 › pages/Landing
#       › backend WelcomeService › THIS FILE
#
# THE PAGE EVERY AUTHORIZED USER LANDS ON.
#
# Eleven role suites assert `/welcome` is REACHABLE and stop at the URL; `../chrome-boundaries/` asserts
# where a user who cannot reach it lands instead. Neither asks what the page RENDERS — and SEC-1's own
# acceptance criteria are about exactly that: the org/company the user is filed under, the system
# message, and the role-dependent menu.
#
# The menu half is already covered, cell by cell, by the per-role suites (`@IND`, `@OWN`, `@CHK`, …),
# and is deliberately not repeated here. What is left is the summary grid — which is where the
# interesting divergence lives.
#
# ── THE ORGANIZATION ROW HAS THREE OUTCOMES, AND THEY ARE ASSERTED AS A SET ─────────────────────────
#
#   external, client resolves    → `{companyName} - {clientNumber}`   ← the acceptance criterion
#   external, client unresolved  → the bare client number             ← documented fallback
#   internal                     → EMPTY                              ← defects.md D1
#
# Asserting all three is what makes any of them mean something. The resolving case alone would pass on
# a build that echoed a name unconditionally; the fallback alone would pass on a build that never
# resolved one; and the internal case is the divergence — `WelcomeService` resolves an internal user's
# org unit from an `orgUnitNo` request parameter the frontend never sends, so the row that UC-SYS-004
# names as part of the page is blank for every internal user. Pinned as today's behaviour so it reddens
# when that is fixed.
@sec @SEC-1 @cross-cutting @welcome
Feature: Welcome page — the summary grid

  # ---------------------------------------------------------------- the grid renders for its user

  @p0 @UC-SYS-004 @S01
  Scenario: An internal user lands on the welcome page and sees the system details
    Given I am signed in through IDIR
    When I open the welcome page
    Then the environment details should be shown
    And the Roles should name the signed-in role

  # ---------------------------------------------------------------- Organization, all three arms

  @p0 @UC-SEC-001 @S02
  Scenario: An external owner sees its company name and client number
    Given I am signed in as an owner whose client resolves to a company name
    When I open the welcome page
    Then the Organization should name the company and its client number

  @p1 @UC-SEC-001 @S02
  Scenario: An external user whose client has no company name sees the number alone
    Given I am signed in as an external user whose client has no company name
    When I open the welcome page
    Then the Organization should fall back to the bare client number

  # defects.md D1. The org unit UC-SYS-004 names is never displayed to the users it describes.
  @p1 @UC-SYS-004 @S01
  Scenario: An internal user is shown no organization at all
    Given I am signed in through IDIR
    When I open the welcome page
    Then the Organization should be empty

  # ---------------------------------------------------------------- the read's own failure arm
  #
  # The page distinguishes "the news could not be read" from "there is no news", which matters because
  # the two look identical in an empty cell. Stubbed at the response, since the branch is a property of
  # the page rather than of the backend. A 500 and not a 401: a 401 is intercepted globally and signs
  # the user out instead — that path is `../chrome-boundaries/error-containment.feature`'s.

  @p1 @UC-SYS-004 @S04
  Scenario: A failed welcome read is reported rather than shown as empty news
    Given I am signed in through IDIR
    And the welcome summary cannot be read
    When I open the welcome page
    Then the news should be reported unavailable
