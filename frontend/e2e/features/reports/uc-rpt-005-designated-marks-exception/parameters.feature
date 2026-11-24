# Re-grounded from the legacy submit slice's outbound parameter set onto the JSON body of
# `POST /api/reports/designated-marks-exception`, captured in flight (steps/fixtures/rpt.ts
# `reportRequests`). covered end-to-end for real in `generation.feature` (the Jasper blocker was resolved 2026-08-11).md.
#
# The distinctive mapping here is the DOUBLE multi-value fan-out: the legacy form's six mark inputs and six
# site inputs become two `MultiValueInput` pill fields, each capped at six, which the payload spreads back
# onto the flat `mark1..mark6` / `site1..site6` contract (`pages/Reports/DesignatedMarkException/index.tsx`).
# The two sides are independent, so the scenarios below fill them ASYMMETRICALLY (3 marks, 2 sites) — that is
# what would catch a copy-paste bug crossing one side's values onto the other's slots, which a symmetric
# fixture could not distinguish. Unfilled slots are OMITTED, asserted as "(absent)".
#
# Both Reg / Dist controls default to "ALL" independently (`markRegDist`/`siteRegDist`), and one scenario sets
# only ONE of them — again so a bug wiring both controls to the same state would fail rather than pass.
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-005
Feature: Generate Designated Marks Exception Report — Report Parameter Mapping

  @p1
  Scenario: Submitting an untouched form sends the documented default parameters
    Given I open the "Designated Marks Exception" report
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field        | value    |
      | markRegDist  | ALL      |
      | siteRegDist  | ALL      |
      | outputFormat | PDF      |
      | preview      | true     |
      | fromDate     | (absent) |
      | toDate       | (absent) |
      | mark1        | (absent) |
      | site1        | (absent) |

  # Submit runs legacy's existence checks first (each mark a real timber mark, each site a real scale site), so
  # every value here must be real: marks L44804 / AA835 / AE200B are in HAULING_AUTHORITY, sites 520 / 525 exist.
  # The existence rules themselves have their own scenarios below.
  @p1
  Scenario: Marks and sites fan out onto their own six-slot contracts independently
    Given I open the "Designated Marks Exception" report
    When I add the report values "L44804, AA835, AE200B" to "designated-marks"
    And I add the report values "520, 525" to "designated-sites"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field | value    |
      | mark1 | L44804   |
      | mark2 | AA835    |
      | mark3 | AE200B   |
      | mark4 | (absent) |
      | site1 | "520"    |
      | site2 | "525"    |
      | site3 | (absent) |

  # Regression guard for defects.md #3 (FIXED 2026-10-01). AB6633 is a real timber mark in HAULING_AUTHORITY
  # with NO hauling-mark authorization (no designation). Legacy runs the report for it; the screen used to refuse
  # it because its check read the haul-mark search view instead of HAULING_AUTHORITY. Deliberately a mark NO
  # scenario touches (a designated mark such as ES20R4 would pass even the old check while a seed existed).
  @p1
  Scenario: A timber mark legacy accepts is not refused as unknown
    Given I open the "Designated Marks Exception" report
    When I add the report values "AB6633" to "designated-marks"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field | value    |
      | mark1 | AB6633   |
      | mark2 | (absent) |

  # Legacy DesignatedMarksExceptionReportForm.validate: an unknown mark (errors.timbermark.exist) or an unknown
  # site (errors.site.exist) is refused against its own field and nothing is sent. Unlike the Mark Site
  # Designation report the two lists are not interchangeable — a mark is checked only as a mark, a site only
  # as a site. A12345 is in neither table; ZZZ9 is not a scale site. Messages verbatim from legacy.
  @p1 @ERR-timbermark-exist
  Scenario: An unknown timber mark is refused against the marks field
    Given I open the "Designated Marks Exception" report
    When I add the report values "L44804, A12345" to "designated-marks"
    And I submit the report
    Then the report field "designated-marks" shows the error "A Timbermark for A12345 does not exist in the system."
    And no report request should be sent

  # The site check is newly restored (2026-10-01): the screen used to check marks only — defects.md #4.
  @p1 @ERR-site-exist
  Scenario: An unknown scale site is refused against the sites field
    Given I open the "Designated Marks Exception" report
    When I add the report values "520, ZZZ9" to "designated-sites"
    And I submit the report
    Then the report field "designated-sites" shows the error "A Scale Site for ZZZ9 does not exist in the system."
    And no report request should be sent

  @p1
  Scenario: The two Reg / Dist filters are carried independently
    Given I open the "Designated Marks Exception" report
    When I select the report Reg / Dist "DCC" in "mark-reg-dist"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field       | value |
      | markRegDist | DCC   |
      | siteRegDist | ALL   |

  @p2
  Scenario: A chosen date window is carried on the request
    Given I open the "Designated Marks Exception" report
    When I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field    | value      |
      | fromDate | 2024-01-01 |
      | toDate   | 2024-12-31 |

  @p1
  Scenario: Preview No with a valid recipient requests email delivery
    Given I open the "Designated Marks Exception" report
    When I set the report Preview Report to No
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field          | value                         |
      | preview        | false                         |
      | emailRecipient | scs.reports@example.gov.bc.ca |
