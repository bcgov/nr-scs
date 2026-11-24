# Chain: UC-MNT-001.md › -detailed.md › -slices.md › gherkin/UC-MNT-001-S02/S05 › THIS FILE
#
# Re-grounded from UC-MNT-001 S02 (Edit Signatory happy path) and the edit-side of S05 (required field
# cleared on edit). Each scenario seeds its own signatory via the API, then edits it — self-cleaning and
# parallel-safe. Save forwards to the read-only view.

@mnt @UC-MNT-001
Feature: Maintain Signatories — Update

  @S02 @p0
  Scenario: Administrator edits an existing signatory
    Given a disposable signatory exists
    And I am on the Signatories list
    When I open the signatory for view
    And I open the signatory edit form
    And I set the signatory "Position" field to "Senior Scaling Officer"
    And I save the signatory
    Then the saved signatory should match the submitted values

  @S05 @p1
  Scenario: Update is blocked when the Last Name is cleared
    Given a disposable signatory exists
    And I am on the Signatories list
    When I open the signatory for view
    And I open the signatory edit form
    And I clear the signatory "Last Name" field
    And I save the signatory
    Then I should see the error "Last Name is required."
    And no update-signatory request should be sent
