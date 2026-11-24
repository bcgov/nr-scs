# Re-grounded from UC-MSD-002 S02 (required fields) + S03 (date cross-field) + S09 (scale site not
# found), plus ERR-009/010 (integer) from the technical message catalog and ERR-024 (open a missing
# record). These are CLIENT-SIDE negatives on the edit screen: each PROVES no write left the browser
# (update-spy === 0), never inferred from a missing redirect. Every scenario seeds its own record and is
# removed at the DB on teardown. Field labels/messages match Edit/MarkSiteDesignation/index.tsx.
@msd @UC-MSD-002
Feature: Update Mark Site Designation — Validation

  # S02 (required Effective/Expiry/Reg-Dist/District Wide) + ERR-009/010 (Est. Volume / Est. Truck Loads
  # must be integers) — one outline over the field→message matrix; value "" clears a required field.
  @S02 @ERR-001 @ERR-002 @ERR-003 @ERR-004 @ERR-009 @ERR-010 @p1
  Scenario Outline: Field validation blocks the save
    Given a mark site designation exists
    When I open it for editing
    And I edit the "<field>" field to "<value>"
    And I save my changes
    Then I should see the validation error "<message>"
    And no mark site designation update should be sent

    Examples:
      | field            | value | message                                |
      | Effective Date   |       | Effective Date is required.            |
      | Expiry Date      |       | Expiry Date is required.               |
      | Reg / Dist       |       | Reg / Dist is required.                |
      | District Wide?   |       | District Wide is required.             |
      | Est. Volume      | abc   | Est. Volume must be an integer.        |
      | Est. Truck Loads | abc   | Est. Truck Loads must be an integer.   |

  # ERR-019..ERR-022 — the four free-text column limits. Same defect as create: the screen had no
  # length rule, so an over-length value reached the API and came back as the generic "Please fix the
  # errors below." banner with no field named. Now the offending textarea itself carries the legacy
  # `errors.maxlength` message, and the PUT never leaves the browser.
  @S02 @ERR-019 @ERR-020 @ERR-021 @ERR-022 @p1
  Scenario Outline: A "<field>" past its character limit blocks the save
    Given a mark site designation exists
    When I open it for editing
    And I edit the "<field>" field with <length> characters
    And I save my changes
    Then I should see the validation error "<message>"
    And no mark site designation update should be sent

    Examples:
      | field                    | length | message                                                          |
      | Geographic Location      | 41     | Geographic Location can not be greater than 40 characters.       |
      | Timber Description       | 41     | Timber Description can not be greater than 40 characters.        |
      | Transportation Date Desc | 201    | Transportation Date Desc can not be greater than 200 characters. |
      | Other Requirements       | 4001   | Other Requirements can not be greater than 4000 characters.      |

  @S03 @ERR-007 @p1
  Scenario: Expiry before effective is rejected on save
    Given a mark site designation exists
    When I open it for editing
    And I change the expiry date to before the effective date
    And I save my changes
    Then I should see the validation error "Expiry Date must be on or after Effective Date."
    And no mark site designation update should be sent

  # ERR-017: a non-existent scale site is REJECTED (not appended) AND now says why. The message used to be
  # suppressed on this screen — computed, then hidden behind the submit gate and cleared by validateSave
  # (defects.md Divergence #2, closed 2026-09-08) — so this scenario could only assert the rejection.
  # Now that add-time errors surface, it asserts both.
  @S09 @ERR-017 @p1
  Scenario: Adding a scale site that does not exist is rejected with an inline error
    Given a mark site designation exists
    When I open it for editing
    And I set District Wide to "No"
    And I try to add scale site "99999999"
    Then I should see the validation error "Site 99999999 was not found."
    And the scale site "99999999" is not added to the list
    And no mark site designation update should be sent

  # ERR-015 duplicate scale site. The seed already carries the site, so re-adding it is the duplicate. This
  # was previously classified not-applicable ("silent dedup, no error by design" — coverage.md/defects.md
  # Coverage gap #1); QA disproved that: legacy rejects the add with an inline message. The old silent path
  # also cleared the input and the error, so the screen looked exactly like a successful add.
  @S09 @ERR-015 @p1
  Scenario: Adding a scale site that is already listed is rejected with an inline error
    Given a mark site designation with a scale site exists
    When I open it for editing
    And I try to add its existing scale site again
    Then I should see the duplicate scale site error for that site
    And that scale site is listed exactly once
    And no mark site designation update should be sent

  # ERR-024 re-grounded: opening a non-existent MSD for edit surfaces a load error (no form).
  @ERR-024 @p2
  Scenario: Opening a non-existent MSD for edit shows an error
    When I open a non-existent mark site designation for editing
    Then I should see a load error

  # UC-MSD-002 Coverage gap #4 — Species Content guards on the EDIT screen. Same client-side guards as
  # create, and — unlike the edit scale-site "not found" message (suppressed, Divergence #2) — these DO
  # surface (they are not submit-gated). One seeded record walks all three reachable guards; none PUT, so
  # the record is untouched and cleaned up on teardown. The duplicate/invalid-species guards are
  # UI-unreachable (Select filters options) — logged not-applicable, not asserted.
  @S02 @p2
  Scenario: The edit screen enforces species content guards
    Given a mark site designation exists
    When I open it for editing
    And I add a species with no selection on the edit form
    Then I should see the validation error "Species is required."
    When I select species "AL" on the edit form
    And I add the species on the edit form
    Then I should see the validation error "Content is required."
    When I enter species content "1.5" on the edit form
    And I add the species on the edit form
    Then I should see the validation error "Content must be an integer."
    And no mark site designation update should be sent
