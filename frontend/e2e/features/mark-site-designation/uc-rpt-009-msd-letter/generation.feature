# Re-grounded from UC-RPT-009 S01 (generate the Timber Mark Site Designation letter) + S02 (a record that
# already has a letter serves the stored one), on the new app's MSD Letter Options screen
# (route /mark-site-designations/{id}/letter → pages/Letters/MarkSiteDesignationLetter → shared
# LetterOptionsPage). Generate = POST /api/mark-site-designations/{id}/letter → Jasper (SCS_REP011) → PDF.
#
# WHY THIS IS A SEPARATE FILE FROM validation.feature. Issuing a letter is a WRITE: it inserts a
# HAULING_MARK_AUTH_LETTER row and flips the record's letterExists false→true, permanently changing the MSD
# view's "Create Letter" button into "View Letter". So — unlike the read-only client-validation scenarios —
# every scenario here seeds its OWN disposable MSD (seedMarkSiteDesignation; its DB teardown deletes the
# letter child row with the parent) and its OWN signatory block (seedSignatureBlock, reused from UC-MNT-001,
# under reg/dist DCC so DCC's reg/dist-specific block list has a known block to pick — the picker is already
# non-empty from the initial full-list load, so the seed guarantees a block that BELONGS to DCC). NEVER the
# shared richViewMsdId anchor the validation scenarios read — doing that once broke three UC-MSD-003
# scenarios (defects.md CG #0).
#
# The Jasper blocker that once made this un-runnable closed 2026-08-11 (POST → 200 · application/pdf ·
# ~51KB, named <msdId>.pdf). Each scenario proves the negative-of-a-negative properly: a real PDF is
# asserted by its MAGIC BYTES + a size floor (a zero-byte / wrong-format file would still fire the browser
# download event), and S01 additionally reads letterExists back through the API to prove the WRITE persisted
# — not merely that a file came down.
@rpt @UC-RPT-009 @generation
Feature: Generate MSD Letter — generation

  # The p0 round trip: seed a letterless record, generate its letter through the options screen, prove a real
  # PDF downloaded AND that the record now carries a letter (letterExists flipped) via an API read-back.
  @S01 @p0
  Scenario: A letter is generated for a mark site designation and persisted
    Given I have a signatory block for the letter reg/dist
    And I have a disposable mark site designation
    When I open the letter options for that mark site designation
    And I choose the letter reg/dist that has a signatory block
    And I generate the letter and download it
    Then the downloaded letter is a real PDF for that record
    And one letter generate request should be sent
    And the mark site designation record has a letter on file

  # S02: once a letter exists, the MSD view offers "View Letter" (not "Create Letter") and streams the stored
  # PDF back via GET /{id}/letter. The letter is issued out-of-band (API) so this scenario isolates the
  # view-existing path rather than re-driving generation.
  @S02 @p1
  Scenario: A record that already has a letter serves it from the view
    Given I have a signatory block for the letter reg/dist
    And I have a disposable mark site designation
    And the mark site designation already has a generated letter
    When I open the mark site designation view for that letter record
    Then the record offers to view the existing letter
    When I download the existing letter
    Then the downloaded letter is a real PDF for that record
