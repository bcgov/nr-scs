# Chain: UC-CCQ-003.md › -detailed.md › -slices.md › gherkin/UC-CCQ-003-S03/S07 › THIS FILE
#
# Re-grounded from UC-CCQ-003 S03 (delete a template + its condition bindings) and S07 (cancel the delete
# confirmation). Each seeds its own template via the API. S03 deletes it through the UI (shared
# ConfirmDeleteModal) and proves it is gone (the cleanup registry 404-tolerates the already-deleted row);
# S07 opens the confirm dialog then cancels and proves the record still exists.
@ccq @UC-CCQ-003
Feature: Maintain Templates — Delete

  @S03 @p0
  Scenario: Administrator deletes a template
    Given a disposable template exists
    And I am on the Templates list
    When I open the template for view
    And I delete the template and confirm
    Then the template should no longer exist

  @S07 @p2
  Scenario: Cancelling the delete confirmation keeps the template
    Given a disposable template exists
    And I am on the Templates list
    When I open the template for view
    And I delete the template and cancel
    Then the template should still exist

  # S03's slice is "delete a template AND its condition bindings", but the scenario above deletes an
  # UNBOUND template — `seedTemplate` posts no conditions — so the cascade half was never exercised. Two
  # real failures hid behind that: an FK constraint refusing the delete outright, and a delete that
  # succeeds while leaving orphaned SCALE_TEMPLATE_CONDITION rows. The first is caught by the template
  # being gone, the second only by reading the join table, which is why this one drops to the DB.
  @S03 @p1
  Scenario: Deleting a template also removes its condition bindings
    Given a disposable template with a bound condition exists
    And I am on the Templates list
    When I open the template for view
    And I delete the template and confirm
    Then the template should no longer exist
    And no condition bindings should remain for the deleted template
