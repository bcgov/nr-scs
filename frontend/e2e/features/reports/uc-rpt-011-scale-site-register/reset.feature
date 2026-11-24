# ── FIXED 2026-08-11 (was `reset-bug.feature`, @discovered-bug) ─────────────────────────────────────────
# Reset did not restore the form to the state it loaded in: the screen rendered with Primary sort =
# "Scale Site Number" but Reset set it to "Scale Site Name", so pressing Reset silently changed the report's
# sort order (payload `primarySort` 1 → 2) instead of clearing the user's edits. Two literals for one default
# in a single file:
#
#   pages/Reports/ScaleSiteRegister/index.tsx  (before)
#     useState('Scale Site Number')        ← initial render
#     onReset: setPrimarySort('Scale Site Name')
#
# THE FIX addresses the root cause rather than the symptom: the default is now a single
# `DEFAULT_PRIMARY_SORT` constant that BOTH the initial state and `onReset` read, so the two cannot drift
# apart again. The same hardening was applied to the other two sortable report screens (Scaler Register,
# Scaling Exception) — they happened to agree, but repeated their defaults in two places exactly as this one
# did, so they were one rename away from the same bug.
#
# WHY THE FIRST ASSERTION MATTERS. Checking Primary sort BEFORE any edits is what made this bug unambiguous
# rather than a guess about which of the two values was "right": the same control is asserted at load and
# after Reset, so the test states plainly that those two must agree — and when it was red it failed only on
# the second one.
# Read-only, parallel-safe, no cleanup.
@rpt @UC-RPT-011
Feature: Generate Scale Site Register Report — Reset Restores Defaults

  @p2
  Scenario: Reset returns every parameter to the value the form loaded with
    Given I open the "Scale Site Register" report
    Then the report parameter "primary-sort" has the value "Scale Site Number"
    When I select the report Reg / Dist "DCC"
    And I choose the report parameter "authorization-status" option "Valid"
    And I type "520" into the report parameter "site-number"
    And I set the report primary sort to "Client Name"
    And I set the report file format to "MS Excel"
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I reset the report parameters
    Then the report parameter "reg-dist" has the value ""
    And the report parameter "authorization-status" has the value "ALL"
    And the report parameter "site-number" has the value ""
    And the report parameter "file-format" has the value "PDF"
    And the report parameter "email-recipient" has the value ""
    And the report parameter "primary-sort" has the value "Scale Site Number"
    And no report request should be sent

  # The payload half of the same fix: a reset form must request the DEFAULT ordering (primarySort 1), which is
  # what the bug actually corrupted — the dropdown text was only the visible symptom.
  #
  # Reg / Dist is re-selected AFTER the reset so the assertion stays honest about WHAT is being checked: the
  # sort default, which the org unit does not affect. (It used to be a cost measure too — for a while every
  # submit really rendered server-side, making an unfiltered submit a >120s province-wide render holding one
  # of three permits. That no longer applies: report POSTs are STUBBED by default and only `@generation`
  # scenarios reach the engine — see `steps/fixtures/rpt.ts`. Kept because district-filtering a submit is
  # still the right habit in this suite.)
  @p2
  Scenario: A report submitted after Reset requests the default sort order
    Given I open the "Scale Site Register" report
    When I set the report primary sort to "Client Name"
    And I reset the report parameters
    And I select the report Reg / Dist "DCC"
    And I submit the report
    Then one report request should be sent
    And the report request payload includes:
      | field         | value |
      | primarySort   | 1     |
      | secondarySort | 0     |
