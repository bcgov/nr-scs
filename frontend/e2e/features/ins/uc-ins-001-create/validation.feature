# Chain: UC-INS-001.md › -detailed.md › -slices.md › gherkin/UC-INS-001-S05/S06/S07 › THIS FILE
#
# Re-grounded exception slices for the create form's CLIENT-side validation. Each negative PROVES the
# write never left the browser: it asserts the inline error AND zero POSTs to the create endpoint
# (inspectionCreateCalls === 0) — a missing redirect alone is not proof.
#
# Message text is the new app's actual wording (nr-scs Create/ScaleSiteInspection validateFormValues),
# which differs from the legacy ERR-### text (e.g. legacy "Site Operator Present? is required." ->
# new "Site Operator present during Inspection is required.").
#
# Re-grounding of the legacy S07: the "follow-up field populated when NOT required" arm (legacy ERR-008)
# is UNREACHABLE in the new UI — selecting Follow-Up Required = N clears and DISABLES the action/due/
# complete inputs, so they cannot be populated. Only the "missing when required" arm is testable here;
# the omission is logged as a re-grounding note in coverage.md, not a gap.

@ins @UC-INS-001
Feature: Create Site Inspection — validation

  # Stage-1 required fields (Inspection Type + Site Type). Legacy S05 lists Inspection Type as required
  # and S01's control matrix marks both required; the new app enforces them in validateStageOneValues,
  # blocking Next and keeping the actor on the parameters step (never reaching the details form). The
  # FUNCTIONAL block + the visible Inspection Type error are asserted here; the Site Type message
  # visibility is asserted in the next scenario.
  @S05 @p1
  Scenario: Continuing without an inspection type or site type is blocked on the parameters step
    Given I am on the site inspection create screen for scale site "520"
    When I continue without choosing an inspection type or site type
    Then I should see the error "Inspection Type is required."
    And the inspection parameters step is shown

  # "Site Type is required." was rendered but hidden (a bare <p class="cds--form-requirement">, which
  # Carbon hides by default) — a divergence, now fixed in nr-scs (index.scss reveals + colours it).
  @S05 @p1
  Scenario: Site Type required error is visible when continuing without a site type
    Given I am on the site inspection create screen for scale site "520"
    When I continue without choosing an inspection type or site type
    Then I should see the error "Site Type is required."

  @S05 @p1
  Scenario: Save with the required fields blank is blocked before any write
    Given I am on the site inspection create screen for scale site "520"
    When I choose inspection type "MIN" and site type "W"
    And I save the inspection
    Then I should see the error "Site Operator present during Inspection is required."
    And I should see the error "Inspection Date is required."
    And I should see the error "Answer is required."
    And no inspection create request should be sent

  @S06 @p1
  Scenario: A future inspection date is rejected before any write
    Given I am on the site inspection create screen for scale site "520"
    When I choose inspection type "MIN" and site type "W"
    And I fill a valid inspection and answer every question
    And I set the inspection date to a future date
    And I save the inspection
    Then I should see the error "Inspection Date cannot be in the future."
    And no inspection create request should be sent

  @S07 @p1
  Scenario: Follow-up required without its details is rejected before any write
    Given I am on the site inspection create screen for scale site "520"
    When I choose inspection type "MIN" and site type "W"
    And I fill a valid inspection and answer every question
    And I flag follow-up required on the first question
    And I save the inspection
    Then I should see the error "Action Required is required when follow-up is required."
    And no inspection create request should be sent
