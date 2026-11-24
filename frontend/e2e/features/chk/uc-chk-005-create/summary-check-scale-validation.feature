# UC-CHK-005 S02 (required fields) + S03 (numeric format). The new app validates the SPG row
# CLIENT-SIDE (summaryCheckScaleViewModel.validateSpgRow), so every scenario here also asserts that
# NO create request was sent — proving the block is client-side, not a silent server round-trip.
@chk @UC-CHK-005
Feature: Create Summary Check Scale — SPG validation

  @S02 @p1
  Scenario: S02 A blank species is blocked client-side
    Given I am on the Summary Check Scale create form
    When I enter a valid Summary Check Scale header
    And I enter a valid SPG row
    And I clear the species
    And I save the record
    Then the error banner should be visible
    And I should see the error "Species is required."
    And I should remain on the create form
    And no create request should be sent

  @S02 @p1
  Scenario: S02 Blank SPG numeric fields show per-field required errors
    Given I am on the Summary Check Scale create form
    When I enter a valid Summary Check Scale header
    And I enter a valid SPG row
    And I clear all SPG numeric fields
    And I save the record
    Then the error banner should be visible
    And I should see the error "Original Pieces is required."
    And I should see the error "Original Net Volume is required."
    And I should see the error "Original Net Value is required."
    And I should see the error "Check Scale Pieces is required."
    And I should see the error "Check Scale Net Volume is required."
    And I should see the error "Check Scale Net Value is required."
    And I should remain on the create form
    And no create request should be sent

  # Full six-field numeric matrix. Sources: ERR-011/012/014 are the three scenarios named in
  # UC-CHK-005-S03.feature; ERR-015 (Check Scale Net Volume) is in the slice matrix
  # (UC-CHK-005-slices.md:190-202) but was dropped from that .feature — see defects.md "Spec gaps";
  # ERR-013/016 (the Net Value fields) are in UC-CHK-005-technical.md:101-104. A non-numeric token
  # trips the integer rule (pieces) and the number rule (volume/value) alike.
  @S03 @p1
  Scenario Outline: S03 A non-numeric "<field>" is blocked client-side
    Given I am on the Summary Check Scale create form
    When I enter a valid Summary Check Scale header
    And I enter a valid SPG row
    And I set the "<field>" field to "XY"
    And I save the record
    Then I should see the error "<message>"
    And I should remain on the create form
    And no create request should be sent

    Examples:
      | field                  | message                                  |
      | Original Pieces        | Original Pieces must be an integer.      |
      | Original Net Volume    | Original Net Volume must be a number.    |
      | Check Scale Pieces     | Check Scale Pieces must be an integer.   |
      | Check Scale Net Volume | Check Scale Net Volume must be a number. |
      | Original Net Value     | Original Net Value must be a number.     |
      | Check Scale Net Value  | Check Scale Net Value must be a number.  |
