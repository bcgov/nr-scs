# Chain: (none — APP-ONLY capability, no legacy Gherkin) › UC-INS-003 coverage.md "App-only capability
#         noticed" › THIS FILE
#
# The new app has a Site Inspection EDIT screen (/scale-sites/:id/inspections/edit/:inspectionId,
# PUT /api/scale-sites/inspection/{id}) that updates the header (Inspection Date / Inspector # / Site
# Operator present / General Comments) and every question response. NO legacy INS use case specifies it:
# UC-INS-003 was the only one that reached the legacy edit form, and it went there purely to capture a
# compliance/enforcement issue — which the new app never built. So this suite has no Gherkin to
# re-ground; it is grounded directly on the new app's write path and was flagged for authoring in
# uc-ins-003-compliance-enforcement/coverage.md ("Worth a dedicated 'Edit Inspection' suite").
#
# Fields the edit form legitimately does NOT expose (verified in ScaleSiteInspectionDetails/index.tsx):
# "Follow-up to Inspection #" and "Site Operator (if different from owner)" are `isCreate ? editable :
# readOnly`, so they are create-only. Their absence here is correct, not a coverage hole.
#
# Every scenario seeds its OWN inspection. It must never edit the shared real anchor 322429 that the
# security suites read — under fullyParallel that would corrupt another suite's fixture.

@ins @UC-INS-003 @edit @app-only
Feature: Edit Site Inspection (app-only)

  # The p0 round trip: load the real record, change the header AND every answer, add the follow-up
  # detail the Y-arm rule makes mandatory, save, and prove it PERSISTED via an API read-back keyed by
  # inspectionQuestionId (the question library has duplicate question texts, so text would be ambiguous).
  @S01 @p0
  Scenario: An inspection's header and answers are edited and persisted
    Given I have a recorded site inspection on scale site "520"
    When I open the site inspection edit form
    And I change the inspection header and answers
    And I save the inspection edit
    Then the site inspection view is shown for that inspection
    And the persisted inspection matches the edited values
