# Re-grounded from UC-RPT-009 S05 (invalid email format → ERR-001) + S06 (blank email when Preview=No →
# ERR-002), on the new app's MSD Letter Options screen (route /mark-site-designations/{id}/letter →
# pages/Letters/MarkSiteDesignationLetter → shared ReportPage). These are CLIENT-side validations that run
# in ReportPage.handleSend BEFORE the generate request, so each PROVES no letter request fired
# (letterMsdCalls === 0) in addition to the inline error. Re-groundings: legacy ERR-001
# "The Email Recipient is not in a valid format." → the new app's "Email Recipient must be a valid email
# address."; ERR-002 matches the legacy text verbatim. The screen is opened with a real letterless MSD id
# (richViewMsdId) only to render the options form; nothing is generated or persisted → read-only,
# parallel-safe, no cleanup.
#
# NOT AUTHORED HERE (see coverage.md): S01/S02 letter GENERATION. No longer environment-blocked — the Jasper
# blocker closed 2026-08-11 and the nine report screens are now covered end-to-end in
# features/rpt/*/generation.feature — but issuing a letter is a WRITE that persists one against the record and
# flips letterExists, so it needs a DISPOSABLE seeded MSD rather than this shared letterless anchor (defects.md
# Coverage gap #0). S07 (permission) remains blocked by single-role mock auth.
@rpt @UC-RPT-009
Feature: Generate MSD Letter — Letter Options Validation

  @S05 @p1 @ERR-001
  Scenario: An invalid email recipient is rejected client-side with no letter request sent
    Given I open the MSD letter options for the sample record
    When I set the letter email recipient to "not-an-email"
    And I click Send / View Report
    Then the letter options show the error "Email Recipient must be a valid email address."
    And no letter generate request should be sent

  @S06 @p1 @ERR-002
  Scenario: A blank email with Preview set to No is rejected client-side with no letter request sent
    Given I open the MSD letter options for the sample record
    When I set Preview Report to No
    And I click Send / View Report
    Then the letter options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no letter generate request should be sent
