# Re-grounded from UC-QRY-008 S05 (session tombstone missing / context lost). In the LEGACY app this path
# THREW an uncaught IndexOutOfBoundsException — the catch block was commented out in
# ScaleSiteActivitySummaryAction.java:51-63 — and fell through to a container error page with no in-app
# recovery. The new app has NO session tombstone: the scale-site id is a route/path param, so there is no
# tombstone to lose. For an unknown site the service raises a clean 404
# (ScaleSiteActivityService -> SCSUtils.requireFound -> ResourceNotFoundException -> HTTP 404
# {code:NOT_FOUND}). This asserts that FIXED behaviour directly at the endpoint (defects.md Verified #1).
#
# (At the UI, an unknown site id makes the scale-site VIEW page render a graceful "Could not load scale site"
# panel BEFORE the tab mounts — that page-level handling belongs to the scale-site view / SST, not this tab,
# so the endpoint 404 is the precise re-grounding of the legacy crash.)
@qry @UC-QRY-008
Feature: View Scale Site Activity Summary — non-existent scale site

  @S05 @p1
  Scenario: The activity summary endpoint returns a clean 404 for a non-existent scale site (legacy crash fixed)
    Then the activity summary API for a non-existent scale site returns a clean 404
