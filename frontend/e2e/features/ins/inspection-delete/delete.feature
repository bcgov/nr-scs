# Chain: (none — APP-ONLY capability) › UC-INS-002 -slices.md S04 control matrix ("Delete", listed as a
#         permission-gated control with no slice driving it) › THIS FILE
#
# The new app implements inspection delete on the read-only view as a TWO-STEP gesture: a danger Button
# that only OPENS a Carbon confirm modal ("Are you sure you want to delete this record?"), whose primary
# action ("Confirm Delete") issues DELETE /api/scale-sites/inspection/{id}. Ground-truthed by hand on
# 2026-09-09: 204 on success, 404 on a re-read and on a second delete.
#
# No legacy INS use case drives a delete — UC-INS-002's S04 control matrix names the control but never
# exercises it, so this suite is grounded on the new app's own path.
#
# Why the two steps stay separate rather than one "I delete the inspection": clicking the danger button
# alone must NOT remove anything, and that is asserted explicitly below. It is the exact trap the
# role-probe suites hit — a scenario that clicks the button and then declares success proves nothing
# about whether the delete is actually reachable, and would keep passing if the button ever began
# deleting directly, skipping its own confirmation.
#
# Whether the Delete control is VISIBLE to a given role is not this suite's job — the eleven-role
# permission gating (PermissionGate SCALE_SITE_INSPECTION_DELETE) is covered in features/security/,
# including the check-scaler suite's "Deleting a site inspection is refused and the record survives".
#
# Every scenario seeds its own disposable inspection; the shared real anchor 322429 is never deleted.

@ins @UC-INS-002 @delete @app-only
Feature: Delete Site Inspection (app-only)

  @S01 @p0
  Scenario: A confirmed delete removes the inspection and returns to the site's inspections tab
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection view
    And I click Delete on the inspection view
    Then the delete confirmation prompt is shown
    When I confirm the inspection deletion
    Then the scale site inspections tab is shown
    And that inspection is no longer listed
    And the inspection no longer exists

  @S02 @p1
  Scenario: Cancelling the confirmation keeps the inspection
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection view
    And I click Delete on the inspection view
    Then the delete confirmation prompt is shown
    When I cancel the inspection deletion
    Then the delete confirmation prompt is closed
    And no inspection delete request should be sent
    And the inspection still exists

  # The danger button is a prompt-opener, not a deleter. Asserted on its own so a regression that wired
  # it straight to the endpoint fails here loudly instead of hiding behind the happy path.
  @S02 @p1
  Scenario: Opening the confirmation prompt does not by itself delete the inspection
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection view
    And I click Delete on the inspection view
    Then the delete confirmation prompt is shown
    And no inspection delete request should be sent
    And the inspection still exists
