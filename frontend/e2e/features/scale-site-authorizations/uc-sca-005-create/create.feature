# Re-grounded happy-path slices for Create Scale Site Authorization. The legacy Gherkin targets a two-PAGE
# Struts flow (.createScaleSiteAuthorization P060/P061); the new React screen is /scale-site-authorizations/
# create — a single route with a two-STEP reveal (basics → "Add Conditions" → "Save Record"). Success is
# proven by an API read-back of the persisted record, NOT the redirect. The create form has no
# licence/district/job-function (those belong to the Scaler Authorization); it centres on Scale Site # +
# dates + Expected Annual Scale Volume + optional conditions.
#
# @mode:serial — the two UI creates in this file must not run concurrently: the PK is derived from a shared
# min-free-id pool (scs_scale_site_authorizatn_pkg.insert_rec), and concurrent inserts race on that trigger
# and intermittently 500. Serializing this file keeps its own creates from colliding; cross-file contention is
# mitigated separately by seeding THE.INTEGER_NUMBER. (Update/view/delete don't carry the tag because each
# seeds a single record per scenario rather than firing multiple UI creates from one file.) Each created
# record is cleaned up via DELETE /api/scale-site-authorizations/{id} (createdScaleSiteAuthIds). Data pinned
# in fixtures/sca/sca-test-data.ts (site 520, condition 462), ground-truthed 2026-08-19 (create → 201, delete → 204).
@sca @UC-SCA-005 @mode:serial
Feature: Create Scale Site Authorization

  @S01 @p0
  Scenario: Create a scale site authorization
    Given I am on the Scale Site Authorization create form
    When I create a scale site authorization
    Then the scale site authorization is created
    And the created scale site authorization reads back with status "Active"
    And the created scale site authorization reads back site "520" volume "1000"

  @S01 @p1
  Scenario: Create a scale site authorization with a condition
    Given I am on the Scale Site Authorization create form
    When I create a scale site authorization with a condition
    Then the scale site authorization is created
    And the created scale site authorization includes condition "462"
