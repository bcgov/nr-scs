# Re-grounded validation slices for Create Scale Site Authorization. Two client-side validators run:
# "Add Conditions" runs validateBasics (required fields, date validity/order, volume numeric/non-negative);
# the condition-add controls validate the Condition #/Template inline. Messages are the NEW React form's
# actual copy (pages/Create/ScaleSiteAuthorization + components/Form/AuthorizationConditionsSection), NOT the
# legacy ERR- text. Client-side cases PROVE no create request was sent (scaleSiteAuthCreateCalls === 0);
# the server-reject (non-existent site) fires the POST and is rejected 400 with the record not persisted.
#
# Re-grounding note: the client requires expiry STRICTLY AFTER effective ("must be after"), while the server
# allows equal ("on or before") — the stricter client rule is what a user hits (see defects.md Divergence).
@sca @UC-SCA-005
Feature: Create Scale Site Authorization — Validation

  @S05 @p1
  Scenario Outline: Add Conditions blocks a missing "<field>"
    Given I am on the Scale Site Authorization create form
    When I fill valid scale site auth basics except "<field>" is "<value>"
    And I click Add Conditions
    Then I should see the error "<message>"
    And I should remain on the scale site authorization create form
    And no scale site authorization should be created

    Examples:
      | field                        | value | message                                   |
      | Scale Site #                 |       | Scale Site # is required.                 |
      | Effective Date               |       | Effective Date is required.               |
      | Expiry Date                  |       | Expiry Date is required.                  |
      | Expected Annual Scale Volume |       | Expected Annual Scale Volume is required. |

  # The client requires expiry STRICTLY AFTER effective; the server allows equal ("on or before"). The
  # "equal to" row is the ONLY case where the two rules disagree (defects.md Divergence #1) — the client
  # rejection is what a user hits, so it is asserted here as a GREEN test of the intended-stricter UI rule
  # (NOT a @discovered-divergence red). The "before" row is rejected by both client and server.
  @S05 @p1
  Scenario Outline: Add Conditions blocks an expiry date <relation> the effective date
    Given I am on the Scale Site Authorization create form
    When I enter a scale site auth expiry date "<relation>" the effective date
    And I click Add Conditions
    Then I should see the error "Expiry Date must be after Effective Date."
    And I should remain on the scale site authorization create form
    And no scale site authorization should be created

    Examples:
      | relation |
      | before   |
      | equal to |

  @S05 @p1
  Scenario Outline: Add Conditions blocks an invalid Expected Annual Scale Volume "<value>"
    Given I am on the Scale Site Authorization create form
    When I fill valid scale site auth basics except "Expected Annual Scale Volume" is "<value>"
    And I click Add Conditions
    Then I should see the error "<message>"
    And no scale site authorization should be created

    Examples:
      | value | message                                          |
      | abc   | Expected Annual Scale Volume must be a number.    |
      | -5    | Expected Annual Scale Volume must be 0 or greater. |

  @S06 @p1
  Scenario: A non-numeric condition number is rejected
    Given I am on the Scale Site Authorization create form
    When I fill valid scale site auth basics
    And I click Add Conditions
    And I add a scale site auth condition "abc"
    Then I should see the error "Condition # must be a valid number."
    And no scale site authorization should be created

  @S06 @p1
  Scenario: A condition number that does not exist is rejected
    Given I am on the Scale Site Authorization create form
    When I fill valid scale site auth basics
    And I click Add Conditions
    And I add a scale site auth condition "9999999"
    Then I should see the error "Condition 9999999 was not found."
    And no scale site authorization should be created

  # NOTE: the legacy "Template is required." guard is UNREACHABLE in the new app — the Apply button is
  # disabled until a template is selected (better UX than an error), so no click can trigger it. Logged as a
  # not-applicable coverage note in coverage.md / defects.md, not tested here.

  @S07 @p1
  Scenario: Saving with a scale site that does not exist is rejected by the server
    Given I am on the Scale Site Authorization create form
    When I fill valid scale site auth basics except "Scale Site #" is "9999"
    And I click Add Conditions
    And I click Save Record
    Then I should see the error "Scale Site # does not exist."
    And I should remain on the scale site authorization create form

  # Server rule validateMaxAuthorizationLength (system setting SALM = max window in YEARS) rejects an
  # over-long window. The client does NOT enforce it, so "Add Conditions" passes and the POST fires, rejected
  # 400. Uses a deliberately absurd ~100-year window so the scenario is deterministic regardless of the live
  # SALM value; the assertion matches the message substring ("cannot exceed"), not the exact "N years."
  @S07 @p1
  Scenario: Saving a window longer than the maximum authorization length is rejected by the server
    Given I am on the Scale Site Authorization create form
    When I fill scale site auth basics with a window exceeding the max authorization length
    And I click Add Conditions
    And I click Save Record
    Then I should see the error "cannot exceed"
    And I should remain on the scale site authorization create form

  @S02 @p2
  Scenario: Reset clears the create form and collapses the conditions section
    Given I am on the Scale Site Authorization create form
    When I fill valid scale site auth basics
    And I click Add Conditions
    And I reset the scale site auth create form
    Then the scale site auth create form is cleared
