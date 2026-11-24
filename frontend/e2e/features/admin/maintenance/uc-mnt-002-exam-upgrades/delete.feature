# Chain: UC-MNT-002.md › -detailed.md › -slices.md › gherkin/UC-MNT-002-S03/S04 › THIS FILE
#
# Re-grounded from UC-MNT-002 S03 (delete without dependents) and S04 (delete blocked by dependent
# scaler-training records). S03 seeds its own childless record, deletes it via the UI, proves it is gone.
#
# S04: deleting a type still referenced by scaler-training rows is blocked — the row survives AND the app
# now shows a meaningful "…cannot be deleted" message (HTTP 400), consistent with Maintain Appointment
# Types. This WAS a discovered divergence (generic HTTP 500) — FIXED in nr-scs `ExamUpgradeService`
# (translate the FK DataIntegrityViolationException to a domain 400), so the scenario is now green. See
# defects.md Divergence #1 (CLOSED).

@mnt @UC-MNT-002
Feature: Maintain Exam Upgrades — Delete

  @S03 @p0
  Scenario: Administrator deletes an exam upgrade with no dependents
    Given a disposable exam upgrade exists
    And I am on the Exam Upgrades list
    When I open the exam upgrade for view
    And I delete the exam upgrade and confirm
    Then the exam upgrade should no longer exist

  @S04 @p1
  Scenario: Deleting an exam upgrade with dependents is blocked with a meaningful message
    Given an exam upgrade with dependent records exists
    And I am on the Exam Upgrades list
    When I open the exam upgrade for view
    And I delete the exam upgrade and confirm
    Then the exam upgrade should still exist
    And I should see the error "cannot be deleted"
