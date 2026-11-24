# Re-grounded from UC-QRY-007 S02 (Scale Site Risk Assessment Search). UC-QRY-007 is a 4-subject UC
# (Scaler/Scale-Site/Timber-Cruise/Waste); this suite covers the SCALE SITE subject — the scaler subject is
# a separate suite (uc-qry-007-search-scaler-risk-assessments), and Timber Cruise + Waste are descoped (see
# coverage.md). The legacy two-screen flow (.scaleSiteRiskSearch → .scaleSiteRiskSearchResults with a "Back"
# button) collapses to the new app's SINGLE page /scale-site-risk-assessments
# (pages/Queries/ScaleSiteRiskAssessments): filter form + results together, no Back button. Search values
# are real assessments pinned in fixtures/rsk/scale-site-risk-assessment-test-data.ts (ground-truthed
# 2026-08-11 against GET /api/scale-site-risk-assessments/search).
#
# EXTRACT NOTE: this scale-site extract is thin (9 rows, all High, all incomplete, all distinct sites), so
# the scaler suite's Level-single-match, client-side-pagination, and Complete=Yes arms have NO scale-site
# data and are logged as data gaps in defects.md rather than authored here.
@rsk @UC-QRY-007
Feature: Search Scale Site Risk Assessments — Happy Path

  # S02: any single non-empty criterion returns matching assessments. The Outline exercises two text filters
  # (Assessment ID, Scale Site #) and a wildcard text filter (Scale Site Name), each resolving assessment 1822
  # with an EXACT count. These arms are safe to pin exactly because each keys on an id/site value a parallel
  # create-seed can never collide with (seeds land on site 520 with new sequence ids ~2xxx — never 1822, 614,
  # or a WELDWOOD site). The Level filter is asserted SEPARATELY below with a tolerant count, because
  # Level=High spans the whole extract and IS exposed to parallel seeds — see that scenario + defects.md.
  # Site Name "WELDWOOD%" returns 2 (site names match exact-unless-`%`, so the wildcard is required).
  @S02 @p0
  Scenario Outline: Searching scale site risk assessments by a single criterion returns matching rows
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "<field>" of "<value>"
    Then the scale site risk assessment results should list assessment "<assessment>"
    And the scale site risk assessment results should show <count> records

    Examples:
      | field           | value      | assessment | count |
      | Assessment ID   | 1822       | 1822       | 1     |
      | Scale Site #    | 614        | 1822       | 1     |
      | Scale Site Name | WELDWOOD%  | 1822       | 2     |

  # S02 Level (risk type) dropdown filter. This extract is uniformly High, so Level=High spans the WHOLE
  # extract — and, unlike the Outline arms above, that whole-extract count is exposed to parallel create-seeds:
  # the scale-site risk SEARCH view returns freshly-created rows (verified 2026-08-11), and the RSK-006/007
  # create+seed suites run against the same shared DB, so a create on site 520 (rating 90 = High) transiently
  # adds a 10th High row. The count is therefore asserted as "at least 9" (lists the anchor 1822 + >= the 9
  # known rows) rather than exactly 9. The exact-9 IS still pinned — by preflight/anchors.setup.ts, which runs
  # to completion (as a project dependency) before any create scenario, so it sees a quiescent DB.
  # See defects.md "Parallel create-seed hazard".
  @S02 @p0
  Scenario: Filtering by Level returns the High assessments including the anchor
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Level" of "High"
    Then the scale site risk assessment results should list assessment "1822"
    And the scale site risk assessment results should show at least 9 records

  # S02 multi-criteria: doSearch packs EVERY filter into one params object (index.tsx:277-297). The
  # single-criterion arms above can't catch a bug where one field overwrites another — every one submits
  # exactly one filter. This arm submits two together, each of which returns MORE than one row on its own —
  # Assessment ID "18%" (6 rows) AND Scale Site Name "WELDWOOD%" (2 rows) — and asserts they intersect to the
  # single assessment 1822. Because the intersection (1) is a proper subset of BOTH operands, a field-clobber
  # in either direction returns the wrong count here while still passing every single-criterion arm.
  @S02 @p0
  Scenario: Searching by two criteria narrows to their intersection
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Assessment ID" of "18%" and "Scale Site Name" of "WELDWOOD%"
    Then the scale site risk assessment results should list assessment "1822"
    And the scale site risk assessment results should show 1 records

  # S02 wildcard vs exact matching. Ground-truth 2026-08-11: scs_risk_scsite_vw_pkg.search_recs matches
  # EXACTLY unless the caller supplies a `%` — a bare "18" returns nothing (18 != any id) while "18%" resolves
  # the prefix to the six 18xx assessments. The two arms run together so the suite both proves the wildcard
  # path AND distinguishes it from an exact match. (Scale Site Name uses the same exact-unless-`%` rule.)
  @S02 @p1
  Scenario: A trailing-wildcard Assessment ID matches by prefix
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Assessment ID" of "18%"
    Then the scale site risk assessment results should list assessment "1822"
    And the scale site risk assessment results should show 6 records

  @S02 @p1
  Scenario: A bare (unwildcarded) Assessment ID is an exact match, not a substring
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Assessment ID" of "18"
    Then the scale site risk assessment search should show no results

  # S02 sort order (LEGACY SERVER behaviour, not a UI nicety): the search passes primarySort/secondarySort to
  # the API using the legacy sort codes (index.tsx SORT_OPTIONS). All 9 rows are High, so sorting by Level
  # cannot reorder; sorting by Site Name CAN. Sort is applied first (it feeds the same formData the search
  # submits), then the "18%" set (6 rows) is fetched. Primary Site Name / Secondary Assessment ID reorders to
  # [1850,1846,1844,1848,1861,1822] (alphabetical by site name) — distinct from the default Assessment-ID
  # order [1822,1844,1846,1848,1850,1861], proving BOTH sort params are applied.
  @S02 @p1
  Scenario: Results honour the selected primary and secondary sort
    Given I am on the Scale Site Risk Assessment Search page
    When I sort scale site risk assessments by primary "Site Name" and secondary "Assessment ID"
    And I search scale site risk assessments by "Assessment ID" of "18%"
    Then the scale site risk assessment results appear in assessment-id order "1850, 1846, 1844, 1848, 1861, 1822"

  # MSG-001 (search.choose.params): legacy renders "Choose your search parameters." on page load; the new app
  # renders the same text as the filter-accordion heading (index.tsx:349). A page-load anchor — no search.
  @S02 @p2 @MSG-001
  Scenario: The search-parameters heading is shown on page load
    Given I am on the Scale Site Risk Assessment Search page
    Then the scale site risk assessment search parameters heading is shown

  # Error state — "Search failed" (index.tsx serverError / searchMutation.isError). The search endpoint is
  # faulted to a 500 with page.route + route.fulfill, so the InlineNotification path is exercised without a
  # real backend fault.
  @S02 @p1
  Scenario: A failed search shows the "Search failed" notification
    Given I am on the Scale Site Risk Assessment Search page
    And the scale site risk assessment search endpoint fails
    When I search scale site risk assessments by "Assessment ID" of "1822"
    Then the scale site risk assessment page shows a "Search failed" error

  # Error state — "Could not load dropdown options" (index.tsx lovError). The static-LOV endpoint (the Level
  # dropdown loads through it) is faulted BEFORE the page mounts, so the LOV-load-failure notification path is
  # exercised. Same route.fulfill fault-injection pattern.
  @S02 @p1
  Scenario: A dropdown-LOV load failure shows the "Could not load dropdown options" notification
    Given the scale site risk assessment dropdown options fail to load
    And I am on the Scale Site Risk Assessment Search page
    Then the scale site risk assessment page shows a "Could not load dropdown options" error

  # S02 (results-screen half): the results table renders the expected columns AND maps row data into the
  # right cells. Uses the single-result Assessment ID 1822 so the cell assertions are deterministic. (Site
  # Type is not asserted — assessment 1822's methodTypeCodeName is null in this extract, so the cell is empty.)
  @S02 @p1
  Scenario: The results table shows the expected columns and cell data
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Assessment ID" of "1822"
    Then the scale site risk assessment results table shows the expected columns
    And the scale site risk assessment row for "1822" shows rating "90 / 141", responses "2 / 10", level "High", range "48-141", version "2", scale site "614", site name "WELDWOOD WMS LK DIV", reg/dist "RCB - Cariboo-Chilcotin Natural Resource District" and owner "00055821 / 00"

  # S02 (result links): the Assessment ID cell links to the assessment view, and the Scale Site # cell links
  # to the scale site view (the legacy gated edit-vs-display by permission; the new single-role app renders
  # one unconditional view link — see coverage.md / defects.md).
  @S02 @p1
  Scenario: Result rows link to the assessment view and the scale site view
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Assessment ID" of "1822"
    Then the scale site risk assessment "1822" links to its view and scale site "614" links to the scale site view

  # New-app behaviour (no legacy blank-search guard — legacy scaleSiteRiskSearch also ran no validation): an
  # all-blank submit runs an unfiltered browse-all. Asserts only that a result list rendered (browse-all ran)
  # — NOT a specific row, which could page past the first page as the extract grows.
  @S02 @p2
  Scenario: Submitting with no filters runs an unfiltered browse-all
    Given I am on the Scale Site Risk Assessment Search page
    When I submit the scale site risk assessment search with no filters
    Then the scale site risk assessment results should not be empty

  # New-app control (no legacy equivalent in this slice): Reset clears the form + results.
  @S02 @p2
  Scenario: Reset clears the results after a search
    Given I am on the Scale Site Risk Assessment Search page
    When I search scale site risk assessments by "Assessment ID" of "1822"
    Then the scale site risk assessment results should list assessment "1822"
    When I reset the scale site risk assessment search
    Then the scale site risk assessment results should be empty
