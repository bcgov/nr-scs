# Chain: UC-SST-006.md › -detailed.md › -slices.md › gherkin/UC-SST-006-S09,-S10,-S11 › THIS FILE
#
# The contact create/edit forms run `validateContactForm` CLIENT-side, so required / invalid-format /
# date-order errors are caught before any request — each negative proves `no create-contact` /
# `no update-contact request should be sent` (spy === 0) and that the form stays open. Each scenario seeds
# + DB-cleans its OWN site (+ contact), parallel-safe.
#
# @mode:serial — the site seeds go through the racy min-free-id PK trigger (see uc-sst-004-create/defects.md).
@sst @UC-SST-006 @mode:serial
Feature: Maintain Scale Site Contacts — validation

  @S09 @p1
  Scenario: Required contact fields are enforced before any create request
    Given I am on the Contacts tab of a scale site
    When I save the add-contact form with all fields blank
    Then I should see the error "Client Contact ID is required."
    And I should see the error "Contact Role is required."
    And I should see the error "Site Information Access is required."
    And I should see the error "Effective Date is required."
    And no create-contact request should be sent
    And the add-contact form is still open

  @S10 @p1
  Scenario: A non-numeric client contact id is rejected before any create request
    Given I am on the Contacts tab of a scale site
    When I save the add-contact form with client contact id "abc"
    Then I should see the error "Client Contact ID must be a valid number."
    And no create-contact request should be sent
    And the add-contact form is still open

  @S10 @p1
  Scenario: An expiry date before the effective date is rejected before any create request
    Given I am on the Contacts tab of a scale site
    When I save the add-contact form with an expiry before the effective date
    Then I should see the error "Expiry Date must be on or after the Effective Date."
    And no create-contact request should be sent
    And the add-contact form is still open

  @S11 @p1
  Scenario: A blank role on update is rejected before any update request
    Given I am editing a contact on a scale site
    When I clear the contact role and save
    Then I should see the error "Contact Role is required."
    And no update-contact request should be sent
