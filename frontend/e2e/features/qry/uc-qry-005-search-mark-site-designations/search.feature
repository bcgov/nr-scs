# Re-grounded from UC-QRY-005 S01 (Search by Timber Mark — Results Returned). The legacy two-screen flow
# .markSiteDesignationSearch (P066) → .markSiteDesignationSearchResults (P067) with a "Back" button
# collapses to the new app's SINGLE page /mark-site-designations (pages/Queries/MarkSiteDesignations):
# form + results together, no Back button. Read path: searchMarkSiteDesignationsByTimberMark →
# GET /api/mark-site-designations/search?timberMark=. The result columns match the legacy set (MSD #,
# Timber Mark, Effective Date, Expiry Date, Designated District); the MSD # is a link to the MSD view;
# a "Create MSD" button renders after a search. Because the search is entirely `?timberMark=` URL-driven,
# arriving via a link (the Scale Site MSD tab's `?timberMark=` link) auto-searches — the same path the form
# takes. Search value GE5412 is a real, stable extract mark (NOT written by any create test) pinned in
# fixtures/qry/qry-mark-site-designation-test-data.ts; we assert PRESENCE (row + link + columns), not a
# volatile row count / authorization id. Read-only → no seed, no cleanup, parallel-safe.
@qry @UC-QRY-005
Feature: Search Mark Site Designations — Results Returned

  @S01 @p0
  Scenario: Searching a timber mark lists its mark site designations
    Given I am on the Mark Site Designation Search page
    When I search mark site designations by the timber mark with results
    Then the mark site designation results list the searched timber mark
    And the mark site designation results table shows the expected columns
    And each MSD # is a link to its mark site designation view
    And the Create MSD button is available

  # The auto-search-from-URL path — the exact behaviour the Scale Site MSD tab relies on when it links to
  # /mark-site-designations?timberMark={mark}. UC-MSD-005 S03 only asserted the URL; this asserts the
  # page actually renders the results without any form interaction.
  @S01 @p1
  Scenario: Arriving with a timber mark in the URL auto-searches and lists results
    Given I arrive at the Mark Site Designation Search with a designated timber mark in the URL
    Then the mark site designation results list the searched timber mark
    And each MSD # is a link to its mark site designation view

  # The MSD # link actually navigates to the read-only MSD view (STA-001 in the new app is never role-gated
  # — the link always renders; see coverage.md). Asserts the URL + the view screen heading load.
  @S01 @p1
  Scenario: Opening an MSD from the results lands on its view screen
    Given I am on the Mark Site Designation Search page
    When I search mark site designations by the timber mark with results
    And I open the first mark site designation from the results
    Then I land on the mark site designation view screen

  # New-app control (no legacy equivalent in these slices): Reset clears the form + results back to the
  # pre-search empty state.
  @S01 @p2
  Scenario: Reset clears the results after a mark site designation search
    Given I am on the Mark Site Designation Search page
    When I search mark site designations by the timber mark with results
    Then the mark site designation results list the searched timber mark
    When I reset the mark site designation search
    Then the mark site designation results should be cleared
