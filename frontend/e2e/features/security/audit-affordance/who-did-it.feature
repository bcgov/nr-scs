# Spec: epics.md Epic SEC — SEC-5 (Who Did It / Audit Popup) › UC-SYS-005 › components/core/WhoDidIt
#       › THIS FILE
#
# THE AUDIT AFFORDANCE — a component on eleven screens, asserted once.
#
# Every per-UC ledger that met this component deferred it in the same words:
#   "This is a cross-cutting component shared by many screens; defer to a single dedicated
#    audit-affordance pass rather than re-litigating it per host screen."
#      — features/mark-site-designation/uc-msd-003-view/defects.md, Coverage gap #4
# This is that pass. It ran nowhere else because it is not any one screen's property.
#
# ── WHAT BELONGS HERE AND NOWHERE ELSE ─────────────────────────────────────────────────────────────
#
#   Who may see it?      The popup lists the IDIR user ids of everyone who has touched a record. The
#                        component withholds it from non-IDIR sessions — `user.idpProvider !== 'IDIR'`
#                        returns null before anything renders. That is a disclosure boundary, and it is
#                        decided by the IdP rather than by any permission, so no role suite can see it.
#   Whose values are they?  The five fields come from whatever the host handed the component. A host
#                        wired to an endpoint that carries no audit fields renders five blank rows and
#                        looks fine. Only a comparison against the record itself catches that.
#   What shape are they? Two of Epic SEC's acceptance criteria for this story carry
#                        [LEGACY-BEHAVIOR-FLAG]s, and the shipped component resolved BOTH away from the
#                        AC as written. See defects.md D1 and D2 — pinned here, deliberately.
#
# ── THE VARIABLE IS ISOLATED ───────────────────────────────────────────────────────────────────────
# The IDIR identity and the BCeID one below hold the SAME role (`SCS_SYS_ADMIN`). Permissions,
# navigation, route decisions and the records themselves are therefore identical, and the only thing
# that differs is the IdP. When the affordance appears for one and not the other, nothing else can
# explain it. A permission-shaped contrast could not make that claim.
#
# This is only drivable because `RoleSessionPage.signInAs` now takes a provider. Every role suite before
# this one seeds `BCEIDBUSINESS` — in which this component renders for nobody, on every screen. Worth
# knowing when reading those suites' record-view sweeps: they were looking at pages with no audit
# trigger on them.
@sec @SEC-5 @cross-cutting @audit
Feature: Cross-cutting — the Who Did It audit affordance

  # ---------------------------------------------------------------- the contract (UC-SYS-005-S01)

  @p0 @UC-SYS-005 @S01
  Scenario: An IDIR user opens the audit popup and sees all five fields
    Given I am signed in through IDIR
    When I open the "Scaler" record
    And I open the audit popup
    Then the audit popup should show all five audit fields

  # The fields are labelled correctly above; this asserts they are the RECORD's. Read back from the API
  # in the same scenario rather than pinned, because pinning would test the fixture: the Scale Site's
  # audit is live data (revision count in the twenties, updated this year), so a popup showing five
  # plausible strings that belong to no record would pass a pinned assertion and fail this one.
  @p0 @UC-SYS-005 @S01
  Scenario: The audit values are the record's own
    Given I am signed in through IDIR
    When I open the "Scale Site" record
    And I open the audit popup
    And I read the same record's audit fields from the API
    Then every audit field should match the record

  @p2 @UC-SYS-005 @S01
  Scenario: Close dismisses the audit popup
    Given I am signed in through IDIR
    When I open the "Scaler" record
    And I open the audit popup
    Then closing the popup should dismiss it

  # ---------------------------------------------------------------- the two legacy-behaviour flags
  #
  # defects.md D2. UC-SYS-005-S05 specifies timestamps truncated to their first 19 characters. The
  # component converts the instant to Pacific time instead. For the pinned record the two differ in the
  # HOUR — `1992-09-02 11:36:37` against `1992-09-02T18:36:37` — so this scenario cannot pass under the
  # AC as written, which is why it is here rather than in a note.

  @p1 @UC-SYS-005 @S05
  Scenario: A stored instant is rendered in Pacific time, not truncated
    Given I am signed in through IDIR
    When I open the "Scaler" record
    And I open the audit popup
    Then the created timestamp should be shown in Pacific time
    And the created user should be shown unchanged

  # defects.md D1's mirror. An ABSENT revision count renders blank (the AC says `0`); a REAL zero must
  # still render `0`. The component keeps them apart with `revisionCount != null`, and this is the half
  # a regression to a truthiness check would break — silently, because every "absent renders blank"
  # assertion would stay green.
  @p1 @UC-SYS-005 @S02
  Scenario: A revision count of zero is shown, not treated as absent
    Given I am signed in through IDIR
    When I open the "Scaler" record
    And I open the audit popup
    Then a zero revision count should still be shown as zero

  # ---------------------------------------------------------------- the disclosure boundary

  @p0 @UC-SYS-005 @S01
  Scenario: The same role through BCeID is offered no audit affordance
    Given I am signed in through BCeID with the same role
    When I open the "Scaler" record
    And I note whether the audit affordance is offered
    Then the audit affordance should not be offered

  # The contrast that makes the assertion above mean something: the same screen, the same record, the
  # same role — offered.
  @p0 @UC-SYS-005 @S01
  Scenario: The same screen offers the affordance to the same role through IDIR
    Given I am signed in through IDIR
    When I open the "Scaler" record
    And I note whether the audit affordance is offered
    Then the audit affordance should be offered

  # And the population this actually protects against: a real external role, on a record its own client
  # owns, so the refusal cannot be mistaken for a record it simply could not read.
  @p1 @UC-SYS-005 @S01
  Scenario: An external scale site owner is offered no audit affordance on its own site
    Given I am signed in as an external scale site owner
    When I open the "Scale Site" record
    And I note whether the audit affordance is offered
    Then the audit affordance should not be offered
