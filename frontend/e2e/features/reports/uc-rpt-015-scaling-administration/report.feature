# Re-grounded onto the new app's Scaling Administration Report screen (route
# `/reports/scaling-administration` → `pages/Reports/ScalingAdministration` → shared `ReportPage`), which
# reports authorization / appointment / MSD counts for an org unit. It is the SIMPLEST screen in the tab — three
# parameters (Reg / Dist + a date window), no sort block — so its render, payload mapping and output-option
# validation are kept in ONE feature file rather than split across three near-empty ones.
#
# covered end-to-end for real in `generation.feature` (the Jasper blocker was resolved 2026-08-11). Shared delivery/download
# behaviour is authored once on the archetype screen — `features/rpt/uc-rpt-010-scaler-register/`. See
# coverage.md.
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-015
Feature: Generate Scaling Administration Report

  @p1
  Scenario: The Scaling Administration Report parameter form renders its full control set
    Given I open the "Scaling Administration" report
    Then the "Scaling Administration" report screen is displayed
    And the report parameter "reg-dist" is displayed
    And the report parameter "from-date" is displayed
    And the report parameter "to-date" is displayed
    And the report output options are displayed

  @p1
  Scenario: Submitting an untouched form sends the documented default parameters
    Given I open the "Scaling Administration" report
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value    |
      | regDist        | ALL      |
      | outputFormat   | PDF      |
      | preview        | true     |
      | fromDate       | (absent) |
      | toDate         | (absent) |
      | emailRecipient | (absent) |

  @p1
  Scenario: A chosen org unit, date window and file format map onto the request parameters
    Given I open the "Scaling Administration" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I set the report file format to "MS Excel"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field        | value      |
      | regDist      | DCC        |
      | fromDate     | 2024-01-01 |
      | toDate       | 2024-12-31 |
      | outputFormat | XLS        |
      | preview      | true       |

  @p1
  Scenario: Preview No with a valid recipient requests email delivery
    Given I open the "Scaling Administration" report
    When I set the report Preview Report to No
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value                         |
      | preview        | false                         |
      | emailRecipient | scs.reports@example.gov.bc.ca |

  @p1 @ERR-email-format
  Scenario: A malformed email recipient is rejected client-side with no report request sent
    Given I open the "Scaling Administration" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the "Scaling Administration" report
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent

  @p2
  Scenario: Reset returns every parameter to its default
    Given I open the "Scaling Administration" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2024-01-01"
    And I set the report file format to "MS Excel"
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I reset the report parameters
    Then the report parameter "reg-dist" has the value ""
    And the report parameter "from-date" has the value ""
    And the report parameter "file-format" has the value "PDF"
    And the report parameter "email-recipient" has the value ""
    And no report request should be sent
