# Re-grounded from UC-CHK-001 S01 (entry/render). S07 and S08 no longer live here — see coverage.md:
#  - S08 (wrong-role denied) is COVERED ELSEWHERE, per role, in features/sec/*/url-access.feature +
#    api-access.feature. Restating it per-UC would duplicate one app-wide property 140 times.
#  - S07 (permission-gated view controls hidden) is NOT-APPLICABLE: the CHK pages call no
#    `hasPermission`, so there is no hidden state to assert. The open product question about control
#    gating is recorded ONCE, in uc-chk-004-delete/defects.md Coverage gap #3.

@chk @UC-CHK-001
Feature: Create Detail Check Scale — Navigation & Access

  @S01 @p2
  Scenario: The create form opens on the DDN entry step with Log Tally selected by default
    Given I am on the Check Scale create form
    Then the Return Type "Log Tally" should be selected
    And the Next button should be visible
