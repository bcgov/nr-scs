# Re-grounded from UC-MSD-001 S01 (District Wide=Y happy path) + S02 (District Wide=N + ≥1 scale site).
# The create write path is data-blocked on the raw extract — a creatable mark must satisfy BOTH the
# mark-holder view (existence) AND HAULING_AUTHORITY membership (insert FK HMKA_HAA_FK), and no real
# mark does. Unblocked by scs-real-test-data-patches/msd/msd-create-mark.sql (makes mark ES20R4
# creatable + seeds region 1904 so scale site 520 is searchable). Verified live → HTTP 201. Success is
# PROVEN by a full API read-back of the persisted record (not the redirect); the app auto-attaches the
# mandatory MSD condition server-side. Each created record is removed at the DB on teardown (no DELETE
# endpoint). Values (ES20R4, site 520) are pinned in fixtures/msd/msd-test-data.ts.
#
# @mode:serial — these two creates run SEQUENTIALLY (not in parallel with each other). Concurrent MSD
# creates that attach the same auto-loaded mandatory conditions intermittently return HTTP 409 (see
# defects.md Bug #1 — an OBSERVED behaviour, not yet confirmed a defect: it may be an unsupported
# scenario, and the mechanism is unidentified). We serialise the FUNCTIONAL happy-path tests because the
# suite should not depend on undefined concurrent-create behaviour — this is correct regardless of how
# triage rules on the 409. The observation is logged (with a standalone API repro), not masked.
@msd @UC-MSD-001 @mode:serial
Feature: Create Mark Site Designation — Happy Path

  @S01 @p0
  Scenario: Create a district-wide mark site designation
    Given I am on the Mark Site Designation create form
    When I create a district-wide mark site designation
    Then the mark site designation is created
    And the created record reads back with timber mark "ES20R4" and district wide "Y"

  # Uses a per-worker scale site (parallelIndex → distinct site) because hauling_mark_site has a
  # (timber mark, scale site) UNIQUE key — concurrent creates on the same pair would collide.
  @S02 @p0
  Scenario: Create a mark site designation with a scale site
    Given I am on the Mark Site Designation create form
    When I create a mark site designation with a scale site
    Then the mark site designation is created
    And the created record reads back with timber mark "ES20R4" and district wide "N"
    And the created record includes its scale site
