@sca @UC-SCA-003 @tab
Feature: Scaler view — Authorizations tab
  The Scaler view's "Authorizations" tab (route /scalers/view/{lic}?tab=authorizations) lists that scaler's
  authorizations, links each Authorization # to its view page (UC-SCA-003), offers an "Add Authorization"
  entry that prefills the licence on the create form (UC-SCA-001), and filters the list by status. Driven
  read-only against scaler 001A (one long-expired authorization 147850 — pinned in fixtures/sca).

  Background:
    Given I open the scaler Authorizations tab

  @S01 @p1
  Scenario: The tab lists the scaler's authorization and links it to its view page
    Then the Authorizations tab shows authorization "147850" linking to its view page

  @S02 @p1 @UC-SCA-001
  Scenario: Add Authorization opens the create form prefilled with the scaler's licence
    When I click Add Authorization on the scaler tab
    Then I land on the scaler authorization create page prefilled with the scaler licence

  @S03 @p2
  Scenario: The status filter narrows the list (Active hides the expired authorization)
    When I filter scaler authorizations by "Active"
    Then the Authorizations tab shows no authorizations for the selected status
