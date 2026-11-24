# Re-grounded from UC-SCL-003 S01 (Update identity + licence fields) and S08 (Reset). The new app has NO
# separate update page: the View Scaler screen's Summary tab has an "Edit Record" button that opens the
# "Scaler Record - Edit" modal (components/Form/ScalerForm mode="edit"), saved with PUT /api/scalers/{no}.
# Success is PROVEN by a full API read-back of the persisted record, not the modal close. Each mutating
# slice seeds its OWN scaler under a distinct unconsumed client and DELETEs it on teardown. Values pinned
# in fixtures/scl/scaler-edit-test-data.ts.
#
# @mode:serial — the seed (POST /api/scalers) generates a SCALER_LICENCE_NO non-atomically, so concurrent
# seeds collide on a DB unique-key violation (UC-SCL-002 Bug #1). The UPDATE (PUT) itself does not generate
# a licence no, but every slice here seeds first, so the whole feature runs sequentially — same rationale
# and precedent as uc-scl-002-create/create.feature.
@scl @UC-SCL-003 @mode:serial
Feature: Update Scaler

  # S01 arm 1 — identity fields (Reg/Dist + Oath). Seed files the scaler at district 1831 / oath Y; this
  # changes both and reads them back.
  @S01 @p0
  Scenario: Update a scaler's identity fields
    Given a scaler exists for editing
    And I open the scaler for editing
    When I change the Reg / Dist to another district
    And I change the Scaler Oath Taken to "No"
    And I save the scaler edit
    Then the scaler edit is saved
    And the scaler reads back with district "56" and oath "N"

  # S01 arm 2 — licence fields. Exercises the EDIT-mode-only Waste checkbox + Expiry Date, the controls
  # the Create form hides (closes UC-SCL-002 Coverage-gap #1). Scaling stays checked → licenceTypes ['SCS','WA'].
  @S01 @p1
  Scenario: Add a Waste licence type and expiry date to a scaler
    Given a scaler exists for editing
    And I open the scaler for editing
    When I add the Waste licence type with an expiry date
    And I save the scaler edit
    Then the scaler edit is saved
    And the scaler reads back with a Waste licence and an expiry date

  # S08 — Reset is a DB reload (legacy viewUpdate): change a field, Reset, and the field reverts to the
  # persisted value. No PUT fires (nothing is saved).
  @S08 @p1
  Scenario: Reset discards unsaved edits and reloads the persisted values
    Given a scaler exists for editing
    And I open the scaler for editing
    When I change the Scaler Oath Taken to "No"
    Then the Scaler Oath Taken field shows "No"
    When I reset the scaler edit form
    Then the Scaler Oath Taken field shows "Yes"
