# Chain: UC-MNT-001.md › -detailed.md › -slices.md › gherkin/UC-MNT-001-S03/S09 › THIS FILE
#
# Re-grounded from UC-MNT-001 S03 (Delete Signatory) and S09 (Delete cancelled by the actor). Each seeds
# its own signatory via the API. S03 deletes it through the UI and proves it is gone (the seed's cleanup
# registry 404-tolerates the already-deleted row); S09 opens the confirm dialog then cancels and proves
# the record still exists.

@mnt @UC-MNT-001
Feature: Maintain Signatories — Delete

  @S03 @p0
  Scenario: Administrator deletes a signatory
    Given a disposable signatory exists
    And I am on the Signatories list
    When I open the signatory for view
    And I delete the signatory and confirm
    Then the signatory should no longer exist

  @S09 @p2
  Scenario: Cancelling the delete confirmation keeps the signatory
    Given a disposable signatory exists
    And I am on the Signatories list
    When I open the signatory for view
    And I delete the signatory and cancel
    Then the signatory should still exist
