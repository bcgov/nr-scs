# Re-grounded onto the new app's District Site Inspection Performance screen (route
# `/reports/district-site-inspection-performance` → `pages/Reports/DistrictSiteInspectionPerformance` →
# shared `ReportPage`). This screen is the STRUCTURAL TWIN of UC-RPT-013's District Check Scale Performance:
# same three parameters, same `validateDates` implementation (required From/To, ordering, one-year cap), same
# messages, different endpoint and Jasper report.
#
# It is covered on its own rather than by pointing at UC-RPT-013 precisely BECAUSE they are clones: the two
# screens are separate files with duplicated validation logic, so a change applied to one and not the other is
# a realistic regression that only a per-screen assertion catches. The four date rules are therefore asserted
# here too (they are the substantial behaviour), each proving no request left the browser.
#
# Real generation for this report is covered in `generation.feature` (the Jasper blocker was resolved
# 2026-08-11). See coverage.md.
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-014
Feature: Generate District Site Inspection Performance Report

  @p1
  Scenario: The District Site Inspection Performance parameter form renders its full control set
    Given I open the "District Site Inspection Performance" report
    Then the "District Site Inspection Performance" report screen is displayed
    And the report parameter "reg-dist" is displayed
    And the report parameter "from-date" is displayed
    And the report parameter "to-date" is displayed
    And the report output options are displayed

  @p1 @ERR-from-required
  Scenario: Submitting with no dates reports both as required and sends nothing
    Given I open the "District Site Inspection Performance" report
    When I submit the report
    Then the report date "from-date" shows the error "From Date is required."
    And the report date "to-date" shows the error "To Date is required."
    And no report request should be sent

  @p1 @ERR-date-order
  Scenario: An inverted window is rejected as soon as it is entered and sends nothing
    Given I open the "District Site Inspection Performance" report
    When I set the report date "from-date" to "2024-12-31"
    And I set the report date "to-date" to "2024-01-01"
    Then the report date "to-date" shows the error "To Date must be on or after From Date."
    When I submit the report
    Then no report request should be sent

  @p1 @ERR-date-range
  Scenario: A window longer than one year is rejected and sends nothing
    Given I open the "District Site Inspection Performance" report
    When I set the report date "from-date" to "2023-01-01"
    And I set the report date "to-date" to "2024-06-30"
    Then the report date "to-date" shows the error "Search date range cannot be more than 1 year(s)."
    When I submit the report
    Then no report request should be sent

  @p1
  Scenario: Supplying the required dates sends the documented default parameters
    Given I open the "District Site Inspection Performance" report
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
    Given I open the "District Site Inspection Performance" report
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
    Given I open the "District Site Inspection Performance" report
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

  @p1 @ERR-email-format
  Scenario: A malformed email recipient is rejected client-side with no report request sent
    Given I open the "District Site Inspection Performance" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the "District Site Inspection Performance" report
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent
