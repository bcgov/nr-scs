# Chain: (none — APP-ONLY capability) › THIS FILE
#
# The edit screen's three unhappy load/save paths. The first two are DIFFERENT code paths and must not
# be conflated:
#   - a MALFORMED route id (not a positive integer) is rejected by the page's own guard
#     (Edit/ScaleSiteInspection/index.tsx:346-348) BEFORE any read is issued → "Inspection not available";
#   - a WELL-FORMED but absent id does issue the read, which 404s → "Could not load inspection".
#
# The third is the app's SERVER-rejection branch (bannerMode="api", "Inspection update failed"). Every
# client-side rule blocks its own case before the PUT, so the only realistic way to reach that branch
# through the UI is a record removed out-of-band while the form is still open — which is also a genuine
# concurrency case. Confirmed by hand: PUT on a deleted id returns 404 NOT_FOUND.

@ins @UC-INS-003 @edit @app-only
Feature: Edit Site Inspection — unavailable records (app-only)

  @S08 @p1
  Scenario: A well-formed id for an inspection that does not exist reports it cannot be loaded
    When I open the edit form for a missing inspection on scale site "520"
    Then the inspection edit form shows a not-found message

  @S08 @p2
  Scenario: A malformed inspection id in the edit route is rejected without a read
    When I open the edit form with a malformed inspection id on scale site "520"
    Then the inspection edit form reports the id is not usable

  @S09 @p1
  Scenario: Saving an inspection that was deleted meanwhile surfaces the server failure
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I change the inspection header and answers
    And the inspection is deleted in another session
    And I save the inspection edit
    Then the inspection edit form reports the update failed
    And I remain on the inspection edit form
