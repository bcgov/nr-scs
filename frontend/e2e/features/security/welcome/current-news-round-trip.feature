# Spec: epics.md Epic SEC — SEC-1 › UC-SYS-002 (the write) + UC-SYS-004 (the read) › WelcomeService
#       › pages/Landing › THIS FILE
#
# THE WHOLE PATH, ONCE — administrator write → Oracle → API → rendered page.
#
# `current-news.feature` stubs the response, which is right for the sanitizer: it is a frontend
# property, and stubbing keeps that file parallel against a SINGLETON setting row. But a stub cannot
# answer the question that decides where a future fix belongs — does anything on the SERVER side strip
# the payload? Only a real write can, so this file pays that cost once and carries the only scenario
# in the suite that mutates `WMSG`.
#
# ── THE SHARED-ROW HAZARD, STATED PLAINLY ──────────────────────────────────────────────────────────
# `WMSG` is one row, and UC-SYS-002's `system.feature` mutates it too. `@mode:serial` orders scenarios
# WITHIN a file; it does not stop Playwright scheduling two files concurrently. Two things make that
# safe rather than merely unlikely:
#
#   - `wmsgGuard` snapshots the original value and restores it on teardown, so the row is left as found
#     even if this scenario fails mid-way;
#   - the scenario asserts the marker from the payload IT wrote. A concurrent overwrite therefore makes
#     it FAIL rather than pass on another scenario's value — a flake in the safe direction, never a
#     false green. That is why the payload is unique to this file.
#
# If this ever does flake, the fix is to move this scenario into `uc-sys-002-system-setting/`'s file so
# the two share one serial group — not to weaken the assertion.
@sec @SEC-1 @cross-cutting @welcome @mode:serial
Feature: Welcome page — Current News survives the round trip inert

  @p0 @UC-SYS-004 @S02
  Scenario: A scripted welcome message is stored verbatim and rendered inert
    Given I am signed in through IDIR
    And an administrator has stored a welcome message containing a script
    When I read the welcome summary from the API
    Then the API should have returned the message unsanitized
    When I open the welcome page
    Then the page should render it inert
