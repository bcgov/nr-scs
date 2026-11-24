# Re-grounded from the legacy submit slice, which asserted the outbound Crystal parameter set rather than the
# rendered PDF. The new-app equivalent is the JSON body of `POST /api/reports/scale-site-register`, built by
# `pages/Reports/ScaleSiteRegister`'s payload useMemo; these scenarios capture the real request in flight
# (steps/fixtures/rpt.ts `reportRequests`) and assert the mapping. Jasper generation itself is
# covered end-to-end for real in `generation.feature` (the Jasper blocker was resolved 2026-08-11).md.
#
# The mappings under test (pages/Reports/ScaleSiteRegister/index.tsx):
#   Reg / Dist blank    → regDist "ALL"      · Scale Type blank → scaleType "ALL"
#   Auth Status         → siteStatus (NOTE the field rename: the control is `authorization-status`, the
#                         payload field is `siteStatus`)
#   Scale Site #        → scaleSiteNumber, OMITTED when blank
#   Primary/Secondary   → numeric codes via primarySortMap (Scale Site Number=1, Name=2, Owner=3,
#                         Client Name=4, Scale Type=5; no secondary = 0)
#   File format         → outputFormat PDF / XLS
#   authorizedScalersOnly → hardcoded `false` (no control exposes it; asserted so a future control cannot
#                         silently change the contract)
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-011
Feature: Generate Scale Site Register Report — Report Parameter Mapping

  @p1
  Scenario: Submitting an untouched form sends the documented default parameters
    Given I open the "Scale Site Register" report
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field                 | value    |
      | regDist               | ALL      |
      | scaleType             | ALL      |
      | siteStatus            | ALL      |
      | primarySort           | 1        |
      | secondarySort         | 0        |
      | outputFormat          | PDF      |
      | preview               | true     |
      | authorizedScalersOnly | false    |
      | scaleSiteNumber       | (absent) |
      | fromDate              | (absent) |
      | toDate                | (absent) |
      | emailRecipient        | (absent) |

  @p1
  Scenario: Chosen filters, sort order and file format map onto the request parameters
    Given I open the "Scale Site Register" report
    When I select the report Reg / Dist "DCC"
    And I choose the report parameter "authorization-status" option "Valid"
    And I type "520" into the report parameter "site-number"
    And I set the report primary sort to "Client Name"
    And I set the report secondary sort to "Scale Type"
    And I set the report file format to "MS Excel"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field           | value |
      | regDist         | DCC   |
      | siteStatus      | VALID |
      | scaleSiteNumber | "520" |
      | primarySort     | 4     |
      | secondarySort   | 5     |
      | outputFormat    | XLS   |
      | preview         | true  |

  @p1
  Scenario: Preview No with a valid recipient requests email delivery
    Given I open the "Scale Site Register" report
    When I set the report Preview Report to No
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value                         |
      | preview        | false                         |
      | emailRecipient | scs.reports@example.gov.bc.ca |

  @p2
  Scenario: A chosen date window is carried on the request
    Given I open the "Scale Site Register" report
    When I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field    | value      |
      | fromDate | 2024-01-01 |
      | toDate   | 2024-12-31 |
