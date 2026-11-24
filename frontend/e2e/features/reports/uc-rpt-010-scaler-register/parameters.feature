# Re-grounded from UC-RPT-010 S01's SUBMIT scenario and S02 (email delivery). Legacy asserted the outbound
# Crystal parameter set — "the report Crystal parameters include promptex-P_ORG_UNIT_CODE,
# promptex-P_LICENSE_STATUS, promptex-P_SITE_AUTH_STATUS, promptex-P_PRIMARY_SORT" — i.e. it asserted the
# REQUEST the screen built, not the rendered PDF. The new app's equivalent is the JSON body of
# `POST /api/reports/scaler-register`, which `pages/Reports/ScalerRegister` assembles in a useMemo; these
# scenarios capture that request in flight (steps/fixtures/rpt.ts `reportRequests`) and assert the mapping.
#
# WHY THIS ASSERTION STILL EARNS ITS PLACE NOW THAT GENERATION WORKS: the rendered PDF is covered end-to-end
# in `generation.feature`, but a rendered document cannot show WHICH parameters produced it. The parameter
# MAPPING is pure client logic and is exactly what the legacy slice checked. The
# request is allowed to reach the real backend and render; the payload assertion is unaffected by the response.
#
# The mappings under test (pages/Reports/ScalerRegister/index.tsx):
#   Reg / Dist blank        → regDist "ALL"            (`regDist || 'ALL'`)
#   Licence / Appointment   → uppercased via `toCode`   ("Valid" → "VALID", blank → "ALL")
#   Primary/Secondary sort  → numeric codes via primarySortMap (Scaler Last Name=1, License #=2; none=0)
#   File format "MS Excel"  → outputFormat "XLS"        (PDF → "PDF")
#   Preview Yes/No          → preview true/false
#   Empty optional dates    → key OMITTED from the body  (`fromDate || undefined`), asserted as "(absent)"
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-010
Feature: Generate Scaler Register Report — Report Parameter Mapping

  @S01 @p1
  Scenario: Submitting an untouched form sends the documented default parameters
    Given I open the "Scaler Register" report
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value |
      | regDist        | ALL   |
      | licenceStatus  | ALL   |
      | authStatus     | ALL   |
      | appointmentType| ALL   |
      | primarySort    | 1     |
      | secondarySort  | 0     |
      | outputFormat   | PDF   |
      | preview        | true  |
      | fromDate       | (absent) |
      | toDate         | (absent) |
      | emailRecipient | (absent) |

  @S01 @p1
  Scenario: Chosen filters, sort order and file format map onto the request parameters
    Given I open the "Scaler Register" report
    When I select the report Reg / Dist "DCC"
    And I choose the report parameter "licence-status" option "Valid"
    And I choose the report parameter "auth-status" option "Expired"
    And I choose the report parameter "appointment-status" option "Cancelled"
    And I set the report primary sort to "License #"
    And I set the report secondary sort to "Scaler Last Name"
    And I set the report file format to "MS Excel"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value    |
      | regDist        | DCC      |
      | licenceStatus  | VALID    |
      | authStatus     | EXPIRED  |
      | appointmentType| CANCELLED|
      | primarySort    | 2        |
      | secondarySort  | 1        |
      | outputFormat   | XLS      |
      | preview        | true     |

  @S02 @p1
  Scenario: Preview No with a valid recipient requests email delivery
    Given I open the "Scaler Register" report
    When I set the report Preview Report to No
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value                         |
      | preview        | false                         |
      | emailRecipient | scs.reports@example.gov.bc.ca |

  @S03 @S04 @p2
  Scenario: A chosen date window is carried on the request
    Given I open the "Scaler Register" report
    When I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field    | value      |
      | fromDate | 2024-01-01 |
      | toDate   | 2024-12-31 |

  @S01 @p2
  Scenario: Reset returns every parameter to its default
    Given I open the "Scaler Register" report
    When I select the report Reg / Dist "DCC"
    And I choose the report parameter "licence-status" option "Valid"
    And I set the report primary sort to "License #"
    And I set the report file format to "MS Excel"
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I reset the report parameters
    Then the report parameter "reg-dist" has the value ""
    And the report parameter "licence-status" has the value "All"
    And the report parameter "auth-status" has the value "ALL"
    And the report parameter "primary-sort" has the value "Scaler Last Name"
    And the report parameter "file-format" has the value "PDF"
    And the report parameter "email-recipient" has the value ""
    And no report request should be sent
