# Re-grounded from UC-QRY-007 S01 (Scaler Risk Assessment Search — Happy Path). UC-QRY-007 is a 4-subject
# UC (Scaler/Scale-Site/Timber-Cruise/Waste); this suite covers the SCALER subject only — Timber Cruise
# and Waste are descoped (see coverage.md). The legacy two-screen flow .scalerRiskSearch (P124) →
# .scalerRiskSearchResults (P125) with a "Back" button collapses to the new app's SINGLE page
# /scaler-risk-assessments (pages/Queries/ScalerRiskAssessments): filter form + results together, no Back
# button. Search values are real assessments pinned in fixtures/rsk/scaler-risk-assessment-test-data.ts
# (ground-truthed 2026-08-04 against GET /api/scaler-risk-assessments/search).
@rsk @UC-QRY-007
Feature: Search Scaler Risk Assessments — Happy Path

  # S01: any single non-empty criterion returns matching assessments. The Outline exercises a text filter
  # (Assessment ID, Licence #) and a dropdown filter (Level), all of which resolve assessment 723.
  @S01 @p0
  Scenario Outline: Searching scaler risk assessments by a single criterion returns matching rows
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "<field>" of "<value>"
    Then the scaler risk assessment results should list assessment "<assessment>"
    And the scaler risk assessment results should show <count> records

    Examples:
      | field        | value  | assessment | count |
      | Assessment ID| 723    | 723        | 1     |
      | Licence #    | 9710   | 723        | 5     |
      | Level        | Medium | 723        | 1     |

  # S01 multi-criteria: the legacy S01 gherkin enters several fields at once (Assessment ID + Level +
  # Reg/Dist + sort), and doSearch packs EVERY filter into one params object (index.tsx:287-297). The
  # single-criterion arms above can't catch a bug where one field overwrites another — every one submits
  # exactly one filter. This arm submits two together: Licence # 9710 (5 rows) AND Level Medium (1 row),
  # asserting they intersect to the single assessment 723. A field-clobber returns the wrong count here.
  @S01 @p0
  Scenario: Searching by two criteria narrows to their intersection
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Licence #" of "9710" and "Level" of "Medium"
    Then the scaler risk assessment results should list assessment "723"
    And the scaler risk assessment results should show 1 records

  # S01 wildcard vs exact matching (endpoint spec: Assessment ID "Supports wildcard matching (e.g. 20%)";
  # "Text fields support partial matching" — scaler-risk-assessments-search.yaml:10,17). Ground-truth
  # 2026-08-04: scs_risk_scaler_vw_pkg.search_recs matches EXACTLY unless the caller supplies a `%` — a
  # bare "72" returns nothing (72 != 723) while "72%" resolves the prefix to assessment 723. The two arms
  # run together so the suite both proves the wildcard path AND distinguishes it from an exact match
  # (which "9710 -> 5 rows" alone could not). See defects.md on the imprecise "partial matching" wording.
  @S01 @p1
  Scenario: A trailing-wildcard Assessment ID matches by prefix
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Assessment ID" of "72%"
    Then the scaler risk assessment results should list assessment "723"
    And the scaler risk assessment results should show 1 records

  @S01 @p1
  Scenario: A bare (unwildcarded) Assessment ID is an exact match, not a substring
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Assessment ID" of "72"
    Then the scaler risk assessment search should show no results

  # S01 result-set pagination (INF-001 count vs. the rendered page). The page fetches ALL matching rows in
  # one call and paginates CLIENT-SIDE at 10/page (index.tsx:246-259): the "Result List: N records" total
  # is the full match count while the table renders only the current page's slice. Level = High returns 14
  # rows (a stable 2-page set: 10 + 4), so this asserts the total reads 14 throughout while page 1 shows 10
  # rows and page 2 shows the remaining 4 — exercising the slice math and the partial last page. (Result-set
  # paging was previously mis-deferred as a "persisted filters/paging" nicety — see coverage.md / gap #9.)
  @S01 @p1
  Scenario: The result set paginates client-side at 10 rows per page
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Level" of "High"
    Then the scaler risk assessment results should show 14 records
    And the scaler risk assessment results should show 10 rows on the current page
    When I go to the next page of scaler risk assessment results
    Then the scaler risk assessment results should show 4 rows on the current page

  # S01 sort order (LEGACY SERVER behaviour, not a UI nicety): legacy S01 selects a Primary Sort and the
  # search runs searchScalerAssessments(searchDto, primarySort, secondarySort); the new app passes both to
  # the API using the legacy sort codes (scaler-risk-assessments-search.yaml:78-111). Sort is applied first
  # (it feeds the same formData the search submits), then the 9710 licence set (5 rows) is fetched. Primary
  # Level / Secondary Assessment ID reorders to [1144,1224,1341,1226,723] — distinct from the default
  # Assessment-ID order [723,...] (723 sorts first by id, last by level), proving BOTH params are applied.
  @S01 @p1
  Scenario: Results honour the selected primary and secondary sort
    Given I am on the Scaler Risk Assessment Search page
    When I sort scaler risk assessments by primary "Level" and secondary "Assessment ID"
    And I search scaler risk assessments by "Licence #" of "9710"
    Then the scaler risk assessment results appear in assessment-id order "1144, 1224, 1341, 1226, 723"

  # MSG-001 (search.choose.params): legacy renders "Choose your search parameters." on page load and the
  # S01 gherkin asserts it; the new app renders the same text as the filter-accordion heading
  # (index.tsx:354). A page-load message anchor — no search required.
  @S01 @p2 @MSG-001
  Scenario: The search-parameters heading is shown on page load
    Given I am on the Scaler Risk Assessment Search page
    Then the scaler risk assessment search parameters heading is shown

  # Error state — "Search failed" (index.tsx serverError / searchMutation.isError). The search endpoint is
  # faulted to a 500 with page.route + route.fulfill (the established pattern from steps/chk/verify.steps.ts),
  # so the InlineNotification path is exercised without a real backend fault.
  @S01 @p1
  Scenario: A failed search shows the "Search failed" notification
    Given I am on the Scaler Risk Assessment Search page
    And the scaler risk assessment search endpoint fails
    When I search scaler risk assessments by "Assessment ID" of "723"
    Then the scaler risk assessment page shows a "Search failed" error

  # Error state — "Could not load dropdown options" (index.tsx lovError). The static-LOV endpoint (both
  # dropdowns load through it) is faulted BEFORE the page mounts, so the LOV-load-failure notification path
  # is exercised. Same route.fulfill fault-injection pattern.
  @S01 @p1
  Scenario: A dropdown-LOV load failure shows the "Could not load dropdown options" notification
    Given the scaler risk assessment dropdown options fail to load
    And I am on the Scaler Risk Assessment Search page
    Then the scaler risk assessment page shows a "Could not load dropdown options" error

  # S01 (results-screen half): the results table renders the expected columns AND maps row data into the
  # right cells. Uses the single-result Assessment ID 723 so the cell assertions are deterministic.
  @S01 @p1
  Scenario: The results table shows the expected columns and cell data
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Assessment ID" of "723"
    Then the scaler risk assessment results table shows the expected columns
    And the scaler risk assessment row for "723" shows rating "24 / 63", responses "1 / 7", level "Medium", range "21-49", version "1", licence "9710", scaler "00047212 / 00", reg/dist "Selkirk Natural Resource District" and client "SAMPLE, SCALER A"

  # S01 (result links): the Assessment ID cell links to the assessment view, and the Licence # cell links
  # to the scaler view (STA-001/002 in the legacy gated edit-vs-display by permission; the new single-role
  # app renders one unconditional view link — see coverage.md / defects.md).
  @S01 @p1
  Scenario: Result rows link to the assessment view and the scaler view
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Assessment ID" of "723"
    Then the scaler risk assessment "723" links to its view and licence "9710" links to the scaler view

  # New-app behaviour (no legacy blank-search guard — legacy scalerRiskSearch also ran no validation): an
  # all-blank submit runs an unfiltered browse-all. Asserts only that a result list rendered (browse-all
  # ran) — NOT a specific row, which could page past the first page as the extract grows.
  @S01 @p2
  Scenario: Submitting with no filters runs an unfiltered browse-all
    Given I am on the Scaler Risk Assessment Search page
    When I submit the scaler risk assessment search with no filters
    Then the scaler risk assessment results should not be empty

  # New-app control (no legacy equivalent in this slice): Reset clears the form + results.
  @S01 @p2
  Scenario: Reset clears the results after a search
    Given I am on the Scaler Risk Assessment Search page
    When I search scaler risk assessments by "Assessment ID" of "723"
    Then the scaler risk assessment results should list assessment "723"
    When I reset the scaler risk assessment search
    Then the scaler risk assessment results should be empty
