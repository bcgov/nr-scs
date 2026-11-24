# Chain: (none — APP-ONLY capability) › THIS FILE
#
# CLIENT-side validation on the edit form. The edit page runs its own `validateFormValues`
# (pages/Edit/ScaleSiteInspection/index.tsx:193-253) with the SAME rule set the create page enforces,
# so these are the edit arm of rules UC-INS-001 covers only for create. Each negative PROVES the write
# never left the browser: the inline error AND zero PUTs to /api/scale-sites/inspection/{id}.
#
# Message text is the app's actual wording, read off the source — not the legacy ERR-### text.
#
# Scenarios that break ONE field first make the rest of the form valid ("I make the inspection edit
# otherwise valid"), so the assertion isolates that field's rule rather than tripping over a second
# unrelated error and passing for the wrong reason.
#
# Re-grounding — the legacy ERR-008 mirror arm ("follow-up detail populated when NOT required") is not
# user-reachable: selecting Follow-Up Required = N CLEARS and DISABLES the three detail inputs. Rather
# than log that as an untested arm, the last scenario asserts the disabling itself, which is the app's
# actual enforcement of the rule.

@ins @UC-INS-003 @edit @app-only
Feature: Edit Site Inspection — validation (app-only)

  @S04 @p1
  Scenario: Saving with the required header fields cleared is blocked before any write
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I clear the required inspection header fields
    And I save the inspection edit
    Then I should see the error "Inspection Date is required."
    And I should see the error "Inspector # is required."
    And I should see the error "Site Operator present during Inspection is required."
    And no inspection update request should be sent
    And I remain on the inspection edit form

  @S05 @p1
  Scenario: A future inspection date is rejected before any write
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I make the inspection edit otherwise valid
    And I set the inspection edit date to a future date
    And I save the inspection edit
    Then I should see the error "Inspection Date cannot be in the future."
    And no inspection update request should be sent

  # The inspector must be an euser GUID (32 undashed hex, or a canonical dashed UUID). The client
  # pre-checks it with `isInspectorGuid` so a bad value never becomes a backend 400.
  @S06 @p1
  Scenario: A malformed inspector is rejected before any write
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I make the inspection edit otherwise valid
    And I enter a malformed inspector on the inspection edit form
    And I save the inspection edit
    Then I should see the error "Inspector must be a valid user GUID."
    And no inspection update request should be sent

  # The follow-up Y-arm cross-field rule: flagging Follow-Up Required = Y makes Action Required, Due
  # Date and Complete? mandatory. The backend enforces it too (InspectionValidator.validateFollowUpFields
  # → 400 "followUpActionText is required when followUpRequiredInd is Y for inspectionQuestionId N"),
  # but the client blocks first, which is what this asserts.
  @S07 @p1
  Scenario: Follow-up required without its details is rejected before any write
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I make the inspection edit otherwise valid
    And I flag follow-up required on the first edited question without its details
    And I save the inspection edit
    Then I should see the error "Action Required is required when follow-up is required."
    And I should see the error "Due Date is required when follow-up is required."
    And I should see the error "Complete? is required when follow-up is required."
    And no inspection update request should be sent

  # Each question row must keep an answer. Reachable on the edit form even though every row loads
  # pre-answered, because the Answer dropdown carries a blank "Select" option above the real options.
  @S10 @p1
  Scenario: Clearing a question's answer is rejected before any write
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I make the inspection edit otherwise valid
    And I clear the answer on the first edited question
    And I save the inspection edit
    Then I should see the error "Answer is required."
    And no inspection update request should be sent

  # The mirror arm of the rule above, as the app actually enforces it.
  @S07 @p2
  Scenario: Follow-up detail fields are disabled when follow-up is not required
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I clear follow-up required on the first edited question
    Then the follow-up detail fields for the first edited question are disabled
