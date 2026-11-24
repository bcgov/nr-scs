# Re-grounded from UC-SST-006 (Maintain Scale Site Contacts) onto the new React app: the Contacts tab on
# /scale-sites/view/{id}. A contact links the site to a REAL SI-type client contact (clientContactId 2504);
# Add/Edit/View replace the tab inline, Delete uses a confirm modal. Writes go to
# POST/PUT/DELETE /scale-sites/{id}/contacts[/{cc}]; success is PROVEN by an API read-back of
# GET /scale-sites/{id}/contacts. Each scenario seeds + DB-cleans its OWN site (+ contact) — a dedicated
# mutable key, parallel-safe; the site seed uses the create endpoint (needs the sst/integer-number-seed patch).
#
# This UC also absorbs UC-SST-005 S07 (add contact) / S08 (edit contact). Deferred/blocked slices
# (CIMS search modal S03, reset-update S08, permission S12) are in coverage.md.
#
# @mode:serial — the site seeds go through the racy min-free-id PK trigger (see uc-sst-004-create/defects.md).
@sst @UC-SST-006 @mode:serial
Feature: Maintain Scale Site Contacts

  @S01 @p0
  Scenario: Add a site contact
    Given I am on the Contacts tab of a scale site
    When I add a site contact
    Then the contact reads back on the scale site

  @S02 @p1
  Scenario: Add a primary site contact
    Given I am on the Contacts tab of a scale site
    When I add a primary contact
    Then the contact reads back as the primary contact

  @S04 @p1
  Scenario: Update an existing contact's role
    Given I am on the Contacts tab of a scale site with a contact
    When I edit the contact and change its role
    Then the contact reads back with the updated role

  @S05 @p1
  Scenario: Delete a contact
    Given I am on the Contacts tab of a scale site with a contact
    When I delete the contact
    Then the contact no longer reads back on the scale site

  @S06 @p2
  Scenario: View a contact's detail
    Given I am on the Contacts tab of a scale site with a contact
    When I view the contact
    Then the contact detail shows its role

  @S07 @p2
  Scenario: Reset the add-contact form before saving
    Given I am on the Contacts tab of a scale site
    When I open the add site contact form and reset it
    Then the contact role field is cleared
