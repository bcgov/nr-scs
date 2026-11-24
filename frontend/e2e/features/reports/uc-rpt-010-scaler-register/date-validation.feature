# ── FIXED 2026-08-11 (was `date-validation-divergence.feature`, @discovered-divergence ×2) ──────────────
# Legacy UC-RPT-010 validated the report's date window in `ScalerRegisterReportBo.validateScaleSiteRep()`:
#   S05  `OAValidator.validateFromDateBeforeToDate()` → error, "no report is dispatched to JCRS"
#   S03/S04  `OAValidator.isDate()` on From/To → field error, "no report is dispatched to JCRS"
# Neither was implemented on the new screen: an inverted window was accepted and POSTed, and a mistyped entry
# was silently dropped so the report ran unfiltered. Both were filed as divergences and reproduced red.
#
# THE FIX. The ordering rule is now enforced on this screen (and on the five other report screens that were
# missing it) through the shared `utils/reportDateRange.validateReportDateRange` helper, which the two
# District Performance screens were also migrated onto — so one implementation now serves all eight report
# screens instead of two duplicated copies and six gaps. `handleSend` returns BEFORE dispatching when the
# window is invalid, which is what the prove-the-negative below asserts.
#
# RE-GROUNDING (deliberate, decided with BA input). The message is the new app's own wording,
# "To Date must be on or after From Date.", NOT the legacy "From Date must be less than or equal the To
# Date." — because the District Performance screens already shipped that wording for this exact rule, so
# using the legacy text would have left six screens disagreeing with two about one rule. Same treatment the
# email messages already get (legacy "The Email Recipient is not in a valid format." → "Email Recipient must
# be a valid email address.").
#
# WHERE THE MESSAGE APPEARS. On the To Date field, once. `validateReportDateRange` mirrors its cross-field
# `rangeError` onto `toError` and the screens render only that, so the message stays attached to an input
# (`aria-describedby`). It is asserted through the same `the report date "…" shows the error` step as the
# per-field messages — there is no form-level banner to assert separately.
#
# S03/S04 CLOSED AS "NOT A DEFECT" rather than fixed — see the second scenario, and defects.md #2. A mistyped
# date cannot reach the screen at all: the Carbon DatePicker behind `DateInput` discards text it cannot parse,
# so the value arrives as an empty string. Making the app report "must be a valid date" would mean changing
# that shared component, which 39 files across every domain depend on — disproportionate to a control that
# already prevents a bad date from reaching the report, and visibly clears the field as it does so. The
# second scenario pins that protective behaviour so a future DateInput change that started letting garbage
# through would fail here.
#
# Read-only, parallel-safe, no cleanup. Reg / Dist is filtered to DCC in the first scenario purely to keep the
# (now blocked) submit cheap if the fix ever regresses — see defects.md #4.
@rpt @UC-RPT-010
Feature: Generate Scaler Register Report — Date Window Validation

  @S05 @p1
  Scenario: An inverted date window is rejected before the report is requested
    Given I open the "Scaler Register" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2024-12-31"
    And I set the report date "to-date" to "2024-01-01"
    Then the report date "to-date" shows the error "To Date must be on or after From Date."
    When I submit the report
    Then no report request should be sent

  @S05 @p2
  Scenario: Correcting the window clears the error and allows the report
    Given I open the "Scaler Register" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2024-12-31"
    And I set the report date "to-date" to "2024-01-01"
    Then the report date "to-date" shows the error "To Date must be on or after From Date."
    When I set the report date "to-date" to "2025-06-30"
    Then the report date "to-date" shows no error
    When I submit the report
    Then one report request should be sent

  @S03 @S04 @p2
  Scenario: A mistyped date is discarded by the control so no bad filter reaches the report
    Given I open the "Scaler Register" report
    When I set the report date "from-date" to "not-a-date"
    Then the report parameter "from-date" has the value ""
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field    | value    |
      | fromDate | (absent) |
