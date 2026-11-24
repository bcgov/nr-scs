# Re-grounded from UC-SCL-002 S01 (create + Appointment) and S06 (create + Exam). The new React create
# form (components/Form/ScalerForm, mode="create") always sends licenceTypes ['SCS'] and requires exactly
# one of the Appointment or Exam section (client-side XOR). Unlike MSD/CHK the write path needs NO seed
# patch — a real extracted client satisfies it, provided the client exists at loc "00" and owns no scaler
# yet (UNIQUE SCLR_UK on CLIENT_NUMBER). Success is PROVEN by a full API read-back of the persisted record
# (POST /api/scalers -> 201, GET /api/scalers/{licenceNo}), not the redirect; each created scaler is
# removed via DELETE /api/scalers/{no} on teardown. Values pinned in fixtures/scl/scaler-test-data.ts.
# Each happy path owns a DISTINCT client (00001481 vs 00001490) — so they never collide on SCLR_UK.
#
# @mode:serial — the two creates still run SEQUENTIALLY. Concurrent scaler creates collide on the
# generated SCALER_LICENCE_NO: scs_scaler_pkg assigns the licence no non-atomically, so two overlapping
# creates get the SAME value and the second fails with a DB unique-key violation ("A record already
# exists with the same unique key") and rolls back. Proven: S01 passes ALONE; only S01+S06 in parallel
# collide. Serialising the FUNCTIONAL happy paths is correct regardless of how triage rules on the
# concurrency — the suite must not depend on undefined concurrent-create behaviour. Logged in defects.md
# (Bug #1, observed) with this isolation note; not masked.
@scl @UC-SCL-002 @mode:serial
Feature: Create Scaler

  @S01 @p0
  Scenario: Create a scaler with an appointment
    Given I am on the Create Scaler form
    When I create a scaler with an appointment
    Then the scaler is created
    And the created scaler reads back with its client and a Scaling licence
    And the created scaler has an appointment

  @S06 @p1
  Scenario: Create a scaler with an exam instead of an appointment
    Given I am on the Create Scaler form
    When I create a scaler with an exam
    Then the scaler is created
    And the created scaler reads back with its client and a Scaling licence
    And the created scaler has an exam

  # The one-scaler-per-client rule (DB UNIQUE SCLR_UK on CLIENT_NUMBER). NOT in the legacy UC-SCL-002
  # slices — the new backend enforces it (ScalerService.clientHasScaler → 400 "A scaler already exists for
  # this client."), so it's covered here and logged as a spec-gap (Gherkin ⊄ source) in defects.md. Lives
  # in this SERIAL feature because its API seed generates a SCALER_LICENCE_NO (see the header).
  @p1
  Scenario: Creating a second scaler for a client that already has one is rejected
    Given a scaler already exists for client "00001500"
    And I am on the Create Scaler form
    When I try to create another scaler for client "00001500"
    Then I should see the scaler error "A scaler already exists for this client."
    And I remain on the Create Scaler form
