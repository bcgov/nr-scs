# Re-grounded from UC-QRY-001 S02 (Search Rejected — All Fields Blank). Legacy rule (ERR-001,
# message.refineSearch, ClientSearchAction.java:83-88): all criteria blank → ClientVwDto.checkNullable()
# is true → NO database query is executed and "Please provide some search criteria." is shown.
@qry @UC-QRY-001
Feature: Search Clients — All-blank Search Runs an Unfiltered Query (accepted divergence)

  # ACCEPTED INTENTIONAL DIVERGENCE (reviewed → log-only; was @discovered-divergence, no longer forced red).
  # The new app deliberately enforces NO all-blank-search guard: neither the frontend (pages/Queries/Client
  # doSearch fires the request with all params undefined) nor the backend (ClientController → ClientService →
  # ClientRepository has no checkNullable) rejects it. Ground-truthed 2026-07-23: GET /api/clients/search with
  # NO params -> HTTP 200 + the FULL client list (first row 00000001 / 00). The legacy ERR-001 rejection
  # (message.refineSearch, ClientSearchAction.java:83-88) was reviewed and this drop ACCEPTED as an intentional
  # product change ("blank = browse all"), so this scenario now asserts the ACTUAL new-app behaviour — the
  # query runs and lists all clients. See defects.md Divergence #1 (accepted / log-only).
  @S02 @p1 @ERR-001
  Scenario: An all-blank client search runs an unfiltered query and lists all clients
    Given I am on the Client Search page
    When I submit the client search with all fields blank
    Then a client search request should be sent
    And the client results should list client "00000001 / 00"
