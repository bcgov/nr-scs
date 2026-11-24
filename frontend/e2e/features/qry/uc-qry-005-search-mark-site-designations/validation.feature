# Re-grounded from UC-QRY-005 S05 (Timber Mark not entered → ERR-001), S06 (% wildcard → ERR-002), S07
# (_ wildcard → ERR-003). Legacy enforced all three as SERVER-side field errors with the wording
# "Timber Mark is required." / "Wildcards are not allowable in this search."; the new app enforces them
# CLIENT-side in pages/Queries/MarkSiteDesignations (validateForm + timberMarkWildcardError), re-grounded
# to "Timber Mark is required." / "Timber Mark can’t contain the % / _ character." — and NEVER dispatches a
# search request. Each scenario therefore PROVES the negative (searchMsdCalls === 0) in addition to the
# inline error, rather than inferring it from a missing result list. The wildcard guard also blocks a
# hand-crafted `?timberMark=` URL (a real defence — a crafted %/_ must not reach the LIKE-capable backend),
# covered by the URL scenario. Messages are pinned in fixtures/qry/qry-mark-site-designation-test-data.ts.
@qry @UC-QRY-005
Feature: Search Mark Site Designations — Timber Mark Validation

  @S05 @p1 @ERR-001
  Scenario: Submitting with no timber mark is rejected client-side with no search sent
    Given I am on the Mark Site Designation Search page
    When I submit the mark site designation search with no timber mark
    Then the mark site designation search shows the required-timber-mark error
    And no mark site designation search request should be sent

  @S06 @p1 @ERR-002
  Scenario: A timber mark containing a percent wildcard is rejected client-side with no search sent
    Given I am on the Mark Site Designation Search page
    When I search mark site designations by timber mark "AB%"
    Then the mark site designation search rejects the percent wildcard
    And no mark site designation search request should be sent

  @S07 @p1 @ERR-003
  Scenario: A timber mark containing an underscore wildcard is rejected client-side with no search sent
    Given I am on the Mark Site Designation Search page
    When I search mark site designations by timber mark "AB_"
    Then the mark site designation search rejects the underscore wildcard
    And no mark site designation search request should be sent

  # The wildcard guard also protects a hand-crafted URL: arriving at ?timberMark=AB%25 (a literal `%`) must
  # surface the error and dispatch NO search, so a crafted wildcard can't reach the LIKE-capable backend.
  @S06 @p1 @ERR-002
  Scenario: A wildcard supplied in the URL is rejected and triggers no search
    Given I open the Mark Site Designation Search page with timber mark "AB%" in the URL
    Then the mark site designation search rejects the percent wildcard
    And no mark site designation search request should be sent
