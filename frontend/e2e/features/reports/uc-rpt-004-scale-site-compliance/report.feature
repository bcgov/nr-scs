# Re-grounded onto the new app's Scale Site Compliance Report screen (route
# `/reports/scale-site-compliance/:inspectionId` → `pages/Reports/ScaleSiteCompliance` → shared `ReportPage`).
#
# This is the ONLY report in the tab launched IN CONTEXT: it takes no parameters of its own — the subject (a
# site inspection) arrives in the ROUTE, and the form shows output options only. So the two behaviours worth
# covering are (a) the route parameter reaching the payload as a NUMBER, and (b) the guard that refuses a
# non-numeric route id. Because there are no parameter controls, the screen also passes
# `showParametersHeading={false}` — hence no "choose your parameters" heading is asserted.
#
# The inspection is pinned to a REAL legacy record (`fixtures/rpt/report-test-data.ts`
# `complianceInspectionId` = 322429, site 520, from `GET /api/scale-sites/520/inspections`) rather than the
# seeded inspection 97, whose id the INS suites create and delete. The screen never fetches the inspection —
# it only forwards the id — but pinning a real one keeps the suite's real-data discipline and means the
# scenario is a real inspection whose report `generation.feature` now renders end-to-end.
#
# Real generation for this report is covered in `generation.feature` (the Jasper blocker was resolved
# 2026-08-11). See coverage.md.
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-004
Feature: Generate Scale Site Compliance Report

  @p1
  Scenario: The compliance report opens for an inspection showing output options only
    Given I open the Scale Site Compliance report for the sample inspection
    Then the "Scale Site Compliance" report screen is displayed
    And the report output options are displayed

  @p1
  Scenario: The inspection from the route is sent as a numeric parameter
    Given I open the Scale Site Compliance report for the sample inspection
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value    |
      | inspectionId   | 322429   |
      | outputFormat   | PDF      |
      | preview        | true     |
      | emailRecipient | (absent) |

  @p1
  Scenario: A non-numeric inspection id is refused and no form is offered
    Given I open the Scale Site Compliance report with a non-numeric inspection id
    Then no report parameter form is displayed
    And the report shows the invalid-inspection error
    And no report request should be sent

  @p1
  Scenario: Preview No with a valid recipient requests email delivery
    Given I open the Scale Site Compliance report for the sample inspection
    When I set the report Preview Report to No
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value                         |
      | inspectionId   | 322429                        |
      | preview        | false                         |
      | emailRecipient | scs.reports@example.gov.bc.ca |

  @p2
  Scenario: Choosing MS Excel maps onto the request output format
    Given I open the Scale Site Compliance report for the sample inspection
    When I set the report file format to "MS Excel"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field        | value |
      | outputFormat | XLS   |

  @p1 @ERR-email-format
  Scenario: A malformed email recipient is rejected client-side with no report request sent
    Given I open the Scale Site Compliance report for the sample inspection
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the Scale Site Compliance report for the sample inspection
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent

  # Reset clears the output options but MUST NOT disturb the routed inspection context (the page's own
  # comment states this explicitly), so the id is re-asserted on a submit AFTER a reset.
  @p2
  Scenario: Reset clears the output options but keeps the routed inspection
    Given I open the Scale Site Compliance report for the sample inspection
    When I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I set the report file format to "MS Excel"
    And I reset the report parameters
    Then the report parameter "email-recipient" has the value ""
    And the report parameter "file-format" has the value "PDF"
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field        | value  |
      | inspectionId | 322429 |
      | outputFormat | PDF    |
