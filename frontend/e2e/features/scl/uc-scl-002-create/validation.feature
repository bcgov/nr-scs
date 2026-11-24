# Re-grounded validation slices for Create Scaler. Messages are the NEW React form's copy (ScalerForm),
# NOT the legacy FLD-/ERR- text. These need NO serialisation: S02/S03/S04 are blocked CLIENT-SIDE (no POST
# fires — proven by the create spy === 0), and S08 is rejected by the server BEFORE a SCALER_LICENCE_NO is
# generated (clientExists fails first), so none of them collide on the non-atomic licence-no generation
# that forces create.feature to run serial. Values pinned in fixtures/scl/scaler-test-data.ts.
#
# Re-grounding notes: FLD-006 (licence-type-required) and S05 (Waste + Expiry, ERR-003) are UI-unreachable
# — the Scaling/Waste checkboxes are edit-mode only; create always sends ['SCS']. Logged as Coverage-gaps
# in defects.md, not tested here.
@scl @UC-SCL-002
Feature: Create Scaler — Validation

  # S02 — each required core field, blanked in turn (the others valid + a valid Appointment section, so
  # ONLY the named field errors). Client-side => the create POST never fires.
  @S02 @p1
  Scenario Outline: Save is blocked when required "<field>" is missing
    Given I am on the Create Scaler form
    When I try to save a scaler with the "<field>" field blank
    Then I should see the scaler error "<message>"
    And no scaler create request is sent
    And I remain on the Create Scaler form

    Examples:
      | field          | message                        |
      | Client         | Client is required.            |
      | District       | District is required.          |
      | Effective Date | Effective Date is required.    |
      | Oath           | Scaler Oath Taken is required. |

  # S03 — both the Appointment and the Exam / Upgrade sections filled (mutual exclusion). Client-side.
  @S03 @p1
  Scenario: Save is blocked when both an appointment and an exam are entered
    Given I am on the Create Scaler form
    When I try to save a scaler with both an appointment and an exam
    Then I should see the scaler error "Please complete either the Appointment section or the Exam / Upgrade section (not both)."
    And no scaler create request is sent
    And I remain on the Create Scaler form

  # S04 — neither section filled (Scaling is implicit on create, so exactly one is still required). Client-side.
  @S04 @p1
  Scenario: Save is blocked when neither an appointment nor an exam is entered
    Given I am on the Create Scaler form
    When I try to save a scaler with neither an appointment nor an exam
    Then I should see the scaler error "Please complete either the Appointment section or the Exam / Upgrade section."
    And no scaler create request is sent
    And I remain on the Create Scaler form

  # S08 — a client number not in the SCS client registry (server-reject; the POST fires and 400s, so no
  # spy===0 assertion here — the proof is the server message + staying on the form, nothing persisted).
  @S08 @p1
  Scenario: Saving with a client number not in SCS is rejected by the server
    Given I am on the Create Scaler form
    When I try to save a scaler for an unknown client
    Then I should see the scaler error "No client found for client number 99999999 at location 00."
    And I remain on the Create Scaler form
