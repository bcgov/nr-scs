# Spec: epics.md Epic SEC — SEC-1 (Welcome / Landing) › UC-SYS-004 › UC-SYS-002 (who authors the value)
#       › pages/Landing `dangerouslySetInnerHTML` + DOMPurify › THIS FILE
#
# STORED HTML, WRITTEN BY ONE ROLE, RENDERED TO ALL OF THEM.
#
# `Current News` is maintained through `/maintenance/system` — one setting row, `WMSG`, writable by
# `ADM` (UC-SYS-002, covered at `features/admin/maintenance/uc-sys-002-system-setting/`). That suite
# proves the value can be saved. It stops there, because the value's other end is a different screen.
#
# This is the other end, and the reason it is a security concern rather than a formatting one:
#
#   `pages/Landing/index.tsx:114`   dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentNews) }}
#   `WelcomeService.java:59-60`     stores and returns the value untouched — no server-side sanitizer
#
# So one client-side call is the entire defence on a path where one role's input becomes every role's
# rendered markup. Nothing else in the suite exercises it: UC-SYS-002 never opens the welcome page, and
# the role suites never look at what the welcome page contains.
#
# ── WHY THE MARKER IS IN EVERY SCENARIO ────────────────────────────────────────────────────────────
# "No script ran" is also true of a page that rendered nothing, and of a sanitizer that discarded the
# whole value. Each payload therefore carries a benign marker that MUST survive alongside the attack
# that must not. Without it this whole file would stay green against a build that stopped rendering
# Current News altogether — the failure mode a security test is most likely to hide.
#
# ── WHY THESE ARE STUBBED ──────────────────────────────────────────────────────────────────────────
# `WMSG` is a singleton row. A scenario that wrote it would have to serialise against every other one
# that does — including UC-SYS-002's suite, in a different file, which Playwright can schedule
# concurrently whatever its mode tag says. The sanitizer is a frontend property, so it is asserted
# against a stubbed response and this file stays `fullyParallel`. The one thing a stub cannot show —
# that the SERVER does not strip the payload either — is paid for once, deliberately, in
# `current-news-round-trip.feature`.
@sec @SEC-1 @cross-cutting @welcome
Feature: Welcome page — Current News is sanitized before it is rendered

  # ---------------------------------------------------------------- the attack shapes

  @p0 @UC-SYS-004 @S02
  Scenario Outline: A welcome message carrying <attack> is rendered inert
    Given I am signed in through IDIR
    And the stored welcome message carries "<attack>"
    When I open the welcome page
    Then nothing should have executed
    And the news should still show its text

    Examples:
      | attack                    |
      | an inline script          |
      | an image error handler    |
      | an SVG load handler       |
      | an iframe                 |

  # The same payloads, asserted at the DOM rather than at execution. Execution is the consequence;
  # these are the causes, and they fail more informatively — "the onerror attribute survived" points at
  # the sanitizer configuration, where "something executed" only says that it did.
  #
  # Split by shape because the two are removed by different sanitizer rules: an element is dropped
  # whole, an attribute is stripped off an element that stays.

  @p1 @UC-SYS-004 @S02
  Scenario: A scripted welcome message keeps its text and loses its script element
    Given I am signed in through IDIR
    And the stored welcome message carries "an inline script"
    When I open the welcome page
    Then the news should show "Scaling notice ONE"
    And the news should carry no "script" element

  @p1 @UC-SYS-004 @S02
  Scenario: An event handler is stripped from an element that is allowed to stay
    Given I am signed in through IDIR
    And the stored welcome message carries "an image error handler"
    When I open the welcome page
    Then the news should show "Scaling notice TWO"
    And the news should carry no "onerror" attribute

  @p1 @UC-SYS-004 @S02
  Scenario: An SVG load handler is stripped
    Given I am signed in through IDIR
    And the stored welcome message carries "an SVG load handler"
    When I open the welcome page
    Then the news should show "Scaling notice THREE"
    And the news should carry no "onload" attribute

  @p1 @UC-SYS-004 @S02
  Scenario: An embedded frame does not survive
    Given I am signed in through IDIR
    And the stored welcome message carries "an iframe"
    When I open the welcome page
    Then the news should show "Scaling notice FOUR"
    And the news should carry no "iframe" element

  # ---------------------------------------------------------------- and the other direction
  #
  # What stops the sanitizer from being "fixed" by dropping everything. Current News is a message board;
  # an administrator marking up a reminder is the normal case, and it has to survive. This is the
  # scenario that would fail if someone replaced the sanitize call with a strip-tags.

  @p1 @UC-SYS-004 @S02
  Scenario: Ordinary formatting an administrator uses is not stripped
    Given I am signed in through IDIR
    And the stored welcome message uses ordinary formatting
    When I open the welcome page
    Then the news should show "quarterly returns"
    And ordinary formatting should survive
    And nothing should have executed
