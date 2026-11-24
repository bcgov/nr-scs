# Chain: UC-CCQ-003.md › -detailed.md › -slices.md › gherkin/UC-CCQ-003-S01/S08/S09 › THIS FILE
#
# Re-grounded onto the BUILT React "Maintain Templates" page (Scale Authorization Templates,
# /maintenance/templates). UC-CCQ-003 maintains a template = a Name + a Type (scaleConditionClassCode) +
# a Reg/Dist, with bound conditions — NOT a risk questionnaire (the doc title is a misnomer; the gherkin
# and app agree it is scale-auth templates). See coverage.md.
#
# Key re-grounding vs the legacy gherkin:
#  - S08 legacy showed per-field "… is required." errors AFTER submit. The new app has NO post-submit
#    field errors (formErrors is never populated); it GATES required fields by DISABLING Save until Name +
#    Type + Reg/Dist are all set. So S08 re-grounds to "Save is disabled while a required field is blank"
#    (+ zero POST). Type & Reg/Dist are <Select>s, so legacy ERR-005/ERR-006 (bad Type/OrgUnit) are
#    unreachable in the new UI.
#  - S09 legacy limit is 200 chars. The new app enforces 100 via @Size and rejects with a clean HTTP 400
#    (no 500). The scenario asserts the app's real behaviour (over-length rejected + not persisted); the
#    100-vs-200 discrepancy is logged as defects.md Divergence #1.
@ccq @UC-CCQ-003
Feature: Maintain Templates — Create

  @S01 @p0
  Scenario: Administrator creates a new template
    Given I am on the Templates list
    And I open the template create form
    When I enter a valid template
    And I save the template
    Then the created template is registered for cleanup
    And the template should be shown in the view
    And the saved template should match the submitted values
    And the saved template should have no bound conditions

  @S01 @p1
  Scenario: Administrator creates a template and binds a condition
    Given I am on the Templates list
    And I open the template create form
    When I enter a valid template of type "MSD"
    And I bind a condition to the template
    And I save the template
    Then the created template is registered for cleanup
    And the template should be shown in the view
    And the saved template should include the bound condition

  @S08 @p1
  Scenario Outline: Save is blocked when "<field>" is missing
    Given I am on the Templates list
    And I open the template create form
    When I enter a valid template
    And I clear the template "<field>" field
    Then the template Save button should be disabled
    And no create-template request should be sent

    Examples:
      | field         |
      | Template Name |
      | Type          |
      | Reg / Dist    |

  @S09 @p1
  Scenario: Save is rejected when the Template Name exceeds the maximum length
    Given I am on the Templates list
    And I open the template create form
    When I enter a valid template
    And I enter a template name of 101 characters
    And I save the template
    Then a template save error should be shown
    And the template create form should still be shown
    And no template matching the entered name should exist
