# Re-grounded from UC-QRY-001 S01 (Search Clients — Happy Path). Legacy two-screen flow
# .clientSearch (P003) → .clientSearchResults (P004) with a "Back" button re-grounds to the new app's
# SINGLE page /client (pages/Queries/Client): the form + results render together, so there is NO Back
# button (logged as a coverage gap). The legacy "Result List: N records" count line is PRESERVED
# (TableResource.__total). Search values are real clients pinned in fixtures/qry/qry-client-test-data.ts
# (ground-truthed 2026-07-23 against GET /api/clients/search → SP scs_client_vw_pkg).
@qry @UC-QRY-001
Feature: Search Clients — Happy Path (Non-empty Results)

  # S01: any single non-empty criterion returns matching clients. The Outline exercises the field-search
  # symmetry the .feature enumerates (company name + last name) plus client-number (from -slices.md:120).
  @S01 @p0
  Scenario Outline: Searching clients by a single criterion returns matching rows
    Given I am on the Client Search page
    When I search clients by "<field>" of "<value>"
    Then the client results should list client "<client>"
    And the client results should show <count> records

    Examples:
      | field        | value               | client        | count |
      | last name    | KALCHTHALER         | 00001003 / 00 | 1     |
      | company name | MANAGEMENT ABEYANCE | 00000001 / 00 | 2     |
      | client number| 00001003            | 00001003 / 00 | 1     |

  # S01 (results-screen half): the results table renders the expected columns AND maps row data into the
  # right cells. Uses the single-row KALCHTHALER match so the cell assertions are deterministic.
  @S01 @p1
  Scenario: The results table shows the expected columns and cell data
    Given I am on the Client Search page
    When I search clients by "last name" of "KALCHTHALER"
    Then the client results table shows the expected columns
    And the client row for "00001003 / 00" shows last name "KALCHTHALER", first name "HETTIE" and city "PORT CLEMENTS"

  # New-app control (no legacy equivalent in the S01 slice): Reset clears the form + results so a fresh
  # search can be started. Covered because it is a real, visible control on the screen.
  @S01 @p2
  Scenario: Reset clears the results after a search
    Given I am on the Client Search page
    When I search clients by "last name" of "KALCHTHALER"
    Then the client results should list client "00001003 / 00"
    When I reset the client search
    Then the client results should be empty
