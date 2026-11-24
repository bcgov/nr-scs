# Re-grounded from the legacy submit slice's outbound parameter set onto the JSON body of
# `POST /api/reports/mark-site-designation`, captured in flight (steps/fixtures/rpt.ts `reportRequests`).
# covered end-to-end for real in `generation.feature` (the Jasper blocker was resolved 2026-08-11).md.
#
# The distinctive mapping on THIS screen is the **multi-value fan-out**: the legacy form offered six discrete
# "specific mark / site" inputs, and the new app replaces them with ONE `MultiValueInput` pill field capped at
# six, which the payload spreads back onto the flat `siteMark1..siteMark6` contract the API still expects
# (`pages/Reports/MarkSiteDesignation/index.tsx`: `normalizedSpecificValues[n] || undefined`). Unfilled slots
# are OMITTED from the body, not sent empty — asserted below as "(absent)", which is what keeps the six-slot
# contract honest. Values are trimmed and de-duplicated by the control, and capped at six via `.slice(0, 6)`.
#
# Other mappings: Reg / Dist blank → regDist "ALL"; Timber Mark or Scale Site → markOrSite "MARK"/"SITE";
# Mark Exceptions blank → markExemption OMITTED (note the control/field spelling difference: the control is
# "Mark Exceptions", the payload field is `markExemption`); the four dates → effectiveFrom/To, expiryFrom/To.
# Read-only: a report request persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-012
Feature: Generate Mark Site Designation Report — Report Parameter Mapping

  @p1
  Scenario: Submitting an untouched form sends the documented default parameters
    Given I open the "Mark Site Designation" report
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field         | value    |
      | regDist       | ALL      |
      | markOrSite    | MARK     |
      | outputFormat  | PDF      |
      | preview       | true     |
      | markExemption | (absent) |
      | effectiveFrom | (absent) |
      | effectiveTo   | (absent) |
      | expiryFrom    | (absent) |
      | expiryTo      | (absent) |
      | siteMark1     | (absent) |

  # Submit now runs the legacy referential check first (each value must be a scale site or a timber mark), so
  # every value here must be real timber marks (in HAULING_AUTHORITY, the table legacy's check reads): L44804 /
  # AA835 / AE200B. The existence rule itself has its own scenarios below.
  @p1
  Scenario: Specific timber marks fan out onto the six-slot mark contract
    Given I open the "Mark Site Designation" report
    When I add the report values "L44804, AA835, AE200B" to "specific-values"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field      | value    |
      | markOrSite | MARK     |
      | siteMark1  | L44804   |
      | siteMark2  | AA835    |
      | siteMark3  | AE200B   |
      | siteMark4  | (absent) |
      | siteMark5  | (absent) |
      | siteMark6  | (absent) |

  # Regression guard for defects.md #4 (FIXED 2026-10-01). AB6633 is a real timber mark in HAULING_AUTHORITY
  # with NO hauling-mark authorization (no designation). Legacy runs the report for it; the screen used to refuse
  # it because its check read the haul-mark search view instead of HAULING_AUTHORITY. Deliberately a mark NO
  # scenario touches: MSD create inserts a HAULING_MARK_AUTHORIZATION row, so a mark the suite designates
  # (ES20R4, used first) would pass even under the old, wrong check whenever a concurrent MSD seed existed.
  @p1
  Scenario: A timber mark legacy accepts is not refused as unknown
    Given I open the "Mark Site Designation" report
    When I add the report values "AB6633" to "specific-values"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field     | value    |
      | siteMark1 | AB6633   |
      | siteMark2 | (absent) |

  # The other half of the legacy rule (MarkSiteDesignationReportBo.validateSitesAndMarks): a value that is
  # neither a scale site nor a timber mark is refused against its field and nothing is sent. A12345 is in
  # neither SCALE_SITE nor HAULING_AUTHORITY. Message is legacy's errors.timbermark.site.exist, verbatim.
  @p1 @ERR-site-mark-exist
  Scenario: A value that is neither a scale site nor a timber mark is refused
    Given I open the "Mark Site Designation" report
    When I add the report values "L44804, A12345" to "specific-values"
    And I submit the report
    Then the report field "specific-values" shows the error "A Site nor Timbermark for A12345 exist in the system."
    And no report request should be sent

  # The six-value cap is enforced by the CONTROL, not by the payload builder: `MultiValueInput` renders its
  # input `disabled={disabled || isMaxed}`, so once six pills are committed a seventh cannot even be typed.
  # (Discovered 2026-08-11: an attempt to fill a 7th value times out on the disabled input.) So the cap is
  # asserted where it actually lives — the field goes read-only at six — and the payload is asserted to fill
  # all six slots. The payload's own `.slice(0, 6)` is a second line of defence that the UI makes unreachable.
  # The six values are real timber marks (in HAULING_AUTHORITY and the haul-mark search view, confirmed
  # 2026-09-30): the old placeholders M1..M6 now fail the submit-time existence check, which legacy had too.
  @p2
  Scenario: The specific-value field stops accepting entries at six and fills all six slots
    Given I open the "Mark Site Designation" report
    When I add the report values "L44804, AA835, AE200B, EK1309, GE5412, IR352" to "specific-values"
    Then the report field "specific-values" accepts no more values
    When I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field     | value  |
      | siteMark1 | L44804 |
      | siteMark2 | AA835  |
      | siteMark3 | AE200B |
      | siteMark4 | EK1309 |
      | siteMark5 | GE5412 |
      | siteMark6 | IR352  |

  # Uses only real marks so this scenario tests removal alone; the existence-check divergence (defects.md #4) is
  # reproduced once, by "A timber mark legacy accepts is not refused as unknown" above.
  @p2
  Scenario: Removing a specific value drops it from the request
    Given I open the "Mark Site Designation" report
    When I add the report values "L44804, AA835" to "specific-values"
    And I remove the report value "L44804" from "specific-values"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field     | value    |
      | siteMark1 | AA835    |
      | siteMark2 | (absent) |

  @p1
  Scenario: Switching to Scale Site relabels the specific-value field and is carried on the request
    Given I open the "Mark Site Designation" report
    Then the report field "specific-values" is labelled "Specific Timber Marks"
    When I choose the report parameter "mark-or-site" option "Site"
    Then the report field "specific-values" is labelled "Scale Site #"
    When I add the report values "520" to "specific-values"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field      | value |
      | markOrSite | SITE  |
      | siteMark1  | "520" |

  @p2
  Scenario: A chosen effective and expiry window is carried on the request
    Given I open the "Mark Site Designation" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "effective-from" to "2024-01-01"
    And I set the report date "effective-to" to "2024-06-30"
    And I set the report date "expiry-from" to "2025-01-01"
    And I set the report date "expiry-to" to "2025-12-31"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field         | value      |
      | regDist       | DCC        |
      | effectiveFrom | 2024-01-01 |
      | effectiveTo   | 2024-06-30 |
      | expiryFrom    | 2025-01-01 |
      | expiryTo      | 2025-12-31 |
