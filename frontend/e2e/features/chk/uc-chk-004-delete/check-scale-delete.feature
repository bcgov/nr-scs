# Re-grounded from UC-CHK-004 (Delete Detail Check Scale): S01 (happy delete + confirm), S02 (cancel),
# S07 (legacy Delete disabled), plus two paths that only became reachable once delete was built — the
# server's refusal surface and the read-only-legacy server guard.
#
# Still un-authorable, logged in coverage.md / defects.md: S03/S04 (DB-child / advisory-letter block
# delete) — the new app cascades instead of blocking and the advisory letter cannot be generated in this
# environment; S05 (record not found) — already covered by UC-CHK-003 S06 on the same view screen;
# S06/S08 (permission-gated Delete / list links) — the new app renders both regardless of permission, and
# the endpoint-level denial is covered in features/sec/check-scaler-role/api-access.feature.
#
# Re-grounding notes:
#  - Legacy used a JS window.confirm("Are you sure you want to delete this record?"); the new app uses a
#    Carbon <Modal> with the SAME heading and a "Confirm Delete" / "Cancel" pair.
#  - The legacy list screens (.scalerCheckScales) are re-grounded to the Scaler Check Scales tab; the
#    Delete affordance lives on the detail VIEW screen (/check-scales/view/{id}), reached from that tab.

@chk @UC-CHK-004
Feature: Delete Detail Check Scale

  # Was a @discovered-divergence ("delete not wired"). Delete IS wired now, and the residual red was the
  # test's own doing: the read-back fired while the DELETE was still in flight. The step now awaits the
  # DELETE response and polls the read-back, per the suite's UI-triggered-read-back rule. See defects.md
  # Divergence #1 (CLOSED).
  @S01 @p0
  Scenario: Confirming deletion removes the check scale
    Given I have created a fresh detail check scale to delete
    When I click Delete and confirm the deletion
    Then the check scale should be deleted
    And I should be taken off the check scale view page

  @S02 @p1
  Scenario: Cancelling the confirmation dialog leaves the record unchanged
    Given I am viewing the non-legacy check scale
    When I click Delete
    Then the delete confirmation dialog should appear
    When I cancel the deletion
    Then the check scale should still exist
    And I should remain on the check scale view page

  # The failure arm of S01, unreachable while delete was a stub. A REAL server refusal is induced (the
  # record is removed out-of-band first, so the app's DELETE meets a genuine 404) rather than stubbed —
  # the assertion is that the view reports what the server said, which a fulfilled route could not show.
  @S01 @p1
  Scenario: A delete the server refuses is reported and leaves the user on the view
    Given I have created a fresh detail check scale to delete
    And the record has been deleted by someone else in the meantime
    When I click Delete and confirm the deletion
    Then the delete failure should be reported on the view
    And I should remain on the check scale view page

  @S07 @p1
  Scenario: Delete is disabled for a legacy check scale (STA-002)
    Given I am viewing the legacy check scale
    Then the Delete button should be disabled

  # The other half of S07: the button is disabled, but the server deletes a legacy record on request — and
  # so did legacy. `CheckScaleAction.delete` built a BO carrying ONLY the id and called
  # `delegate.deleteCheckScale(bo)` -> `db.delete(bo)`: it never loaded the record, never validated, never
  # looked at `ckscType`. Legacy's delete was even less guarded than its update. So this is parity, and the
  # scenario pins the real contract rather than a rule that never existed (see defects.md; the same
  # correction as UC-CHK-002 S04 and UC-CHK-001 S06). Runs against a DISPOSABLE legacy record because the
  # delete genuinely goes through.
  @S07 @p1
  Scenario: The API accepts a delete of a legacy check scale (legacy parity)
    Given I have created a fresh legacy check scale
    When I request deletion of that legacy check scale through the API
    Then the API should accept the write, matching legacy
    And that legacy check scale should be gone
