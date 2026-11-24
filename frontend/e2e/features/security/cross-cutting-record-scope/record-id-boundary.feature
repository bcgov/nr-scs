# Spec: the roles & permissions matrix §1 "(ltd)" legend + §4 per-role prose
#       › ClientScopeInterceptor (path-keyed) + ClientScopeGuard (hand-called) › THIS FILE
#
# THE SEAM, not a role and not a screen.
#
# Client scoping is enforced two ways, and only one of them is automatic:
#
#   ClientScopeInterceptor keys on two path variables — `scalerLicenceNo` and `scaleSiteIdNmbr` — so it
#   covers every endpoint addressed that way, including every one added later. Nothing to forget.
#
#   Every endpoint addressed by SOME OTHER id escapes it, and is covered only where its service calls
#   ClientScopeGuard by hand. Exactly four do: the scaler-authorization detail read, the scale-site-
#   authorization detail read, and the inspection reads and writes.
#
# Those four are what this file pins. They are hand-written guards on endpoints whose URL shape gives no
# hint that a guard is required, which makes them the likeliest thing in the scoping layer to be dropped
# by a refactor or omitted from a fifth endpoint — and the role suites cannot catch it, because each one
# tests a role's column, and this is a property of the endpoint.
#
# Every row is PAIRED: one record the caller's client is entitled to, one it is not. A refusal on its own
# would also pass against a broken endpoint, which is exactly the failure this file must not report as
# security.
#
# Anchors and their provenance: fixtures/security/cross-cutting-test-data.ts.
@sec @SEC-11 @cross-cutting @record-scope
Feature: Cross-cutting — the record-id client-scope boundary

  # ---------------------------------------------------------------- scaler authorizations (IND)
  #
  # Path variable `scalerAuthorizationId`. The interceptor does not know it; the guard is called from
  # ScalerAuthorizationService:157 via assertRecordScalerInScope, which resolves the authorization's own
  # scaler and then that scaler's forest client.

  @p0
  Scenario: A scaler authorization belonging to my own client is served
    When I request "/api/scaler-authorizations/147851" as a client-restricted industry scaler
    Then the API should allow it

  @p0
  Scenario: A scaler authorization belonging to another client is refused
    When I request "/api/scaler-authorizations/143648" as a client-restricted industry scaler
    Then the API should refuse it as out of my client scope

  # The pairing that proves the refusal above is the guard and not a dead record.
  @p1
  Scenario: The refused scaler authorization is readable by an unrestricted administrator
    When I request "/api/scaler-authorizations/143648" as an unrestricted administrator
    Then the same call should succeed for a system administrator

  # ---------------------------------------------------------------- scale-site authorizations (OWN)
  #
  # Path variable `scaleSiteAuthorizationId`; guard at ScaleSiteAuthorizationService:159 via
  # assertRecordSiteInScope, resolving the authorization's site and then the site's owner client.

  @p0
  Scenario: A scale-site authorization on a site I own is served
    When I request "/api/scale-site-authorizations/239313" as a client-restricted scale site owner
    Then the API should allow it

  @p0
  Scenario: A scale-site authorization on another client's site is refused
    When I request "/api/scale-site-authorizations/237889" as a client-restricted scale site owner
    Then the API should refuse it as out of my client scope

  @p1
  Scenario: The refused scale-site authorization is readable by an unrestricted administrator
    When I request "/api/scale-site-authorizations/237889" as an unrestricted administrator
    Then the same call should succeed for a system administrator

  # ---------------------------------------------------------------- site inspections (OWN)
  #
  # Path `/scale-sites/inspection/{inspectionId}` — note the site segment is a literal, not a variable,
  # so the interceptor sees no `scaleSiteIdNmbr` and does nothing. Guard at ScaleSiteInspectionService:105.

  @p0
  Scenario: An inspection on a site I own is served
    When I request "/api/scale-sites/inspection/400091" as a client-restricted scale site owner
    Then the API should allow it

  @p0
  Scenario: An inspection on another client's site is refused
    When I request "/api/scale-sites/inspection/400043" as a client-restricted scale site owner
    Then the API should refuse it as out of my client scope

  @p1
  Scenario: The refused inspection is readable by an unrestricted administrator
    When I request "/api/scale-sites/inspection/400043" as an unrestricted administrator
    Then the same call should succeed for a system administrator

  # ---------------------------------------------------------------- the record with no client axis
  #
  # A Mark / Site Designation is readable by the Industry Scaler (MSD_READ) and is NOT client-scoped.
  # That is not an unguarded endpoint — HAULING_MARK_AUTHORIZATION has no client column to guard by; it
  # is keyed on TIMBER_MARK + ORG_UNIT_NO. §F is the one section where the IND column reads plain `R`
  # rather than `R (ltd)`, which agrees.
  #
  # So this scenario asserts today's behaviour deliberately; its scoping axis is the org unit (coverage.md
  # CG-1). If it fails, re-derive it rather than widening it.

  @p1
  Scenario: A designation outside my client is readable, because designations carry no client
    When I request "/api/mark-site-designations/1101" as a client-restricted industry scaler
    Then the API should allow it

  # ---------------------------------------------------------------- the seam, now closed
  #
  # THIS PAIR USED TO DOCUMENT A GAP AND NOW PROVES IT SHUT. `RolePermissions` withheld risk assessment
  # from both external roles because the assessment reads are keyed on `riskQuestionnaireId` and nothing
  # client-scoped them: the interceptor keys on `scalerLicenceNo` / `scaleSiteIdNmbr`, which that path
  # does not carry. One client-restricted caller, one underlying scale site (`614`, owned by
  # `00055821`), two routes — and the second used to be served where the first was refused.
  #
  # On 2026-09-02 the client granted both external roles read-with-limitations on the record each lives
  # on, which made closing the seam a precondition rather than an option.
  # `ScaleSiteRiskAssessmentService.getScaleSiteRiskAssessment` now resolves the assessment's owning site
  # and calls `ClientScopeGuard.assertRecordSiteInScope` BEFORE its own not-found check, so both routes
  # answer the same way; `ScalerRiskAssessmentService` does the same on the scaler side, and both are
  # listed in `ClientScopeInterceptorTest.GUARDED_IN_SERVICE`, which fails the build if either guard is
  # removed. See defects.md V1 — this is the failure that file said to expect.
  #
  # The caller is an ADMINISTRATOR carrying a client header, so a refusal here cannot be a permission
  # decision: it can only be the guard.

  @p1
  Scenario: The site behind the assessment is refused when addressed by its site id
    When I request "/api/scale-sites/614/tombstone" as an administrator restricted to the owner's client
    Then the API should refuse it as out of my client scope

  @p1
  Scenario: The same site's risk assessment is refused when addressed by questionnaire id
    When I request "/api/scale-site-risk-assessments/1822" as an administrator restricted to the owner's client
    Then the API should refuse it as out of my client scope
