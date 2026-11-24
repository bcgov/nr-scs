# Re-grounded from UC-PRF-002 S05–S10. Same validator as create, so the same client-side messages apply. The
# five client-blocked arms prove the negative two ways: NO update PUT leaves the browser (spy count 0) AND an
# id-scoped read-back shows the seeded remark's Description unchanged. The legacy "both selected" (S07) is
# structurally impossible (single Issue-Type Select). The check-scale not-exist arm (S10) is a SERVER-side
# rejection — the PUT IS sent — so it gets its own scenario asserting the persisted remark is untouched at the
# field it actually mutated (checkScaleId still null), not just the Description this row never edits.
@prf @UC-PRF-002
Feature: Update Scaler Performance Remark — validation

  Background:
    Given a performance remark exists for the anchor scaler
    And I open that remark's edit form from the list

  @p1 @S05 @S06 @S08 @S09
  Scenario Outline: Editing to an invalid value is blocked client-side — <case>
    When I <mutation>
    And I click Save Record
    Then I should see the error "<message>"
    And I should remain on the performance remark form
    And no performance-remark update request should be sent
    And the remark should still have its original Description

    Examples:
      | case                          | mutation                                             | message                                                             |
      | description blank (S05)       | clear the Description                                | Description is required.                                            |
      | date future (S06)             | enter a future Date of Incident                      | Date of Incident cannot be in the future.                           |
      | action code missing (S08)     | select Issue Type "Action" but leave the code blank  | Action is required.                                                 |
      | outcome code missing (S08)    | select Issue Type "Outcome" but leave the code blank | Outcome is required.                                                |
      | suspension order (S09)        | enter a reversed suspension period                   | Suspension start date must be on or before the suspension end date. |

  # S10 server arm: a well-formed but non-existent check-scale id passes client validation, so the PUT leaves
  # the browser and the backend rejects it (400). The remark must be untouched — checkScaleId stays null (it
  # was never linked) and the Description is unchanged.
  @p1 @S10
  Scenario: Linking a non-existent check scale is rejected server-side, leaving the remark unchanged
    When I link a non-existent check scale
    And I click Save Record
    Then I should see the error "A check scale could not be found for 1146996."
    And I should remain on the performance remark form
    And the update request should be rejected leaving the remark unchanged
