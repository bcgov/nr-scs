# UC-CHK-005 S05: the Return Type selection gates the SPG Product, Grade and Partial Load fields.
# New-app nuance (benign, not a divergence): for SFP the Product field enables only once a species is
# chosen, so every row selects a species first before asserting the gated state.
@chk @UC-CHK-005
Feature: Create Summary Check Scale — return-type field gating

  @S05 @p2
  Scenario Outline: S05 "<returnType>" gates Product, Grade and Partial Load
    Given I am on the Summary Check Scale create form
    When I select the "<returnType>" return type
    And I select species "FI"
    Then the "Partial Load" field should be "<partialLoad>"
    And the "Product" field should be "<product>"
    And the "Grade" field should be "<grade>"

    Examples:
      | returnType             | partialLoad | product  | grade    |
      | Special Forest Product | visible     | enabled  | disabled |
      | Log Tally              | hidden      | disabled | enabled  |
      | Sample Log Tally       | hidden      | disabled | enabled  |
