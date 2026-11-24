# Re-grounded onto the new app's Scaling Exception Report screen (route `/reports/scaling-exception` →
# `pages/Reports/ScalingException` → shared `ReportPage` + `SortOptions`), which lists authorization
# exceptions that occurred on the date of scale. Its date controls are named for the domain
# (`from-scale-date` / `to-scale-date`, NOT the generic `from-date`/`to-date` the sibling screens use) while
# the payload still carries the generic `fromDate`/`toDate` — that rename is exactly the kind of wiring slip
# a payload assertion catches, so both halves are asserted below.
#
# Sort codes (`sortMap` in the page): Date of Scale=1, Scaler Licence Number=2, Scale Site Number=3; no
# secondary sort = 0. Real generation is covered in `generation.feature` (the Jasper blocker was resolved
# 2026-08-11); shared delivery/download behaviour is authored once on the archetype screen —
# `features/rpt/uc-rpt-010-scaler-register/`. See coverage.md.
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-006
Feature: Generate Scaling Exception Report

  @p1
  Scenario: The Scaling Exception Report parameter form renders its full control set
    Given I open the "Scaling Exception" report
    Then the "Scaling Exception" report screen is displayed
    And the report parameter "reg-dist" is displayed
    And the report parameter "from-scale-date" is displayed
    And the report parameter "to-scale-date" is displayed
    And the report sort order options are displayed
    And the report output options are displayed

  @p1
  Scenario: Submitting an untouched form sends the documented default parameters
    Given I open the "Scaling Exception" report
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value    |
      | regDist        | ALL      |
      | primarySort    | 1        |
      | secondarySort  | 0        |
      | outputFormat   | PDF      |
      | preview        | true     |
      | fromDate       | (absent) |
      | toDate         | (absent) |
      | emailRecipient | (absent) |

  @p1
  Scenario: The scale-date window maps onto the generic date fields of the request
    Given I open the "Scaling Exception" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-scale-date" to "2024-01-01"
    And I set the report date "to-scale-date" to "2024-12-31"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field    | value      |
      | regDist  | DCC        |
      | fromDate | 2024-01-01 |
      | toDate   | 2024-12-31 |

  @p1
  Scenario: Chosen sort order and file format map onto the request parameters
    Given I open the "Scaling Exception" report
    When I set the report primary sort to "Scale Site Number"
    And I set the report secondary sort to "Scaler Licence Number"
    And I set the report file format to "MS Excel"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field         | value |
      | primarySort   | 3     |
      | secondarySort | 2     |
      | outputFormat  | XLS   |

  @p1
  Scenario: Preview No with a valid recipient requests email delivery
    Given I open the "Scaling Exception" report
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
    Given I open the "Scaling Exception" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the "Scaling Exception" report
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent

  @p2
  Scenario: Reset returns every parameter to its default
    Given I open the "Scaling Exception" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-scale-date" to "2024-01-01"
    And I set the report primary sort to "Scale Site Number"
    And I set the report file format to "MS Excel"
    And I reset the report parameters
    Then the report parameter "reg-dist" has the value ""
    And the report parameter "from-scale-date" has the value ""
    And the report parameter "primary-sort" has the value "Date of Scale"
    And the report parameter "file-format" has the value "PDF"
    And no report request should be sent
