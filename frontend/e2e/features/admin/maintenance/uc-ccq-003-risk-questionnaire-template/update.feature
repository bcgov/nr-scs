# Chain: UC-CCQ-003.md › -detailed.md › -slices.md › gherkin/UC-CCQ-003-S02 › THIS FILE
#
# Re-grounded from UC-CCQ-003 S02 (open edit form → change Name → save → detail shows the update). Seeds
# its own template via the API, edits it through the UI, and proves the change via an API read-back by id.
# On save the app forwards to the read-only view (not back to the list). Self-cleaning, parallel-safe
# (each run owns a freshly-seeded record).
@ccq @UC-CCQ-003
Feature: Maintain Templates — Update

  @S02 @p0
  Scenario: Administrator edits an existing template
    Given a disposable template exists
    And I am on the Templates list
    When I open the template for view
    And I open the template edit form
    And I set the template Name field to "E2E CCQ003 edited name"
    And I save the template
    Then the template should be shown in the view
    And the saved template should match the submitted values

  # The conditions table renders and is toggleable in EDIT mode too (`TemplatesModal.tsx:444-460`), but
  # only create-with-binding was covered. Edit is the riskier half: a save that no-ops instead of writing
  # the join row, or that drops bindings it never touched, is invisible from the create path.
  @S01 @p1
  Scenario: Binding a condition on the edit form persists it
    Given a disposable template exists
    And I am on the Templates list
    When I open the template for view
    And I open the template edit form
    And I bind a condition to the template
    And I save the template
    Then the template should be shown in the view
    And the saved template should include the bound condition

  # The mirror arm. Anchored on "already bound" first — without that, an edit form that opened with the
  # box clear would make "untick then save" assert nothing at all.
  @S01 @p1
  Scenario: Unbinding a condition on the edit form removes it
    Given a disposable template with a bound condition exists
    And I am on the Templates list
    When I open the template for view
    And I open the template edit form
    Then the condition should already be bound on the form
    When I unbind the condition from the template
    And I save the template
    Then the template should be shown in the view
    And the saved template should not include the bound condition

  # Name was the only one of the three editable fields under test. Type is deliberately immutable after
  # creation (`tmpl-type` renders disabled when modalMode === 'edit'), so Reg / Dist is the remaining arm.
  @S02 @p2
  Scenario: Administrator changes a template's Reg / Dist
    Given a disposable template exists
    And I am on the Templates list
    When I open the template for view
    And I open the template edit form
    And I change the template "Reg / Dist" field to the alternate district
    And I save the template
    Then the template should be shown in the view
    And the saved template should have the alternate district
