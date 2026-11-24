# Re-grounded from UC-MSD-001 S03 (Timber Mark Not Found). Source: UC-MSD-001-slices.md (S03) /
# -technical.md (ERR-002). Legacy ERR-002 "A Timber Mark could not be found for {0}." re-grounds to the
# new app's ACTUAL message "No mark holder found for timber mark {mark}" (HTTP 404) — surfaced by BOTH
# the timber-mark lookup (Update button → GET) and the create POST (Save Record). Ground-truthed
# 2026-07-20 against the live backend (lookup + create both 404 with that text). The mark 'ZZZQ999' is
# a provably-absent sentinel pinned in fixtures/msd/msd-test-data.ts (absentTimberMark).
@msd @UC-MSD-001
Feature: Create Mark Site Designation — Timber Mark Not Found

  # FIXED 2026-08-04 (was UC-MSD-001 Divergence #1, formerly @discovered-divergence). The timber-mark
  # "Update" lookup computes the not-found error (index.tsx lookupTimberMarkHolder → setFormError); the
  # error banner previously rendered only under `submitAttempted`, hiding it until a save was attempted.
  # The banner gate was changed to `formError || (submitAttempted && fieldErrors>0)` so a real backend
  # formError (the lookup 404, a create error) surfaces immediately while field-level validation stays
  # submit-gated. This scenario now asserts the corrected behaviour (lookup not-found visible after Update).
  @S03 @p1 @ERR-002
  Scenario: The timber-mark lookup reports an unknown mark
    Given I am on the Mark Site Designation create form
    When I look up timber mark "ZZZQ999"
    Then I should see the error "No mark holder found for timber mark ZZZQ999"
    And no mark site designation should be created

  # Server-side rejection: valid basics + a nonexistent mark reach Save; the create POST fires and the
  # backend rejects it 404. PROVE nothing persisted by reading the search back (record absent) — not by
  # a missing redirect. (District Wide = Yes, so no scale site is required to reach Save.)
  @S03 @p1 @ERR-002
  Scenario: Saving with an unknown timber mark is rejected by the server and persists nothing
    Given I am on the Mark Site Designation create form
    When I fill valid mark site basics
    And I click Add Conditions
    And I click Save Record
    Then I should see the error "No mark holder found for timber mark ZZZQ999"
    And I should remain on the mark site designation create form
    And no mark site designation exists for timber mark "ZZZQ999"
