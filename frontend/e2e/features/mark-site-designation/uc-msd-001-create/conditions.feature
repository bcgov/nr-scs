# The POSITIVE flow of the shared AuthorizationConditionsSection — covered ONCE here, on the MSD create
# host, for the whole component (the identical section is embedded in MSD create/edit AND the Scaler /
# Scale-Site authorization screens; per the "cover once" convention this satisfies the deferred items in
# UC-MSD-001 coverage.md CG#3 and UC-MSD-002 CG#1/#3). Only the negative numeric guard (@S10 @ERR-016) was
# previously covered. These exercise: the mandatory-condition auto-load + mandatory-remove-block, add-by-id
# (valid) + remove, add-by-id not-found (ERR-014), apply-template (S10 positive), and the condition search
# modal. All are CLIENT-side (no POST — Save is never clicked) → no seed, no cleanup, parallel-safe.
#
# Data ground-truthed 2026-08-04 against class MSD (GET /api/scaler-authorizations/conditions?scaleConditionClassCode=MSD):
#   mandatory (auto-loaded): 185 DIRECT TRANSPORTATION … ; non-mandatory: 190 TRANSPORTATION CUT-OFF,
#   191 PRE-TRANSPORT LETTER DISTRIBUTION, 194 ADDITIONAL CONDITIONS; template 443 → conditions {190,191}.
# District Wide=Yes so the Scale Sites section stays hidden (only the Conditions/Species advanced controls).
@msd @UC-MSD-001
Feature: Create Mark Site Designation — Conditions Section (shared component)

  @p1
  Scenario: Mandatory conditions auto-load and cannot be removed
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "Yes"
    And I open the conditions section
    Then the conditions table lists condition titled "DIRECT TRANSPORTATION"
    And the remove button for condition "185" is disabled
    And no mark site designation should be created

  @p1
  Scenario: A valid condition can be added by number and then removed
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "Yes"
    And I open the conditions section
    And I add a condition numbered "190"
    Then the conditions table lists condition titled "TRANSPORTATION CUT-OFF"
    When I remove the condition titled "TRANSPORTATION CUT-OFF"
    Then the conditions table no longer lists condition titled "TRANSPORTATION CUT-OFF"
    And no mark site designation should be created

  @p1 @ERR-014
  Scenario: Adding an unknown condition number reports it was not found
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "Yes"
    And I open the conditions section
    And I add a condition numbered "999999"
    Then I should see the conditions error "Condition 999999 was not found."
    And no mark site designation should be created

  # ERR-015 duplicate, covered once here for the shared component like the rest of this file. 185 is the
  # mandatory condition the first scenario proves is auto-loaded, so re-adding it by number IS the
  # duplicate — and it is QA's exact repro. Previously classified not-applicable ("silent dedup, no error
  # by design", UC-MSD-002 defects.md Coverage gap #1); legacy rejects it, so that reading was wrong.
  #
  # The wording asserted here is MSD's own (`errors.dup_condition`), which names the record type and takes
  # no id — NOT the component's `scaleSiteAuthorization.duplicateCondition` default ("The condition {0} has
  # already been added."). So this also proves the per-host duplicateConditionMessage prop is wired.
  @p1 @ERR-015
  Scenario: Adding a condition that is already listed reports the duplicate
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "Yes"
    And I open the conditions section
    Then the conditions table lists condition titled "DIRECT TRANSPORTATION"
    When I add a condition numbered "185"
    Then I should see the conditions error "Condition already exists for Mark Site Designation."
    And the conditions table lists condition titled "DIRECT TRANSPORTATION"
    And no mark site designation should be created

  @S10 @p1
  Scenario: Applying a condition template appends its conditions
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "Yes"
    And I open the conditions section
    And I apply the condition template "443"
    Then the conditions table lists condition titled "TRANSPORTATION CUT-OFF"
    And the conditions table lists condition titled "PRE-TRANSPORT LETTER DISTRIBUTION"
    And no mark site designation should be created

  @p2
  Scenario: A condition can be added via the condition search modal
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics with District Wide "Yes"
    And I open the conditions section
    And I add condition "194" from the condition search
    Then the conditions table lists condition titled "ADDITIONAL CONDITIONS"
    And no mark site designation should be created
