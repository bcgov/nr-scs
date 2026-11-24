# Chain: (none — APP-ONLY capability) › THIS FILE
#
# The delete failure branch. The view page's delete mutation has an onError arm that surfaces a
# "Delete failed" inline error and closes the prompt, keeping the actor on the view
# (View/ScaleSiteInspection/index.tsx:79-80, 207). Reaching it through the UI needs a delete that the
# server refuses, and the honest way to produce that is a record removed out-of-band while the actor
# still holds the view open — a genuine concurrency case, not a stubbed response.
#
# Confirmed by hand on 2026-09-09: a second DELETE of the same id returns 404 NOT_FOUND
# ("No readable scale site inspection found with inspection id N").

@ins @UC-INS-002 @delete @app-only
Feature: Delete Site Inspection — failure reporting (app-only)

  @S03 @p1
  Scenario: Confirming a delete for a record already removed elsewhere reports the failure
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection view
    And the inspection is deleted in another session
    And I click Delete on the inspection view
    Then the delete confirmation prompt is shown
    When I confirm the inspection deletion
    Then the inspection delete failure is reported
