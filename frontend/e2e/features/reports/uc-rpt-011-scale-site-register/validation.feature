# The two output-option validations (email required when Preview=No; email must be well-formed) live in the
# SHARED `ReportPage.handleSend`, so the messages are identical on every report screen — but each screen
# wires its own `onValidationError`, and each is a separately-reachable route, so each UC asserts them on ITS
# OWN screen. Both run BEFORE any request is dispatched, so each scenario also PROVES no request left the
# browser (the new-app equivalent of the legacy "no report is dispatched to JCRS").
#
# The THIRD validation here is this screen's own, not the shared one: Scale Site # must name a site that
# exists (legacy UC-RPT-011-S03 / `ScaleSiteReportBo.validateScaleSiteRep` → `errors.mark_site_scale`). It
# reaches the server — the screen resolves the number through `GET /api/scale-sites/search` before
# dispatching — but it still blocks BEFORE any report request, so it asserts the same prove-the-negative.
# Site `520` is the suite's stable existing-site anchor (see `fixtures/msd/msd-test-data.ts`); `TEST` is
# chosen to match nothing.
#
# The Scale Site # field also carries two INPUT rules, both legacy behaviours that the new screen had
# dropped (QA-DEV, 2026-09-10): the number is matched case-insensitively (legacy folded the case in
# `ScaleSiteReportBo.setScaleSiteNumber`) and the field stops at 4 characters (legacy
# `scaleSiteRegister.jsp` used `size="4" maxlength="4"`; every legacy validator declared
# `MAXLENGTH_SCALE_SITE_ID_NMBR = 4`). Site `019V` is QA's own repro value and a confirmed seeded site
# (`fixtures/security/scale-site-owner-test-data.ts`); it is used here rather than the suite's usual `520`
# anchor because an all-digit number cannot demonstrate case folding at all.
#
# CROSS-REPO DEPENDENCY — the two Scale Site # input scenarios are NOT self-contained. Their app-side fix
# lives in the `nr-scs` repo on branch `bugfix/ssr-rep-ss-case-insensitive` (commit `dea6dcf`), NOT on
# `nr-scs` main. A red run against main is therefore EXPECTED and is not a test defect. The two do not
# depend on it equally, so check the tag before reaching for the branch:
#   • `@VAL-scale-site-max-length` — FAILS on main. `maxLength={4}` on the `site-number` TextInput is on
#     the branch only, so the field accepts `019VXX` and keeps all six characters.
#   • `@VAL-scale-site-case-insensitive` — expected to PASS on main already: the screen-level fold it
#     asserts (`normalizeSiteNumber`, applied to the payload) shipped with nr-scs #290 on 2026-09-09, a day
#     before QA filed the defect. It is a regression guard on the payload contract, not a red-then-green
#     scenario — do not read a failure here as "the branch is missing".
# The SERVER half of the fix (`upperOrNull` on `P_SCALE_SITE_NMBR`) is deliberately NOT covered from here: the
# screen uppercases before the request is ever made, so no browser-driven scenario can observe it. It is
# pinned by `ReportRequestParametersTest` › `ScaleSiteRegister` in the nr-scs repo instead. Exercising it
# end-to-end also needs a REBUILT WAR, not just a checkout — see defects.md #3.
#
# Message re-grounding: legacy "The Email Recipient is not in a valid format." → the new app's
# "Email Recipient must be a valid email address."; the Preview=No message is verbatim. The unknown-site
# message is verbatim from legacy, re-grounded from a form-level `<html:errors>` banner to the Scale Site #
# field's own inline message.
# Read-only, parallel-safe, no cleanup.
@rpt @UC-RPT-011
Feature: Generate Scale Site Register Report — Output Option Validation

  @p1 @ERR-email-format
  Scenario: A malformed email recipient is rejected client-side with no report request sent
    Given I open the "Scale Site Register" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the "Scale Site Register" report
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent

  @p1 @ERR-scale-site-not-found
  Scenario: A Scale Site # that matches no site is rejected on its own field with no report request sent
    Given I open the "Scale Site Register" report
    When I type "TEST" into the report parameter "site-number"
    And I submit the report
    Then the report parameter "site-number" shows the error "A Scale Site could not be found for TEST."
    And no report request should be sent

  @p2 @ERR-scale-site-not-found
  Scenario: Correcting the Scale Site # clears the error and the report then runs
    Given I open the "Scale Site Register" report
    When I type "TEST" into the report parameter "site-number"
    And I submit the report
    Then the report parameter "site-number" shows the error "A Scale Site could not be found for TEST."
    When I type "520" into the report parameter "site-number"
    Then the report parameter "site-number" shows no error
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field           | value |
      | scaleSiteNumber | "520" |

  @p1 @VAL-scale-site-case-insensitive
  Scenario: A lowercase Scale Site # resolves to the site and the report filters on the stored number
    Given I open the "Scale Site Register" report
    When I type "019v" into the report parameter "site-number"
    And I submit the report
    Then the report parameter "site-number" shows no error
    And one report request should be sent
    And the report request payload includes:
      | field           | value  |
      | scaleSiteNumber | "019V" |

  @p2 @VAL-scale-site-max-length
  Scenario: The Scale Site # field stops at the 4 characters a scale site number can be
    Given I open the "Scale Site Register" report
    When I type "019VXX" character by character into the report parameter "site-number"
    Then the report parameter "site-number" has the value "019V"
