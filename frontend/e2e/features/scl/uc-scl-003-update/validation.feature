# Re-grounded validation slices for the "Scaler Record - Edit" modal (ScalerForm mode="edit"). Messages
# are the NEW form's copy (validateScalerForm, mode='edit') — the legacy update-screen texts, distinct from
# the create-mode copy. These need NO serialisation: they open a REAL anchor scaler READ-ONLY and are all
# blocked CLIENT-SIDE (no PUT fires — proven by the update spy === 0), so nothing persists and no seed /
# licence-no generation is involved. The anchor licence no is pinned in fixtures/scl/scaler-edit-test-data.ts
# (kept out of this file so a DB re-extract re-pins in one place).
#
# Re-grounding notes: legacy S05 (Scaling + NEITHER appointment nor exam → "You must select an Appointment
# or an Exam.") is UI-unreachable here — the app enforces the appointment-XOR-exam rule only when the
# scaler has no prior appointment or exam (enforceApptExamXor = !appointment && !exam), and every scaler we
# can seed/open already owns one. Logged as a Coverage-gap in defects.md. S07 (free-text yyyyMMdd format)
# is not-applicable — the Carbon DatePicker emits YYYY-MM-DD. The expiry-before-effective rule below is a
# NEW edit-mode check absent from the legacy slices (logged as a spec-gap).
@scl @UC-SCL-003
Feature: Update Scaler — Validation

  # S02 — each required core field, cleared in turn (the others keep the anchor's valid values, so ONLY the
  # cleared field errors). Client-side => the PUT never fires.
  @S02 @p1
  Scenario Outline: Save is blocked when required "<field>" is cleared
    Given I open the sample scaler for editing
    When I clear the "<field>" on the scaler edit form
    And I save the scaler edit
    Then I should see the scaler error "<message>"
    And no scaler update request is sent
    And the scaler edit form is still open

    Examples:
      | field          | message                         |
      | Reg / Dist     | Reg / Dist is required.         |
      | Effective Date | Effective Date is required.     |
      | Oath           | Scaler Oath Taken? is required. |

  # S03 — both licence-type checkboxes cleared (edit-only controls; at least one required).
  @S03 @p1
  Scenario: Save is blocked when no licence type is selected
    Given I open the sample scaler for editing
    When I clear both licence types on the scaler edit form
    And I save the scaler edit
    Then I should see the scaler error "You must select at least 1 Licence Type."
    And no scaler update request is sent
    And the scaler edit form is still open

  # S04 — both the Appointment and the Exam sections filled (mutual exclusion; applies regardless of the
  # XOR gate — the server persists only one, so letting both through would silently drop the exam).
  @S04 @p1
  Scenario: Save is blocked when both an appointment and an exam are entered
    Given I open the sample scaler for editing
    When I fill both an appointment and an exam on the scaler edit form
    And I save the scaler edit
    Then I should see the scaler error "Either the Appointment section or the Exam section is required but not both."
    And no scaler update request is sent
    And the scaler edit form is still open

  # S06 — Waste licence type checked with the Expiry Date left blank (edit-only rule).
  @S06 @p1
  Scenario: Save is blocked when Waste is selected with no expiry date
    Given I open the sample scaler for editing
    When I select the Waste licence type without an expiry date
    And I save the scaler edit
    Then I should see the scaler error "Expiry Date is required if Licence Type Waste is selected."
    And no scaler update request is sent
    And the scaler edit form is still open

  # (new, not in the legacy slices) — the edit form rejects an expiry date earlier than the effective date.
  # Logged as a spec-gap in defects.md (Gherkin ⊄ source).
  @p1
  Scenario: Save is blocked when the expiry date is before the effective date
    Given I open the sample scaler for editing
    When I set an expiry date earlier than the effective date
    And I save the scaler edit
    Then I should see the scaler error "Scaler effective date must be on or before the licence expiry date."
    And no scaler update request is sent
    And the scaler edit form is still open
