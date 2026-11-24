@sca @UC-SCA-003 @tab
Feature: Scale Site view — Authorized Scalers tab
  The Scale Site view's "Authorized Scalers" tab (route /scale-sites/view/{site}?tab=authorized-scalers)
  lists every scaler authorized at the site, links each row's Authorization # to its view page (UC-SCA-003)
  and each Licence # to the scaler's view page, offers an "Add Authorization" entry to the create form with
  NO licence prefill (UC-SCA-001), and filters the list by status. Driven read-only against site 520 (whose
  authorized scalers are all currently Expired — pinned in fixtures/sca). A freshly-seeded authorization does
  not appear in this view, so the row links are asserted by href pattern rather than a pinned id.

  Background:
    Given I open the scale site Authorized Scalers tab

  @S01 @p1
  Scenario: The tab lists authorized scalers, each linking to the authorization and scaler views
    Then the Authorized Scalers tab first row links to the authorization and scaler views

  @S02 @p1 @UC-SCA-001
  Scenario: Add Authorization opens the create form with no licence prefilled
    When I click Add Authorization on the scale site tab
    Then I land on the scaler authorization create page with an empty scaler licence

  @S03 @p2
  Scenario: The status filter narrows the list (Active hides the expired authorizations)
    When I filter authorized scalers by "Active"
    Then the Authorized Scalers tab shows no authorized scalers for the selected status
