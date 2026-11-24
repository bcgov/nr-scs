# Re-grounded validation slices for the "Scaler Appointment - Create" modal (ScalerAppointmentForm).
# Messages are the NEW form's copy (appointmentFormUtils.validateAppointmentForm 'create'). These need NO
# serialisation: they open a REAL anchor scaler's Add modal READ-ONLY and are all blocked CLIENT-SIDE (no
# POST fires — proven by the appointment spy === 0), so nothing persists and no seed is involved. Anchor
# licence no pinned in fixtures/scl/scaler-edit-test-data.ts.
#
# Re-grounding notes: S04 (free-text yyyyMMdd invalid format) is not-applicable — the Carbon DatePicker
# emits YYYY-MM-DD. S07's "Province Wide = Yes + Reg/Dist selected" arm is UI-unreachable — selecting Yes
# disables AND auto-clears the district field (AppointmentsTab.tsx:220) — so only the "Reg/Dist required
# when not province-wide" arm is testable. S08 (no permission) is blocked by single-role mock auth. All
# logged as gaps in defects.md.
@scl @UC-SCL-004
Feature: Add Scaler Appointment — Validation

  # S03 — each required field, omitted in turn (the others filled validly, so ONLY the omitted one errors).
  @S03 @p1
  Scenario Outline: Add is blocked when required "<field>" is missing
    Given I open the Appointments tab for the sample scaler
    When I try to add an appointment with the "<field>" field omitted
    Then I should see the appointment error "<message>"
    And no appointment request is sent
    And the add-appointment form is still open

    Examples:
      | field          | message                  |
      | Appointment    | Appointment is required. |
      | Province Wide  | Province Wide is required. |
      | Effective Date | Effective Date is required. |

  # S05 — expiry earlier than effective.
  @S05 @p1
  Scenario: Add is blocked when the expiry date is before the effective date
    Given I open the Appointments tab for the sample scaler
    When I try to add an appointment with an expiry before the effective date
    Then I should see the appointment error "Appointment effective date must be on or before the appointment expiry date."
    And no appointment request is sent
    And the add-appointment form is still open

  # S06 — an Acting (type A) appointment whose period exceeds the 1-year maximum.
  @S06 @p1
  Scenario: Add is blocked when the appointment period exceeds the maximum for its type
    Given I open the Appointments tab for the sample scaler
    When I try to add an appointment exceeding the maximum period
    Then I should see the appointment error "Appointment expiry date cannot be more than 1 year(s) after the appointment effective date for appointment type A."
    And no appointment request is sent
    And the add-appointment form is still open

  # S07 — Province Wide? = No with no Reg/Dist (only the reachable arm; see header).
  @S07 @p1
  Scenario: Add is blocked when a non-province-wide appointment has no district
    Given I open the Appointments tab for the sample scaler
    When I try to add a non-province-wide appointment without a district
    Then I should see the appointment error "District is required when the appointment is not province-wide."
    And no appointment request is sent
    And the add-appointment form is still open

  # S09 — open the Add form then leave via Back; nothing is created.
  @S09 @p2
  Scenario: Leaving the add-appointment form via Back creates nothing
    Given I open the Appointments tab for the sample scaler
    When I open the add-appointment form and click Back
    Then the add-appointment form is closed
    And no appointment request is sent
