# Re-grounded onto the new app's District Check Scale Performance screen (route
# `/reports/district-check-scale-performance` → `pages/Reports/DistrictCheckScalePerformance` → shared
# `ReportPage`). Render + payload mapping + output-option validation; the screen's own date rules are covered
# separately in `date-validation.feature` (they are the substantial part of this UC).
#
# NOTE: because From/To are REQUIRED here, there is no "submit an untouched form" default-payload scenario —
# an untouched submit is a validation failure (covered in date-validation.feature), so the defaults are
# asserted on a submit that supplies only the required dates.
#
# This is also the one report whose BACKEND validates the same window: `ReportService`
# `fetchDistrictPerformanceResponse` throws 400 on null request, missing dates, from-after-to, and a range
# over one year. The client blocks all four first, so the backend rules are unreachable from the UI — they are
# covered at the unit level (`ReportServiceTest`) rather than here. Jasper generation itself is
# Real generation for this report is covered in `generation.feature` (the Jasper blocker was resolved
# 2026-08-11). See coverage.md.
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-013
Feature: Generate District Check Scale Performance Report

  @p1
  Scenario: The District Check Scale Performance parameter form renders its full control set
    Given I open the "District Check Scale Performance" report
    Then the "District Check Scale Performance" report screen is displayed
    And the report parameter "reg-dist" is displayed
    And the report parameter "from-date" is displayed
    And the report parameter "to-date" is displayed
    And the report output options are displayed

  @p1
  Scenario: Supplying only the required dates sends the documented default parameters
    Given I open the "District Check Scale Performance" report
    When I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value      |
      | regDist        | ALL        |
      | fromDate       | 2024-01-01 |
      | toDate         | 2024-12-31 |
      | outputFormat   | PDF        |
      | preview        | true       |
      | emailRecipient | (absent)   |

  @p1
  Scenario: A chosen org unit and file format map onto the request parameters
    Given I open the "District Check Scale Performance" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I set the report file format to "MS Excel"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field        | value |
      | regDist      | DCC   |
      | outputFormat | XLS   |

  @p1
  Scenario: Preview No with a valid recipient requests email delivery
    Given I open the "District Check Scale Performance" report
    When I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I set the report Preview Report to No
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value                         |
      | preview        | false                         |
      | emailRecipient | scs.reports@example.gov.bc.ca |

  # The shared email rules run in ReportPage.handleSend BEFORE the screen's own date validation, so a
  # malformed email is reported even though the required dates are also missing — asserted deliberately, since
  # it documents the precedence between the two validation layers on this screen.
  @p1 @ERR-email-format
  Scenario: A malformed email recipient is rejected client-side with no report request sent
    Given I open the "District Check Scale Performance" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the "District Check Scale Performance" report
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent

  @p2
  Scenario: Reset clears the parameters and the date errors
    Given I open the "District Check Scale Performance" report
    When I submit the report
    Then the report date "from-date" shows the error "From Date is required."
    When I select the report Reg / Dist "DCC"
    And I reset the report parameters
    Then the report parameter "reg-dist" has the value ""
    And the report parameter "from-date" has the value ""
    And the report parameter "to-date" has the value ""
    And the report date "from-date" shows no error
    And no report request should be sent
