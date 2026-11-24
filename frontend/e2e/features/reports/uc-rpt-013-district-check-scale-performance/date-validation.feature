# The District Check Scale Performance screen is one of only TWO report screens that validate their date
# window (`pages/Reports/DistrictCheckScalePerformance/index.tsx` → `validateDates`), and the ONLY place in
# the Reports tab where From/To are REQUIRED. All four rules are covered here, each proving no request left
# the browser:
#   required From    → "From Date is required."                            (mode 'submit')
#   required To      → "To Date is required."                              (mode 'submit')
#   ordering         → "To Date must be on or after From Date."           (mode 'change' AND 'submit')
#   one-year cap     → "Search date range cannot be more than 1 year(s)." (mode 'change' AND 'submit')
#
# The ordering + cap rules run on CHANGE as well as on submit, so they surface as soon as the second date is
# entered — asserted below without pressing Send for the message, and with Send for the prove-the-negative.
# Both cross-field messages render ONCE, on the To Date field: `validateReportDateRange` mirrors its
# `rangeError` onto `toError` and the screen renders only that, keeping the message attached to an input
# (`aria-describedby`). So they are asserted through the same step as the per-field required messages.
#
# WHY THIS MATTERS BEYOND THIS SCREEN: these are exactly the rules the other six parameter screens OMIT —
# see UC-RPT-010 `date-validation-divergence.feature` + defects.md #1/#2. This file is the green counterpart
# that proves the rules are still wanted in the new app, which is what makes the omission elsewhere a
# divergence rather than an accepted simplification.
#
# Dates are deliberately LITERAL here, unlike most of this suite. Every rule below is span-based (ordering,
# and a cap measured from From to To), so nothing ages: a fixed pair that is one year apart today is still one
# year apart next year. Literals are also the only way to state the boundary exactly — `2024-01-01` to
# `2025-01-01` is precisely one year, which a `daysAgo` pair cannot express (365 vs 366 days flips it across a
# leap year). See coverage.md.
# Read-only: nothing is generated or persisted → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-013
Feature: Generate District Check Scale Performance Report — Date Window Validation

  @p1 @ERR-from-required
  Scenario: Submitting with no dates reports both as required and sends nothing
    Given I open the "District Check Scale Performance" report
    When I submit the report
    Then the report date "from-date" shows the error "From Date is required."
    And the report date "to-date" shows the error "To Date is required."
    And no report request should be sent

  @p1 @ERR-to-required
  Scenario: Submitting with only a From Date reports the To Date as required and sends nothing
    Given I open the "District Check Scale Performance" report
    When I set the report date "from-date" to "2024-01-01"
    And I submit the report
    Then the report date "to-date" shows the error "To Date is required."
    And no report request should be sent

  @p1 @ERR-date-order
  Scenario: An inverted window is rejected as soon as it is entered and sends nothing
    Given I open the "District Check Scale Performance" report
    When I set the report date "from-date" to "2024-12-31"
    And I set the report date "to-date" to "2024-01-01"
    Then the report date "to-date" shows the error "To Date must be on or after From Date."
    When I submit the report
    Then no report request should be sent

  @p1 @ERR-date-range
  Scenario: A window longer than one year is rejected and sends nothing
    Given I open the "District Check Scale Performance" report
    When I set the report date "from-date" to "2023-01-01"
    And I set the report date "to-date" to "2024-06-30"
    Then the report date "to-date" shows the error "Search date range cannot be more than 1 year(s)."
    When I submit the report
    Then no report request should be sent

  @p2 @ERR-date-range
  Scenario: A window of exactly one year is accepted
    Given I open the "District Check Scale Performance" report
    When I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2025-01-01"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field    | value      |
      | fromDate | 2024-01-01 |
      | toDate   | 2025-01-01 |

  @p2 @ERR-date-order
  Scenario: Correcting an inverted window clears the error and allows the request
    Given I open the "District Check Scale Performance" report
    When I set the report date "from-date" to "2024-12-31"
    And I set the report date "to-date" to "2024-01-01"
    Then the report date "to-date" shows the error "To Date must be on or after From Date."
    When I set the report date "to-date" to "2025-06-30"
    Then the report date "to-date" shows no error
    When I submit the report
    Then one report request should be sent
