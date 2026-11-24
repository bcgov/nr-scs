# Chain: UC-CCQ-003.md › -detailed.md › -slices.md › gherkin/UC-CCQ-003-S05/S06 › THIS FILE
#
# Re-grounded from UC-CCQ-003 S05 (Reset discards unsaved changes) and S06 (Back without saving). In the
# new app both act on the create/edit modal: Reset restores the form (empty in create mode); Back closes
# the modal to the list. Neither persists anything — proven by a search-by-name read-back returning empty.
@ccq @UC-CCQ-003
Feature: Maintain Templates — Reset and Back

  @S05 @p2
  Scenario: Reset clears the create form
    Given I am on the Templates list
    And I open the template create form
    When I set the template Name field to "E2E CCQ003 reset probe"
    And I reset the template form
    Then the Template Name field should be blank

  @S06 @p2
  Scenario: Back from the create form discards the new template
    Given I am on the Templates list
    And I open the template create form
    When I enter a valid template
    And I go back from the template form
    Then the template modal should be closed
    And no create-template request should be sent
    And no template matching the entered name should exist

  # Coverage gap #3 — the EDIT-mode arms of S05/S06. Same client handlers as the create-mode scenarios
  # above (`resetForm()` / `setModalMode(null)`), but the assertions invert: create-mode Reset empties the
  # form, edit-mode Reset must RESTORE the loaded record; and Back must leave it persisted unchanged.
  @S05 @p2
  Scenario: Reset restores the edited template's saved name
    Given a disposable template exists
    And I am on the Templates list
    When I open the template for view
    And I open the template edit form
    And I set the template Name field to "E2E CCQ003 edit-reset probe"
    And I reset the template form
    Then the Template Name field should show the template's saved name

  @S06 @p2
  Scenario: Back from the edit form leaves the saved template unchanged
    Given a disposable template exists
    And I am on the Templates list
    When I open the template for view
    And I open the template edit form
    And I set the template Name field to "E2E CCQ003 edit-back probe"
    And I go back from the template form
    Then the template modal should be closed
    And no update-template request should be sent
    And the stored template should still have its saved name
