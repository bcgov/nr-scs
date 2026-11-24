# Chain: UC-CCQ-002.md › -detailed.md › -slices.md › gherkin/UC-CCQ-002-S05/S06 › THIS FILE
#
# These are UC-CCQ-002's slices, authored in UC-CCQ-001's folder on purpose: CCQ-002 has no screen of its
# own in the new app — a question's valid responses are a multi-select on THIS form — so its S05 (reset
# the edit form) and S06 (navigate back without saving) act on Maintain Inspection Question. Its own
# coverage.md carries the full mapping; both files are tagged @UC-CCQ-002 so a source-tag search finds them.
#
# WHY BOTH DRIVE THE EDIT FORM. Reset and Back both come from the shared MaintenanceFormModal, but they
# are not offered in the same modes: Reset renders in create AND edit, Back ONLY in edit (the modal draws
# it when `onBack` is supplied and modalMode === 'edit'). A create-mode Back scenario would have no
# control to click, so the edit form is the one place both slices are reachable.
@ccq @UC-CCQ-001 @UC-CCQ-002
Feature: Maintain Inspection Question — Reset and Back

  @S05 @p2
  Scenario: Reset restores the edited question's saved values
    Given a disposable inspection question exists
    And I am on the Questions list
    When I open the question for view
    And I open the edit form
    And I set the question's "Sort Order" field to "987"
    And I reset the question form
    Then the question's "Sort Order" field should show its saved value

  # Back returns to the READ-ONLY VIEW, it does not close the modal (`useMaintenanceCrud.cancelEdit`
  # re-applies the loaded record and sets modalMode 'view') — consistent with every maintenance page
  # forwarding to the view rather than the list. Asserted three ways, because each alone is satisfiable
  # by a save that succeeded: the view redraws the loaded values, the PUT never left the browser
  # (spy = 0), and the stored row still matches the seed.
  @S06 @p2
  Scenario: Back from the edit form leaves the saved question unchanged
    Given a disposable inspection question exists
    And I am on the Questions list
    When I open the question for view
    And I open the edit form
    And I set the question's "Sort Order" field to "987"
    And I go back from the question form
    Then the question should be shown in the view
    And the view should show the question's values from before the edit
    And no update-question request should be sent
    And the stored question should still have its saved values

  # The create-mode arm, mirroring UC-CCQ-003 which covers Reset in both modes. Different expectation from
  # the edit-mode scenario above: create-mode Reset empties the form rather than restoring a record.
  @S05 @p2
  Scenario: Reset clears the create form
    Given I am on the Questions list
    When I open the create form
    And I enter a valid inspection question
    And I reset the question form
    Then the question form should be blank
    And no create-question request should be sent
