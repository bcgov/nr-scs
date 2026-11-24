# Spec: epics.md Epic SEC — SEC-5 › UC-SYS-005 ("this popup is opened from many record views …
#       implement as a reusable component") › fixtures/security/audit-affordance-test-data.ts › THIS FILE
#
# THE SWEEP — is the affordance actually mounted where it is supposed to be?
#
# `who-did-it.feature` proves the component behaves. This proves it is THERE. Those are different
# failures with different causes: the component can be perfect and a host can drop it, and the story's
# own note for dev is what makes that a contract rather than a detail —
#
#   "Cross-cutting: this popup is opened from many record views (scaler, scale site, MSD,
#    authorization, etc.). Implement as a reusable component."   — epics.md, SEC-5 Notes for dev
#
# ── WHY ONE SCENARIO AND NOT FIVE ──────────────────────────────────────────────────────────────────
# The sweep visits every host and reports EVERY one that lost the affordance, in a single message that
# also names the API read each host feeds it from. A scenario per host would stop at the first red and
# tell a reviewer the least useful thing it knows — and the diagnosis is nearly always the named read,
# not the component: a host whose record fetch fails renders its screen without the affordance, which
# is a broken endpoint rather than a broken audit popup.
#
# ── THE ONE HOST THAT IS NOT SWEPT ─────────────────────────────────────────────────────────────────
# The Check Scale view. `GET /api/check-scales/145988` and `/145849` both answer 500 for EVERY role
# including an administrator in this environment (probed 2026-09-04), so the host screen cannot render
# and a row for it would be red for a reason that is not the affordance. coverage.md CG-1.
@sec @SEC-5 @cross-cutting @audit
Feature: Cross-cutting — the audit affordance is mounted on every host record view

  @p0 @UC-SYS-005 @S01
  Scenario: Every record view that hosts the audit affordance offers it to an IDIR user
    Given I am signed in through IDIR
    When I visit every record view that hosts the audit affordance
    Then every host record view should offer the audit affordance
