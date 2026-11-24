package ca.bc.gov.nrs.scs.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@DisplayName("RolePermissions — the role → permission matrix")
class RolePermissionsTest {

  /** Authorities for roles held by a client-scoped user (a client number is present). */
  private static List<String> authorityNames(Set<String> roles) {
    return authorityNames(roles, Set.of("00001074"));
  }

  private static List<String> authorityNames(Set<String> roles, Set<String> clientNumbers) {
    return RolePermissions.expandAuthorities(
            roles.stream().map(SimpleGrantedAuthority::new).collect(Collectors.toList()),
            clientNumbers)
        .stream()
        .map(GrantedAuthority::getAuthority)
        .toList();
  }

  @Nested
  @DisplayName("vocabulary invariants")
  class Vocabulary {

    /**
     * Permission and role authorities share one namespace, so a permission that started with
     * {@code SCS_} could be mistaken for a role (or vice versa) by a {@code hasAuthority} check.
     */
    @Test
    @DisplayName("no permission name collides with, or looks like, a role name")
    void permissionsAndRolesAreDisjoint() {
      for (String permission : Permissions.ALL_PERMISSIONS) {
        assertFalse(permission.startsWith("SCS_"),
            () -> "Permission '" + permission + "' must not start with SCS_ — that prefix is "
                + "reserved for role authorities.");
        assertFalse(Roles.ALL_ROLES.contains(permission),
            () -> "Permission '" + permission + "' collides with a role name.");
      }
    }

    /**
     * A constant missing from {@code ALL_PERMISSIONS} would pass {@code @RequiresPermission} at
     * compile time but be rejected by the convention test, or worse be granted to a role and never
     * validated. Reflection keeps the set honest as constants are added.
     */
    @Test
    @DisplayName("ALL_PERMISSIONS contains every declared permission constant")
    void allPermissionsIsComplete() throws Exception {
      List<String> missing = new ArrayList<>();
      for (Field field : Permissions.class.getDeclaredFields()) {
        if (!Modifier.isStatic(field.getModifiers()) || field.getType() != String.class) {
          continue;
        }
        String value = (String) field.get(null);
        if (!Permissions.ALL_PERMISSIONS.contains(value)) {
          missing.add(field.getName());
        }
      }
      assertTrue(missing.isEmpty(),
          () -> "Permission constants missing from ALL_PERMISSIONS: " + missing);
    }

    /** Every role the token parser can recognise must have a column, or it would grant nothing. */
    @Test
    @DisplayName("every role in Roles.ALL_ROLES has a permission column")
    void everyRoleHasAColumn() {
      List<String> empty = Roles.ALL_ROLES.stream()
          .filter(role -> RolePermissions.forRole(role).isEmpty())
          .toList();
      assertTrue(empty.isEmpty(), () -> "Roles with no permissions at all: " + empty);
    }

    @Test
    @DisplayName("every granted permission is a known permission name")
    void grantedPermissionsAreKnown() {
      for (String role : Roles.ALL_ROLES) {
        for (String permission : RolePermissions.forRole(role)) {
          assertTrue(Permissions.ALL_PERMISSIONS.contains(permission),
              () -> role + " grants unknown permission '" + permission + "'");
        }
      }
    }

    /** Every role can reach the welcome page — matrix §3 row "SCS Home Page" is R for all eleven. */
    @Test
    @DisplayName("every role holds WELCOME_READ")
    void everyRoleCanSeeWelcome() {
      for (String role : Roles.ALL_ROLES) {
        assertTrue(RolePermissions.forRole(role).contains(Permissions.WELCOME_READ),
            () -> role + " cannot reach the welcome page");
      }
    }
  }

  @Nested
  @DisplayName("system administrator")
  class SystemAdministrator {

    @Test
    @DisplayName("holds every permission (matrix §4: full CRUD across the application)")
    void holdsEverything() {
      assertEquals(Permissions.ALL_PERMISSIONS, RolePermissions.forRole(Roles.SCS_SYS_ADMIN));
    }
  }

  @Nested
  @DisplayName("industry scaler")
  class IndustryScaler {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_INDUSTRY_SCALER);

    @Test
    @DisplayName("holds exactly the read permissions from matrix column IND")
    void holdsTheMatrixReads() {
      assertEquals(Set.of(
          Permissions.WELCOME_READ,
          Permissions.LOV_READ,
          Permissions.CLIENT_QUERY,
          Permissions.SCALER_QUERY,
          Permissions.SCALER_READ,
          Permissions.SCALER_ADDRESS_READ,
          Permissions.SCALER_AUTHORIZATION_QUERY,
          Permissions.SCALER_AUTHORIZATION_READ,
          Permissions.SCALER_CHECK_SCALE_QUERY,
          Permissions.SCALER_EXAM_QUERY,
          Permissions.SCALER_APPOINTMENT_QUERY,
          Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
          Permissions.SCALE_SITE_READ,
          Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
          Permissions.SCALE_SITE_SOFTWARE_QUERY,
          Permissions.SCALER_RISK_RATING_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_READ,
          Permissions.MSD_QUERY,
          Permissions.MSD_READ), granted);
    }

    /**
     * The role is read-only: every cell in matrix column {@code IND} is {@code R}.
     *
     * <p>Asserted as an <b>allowlist</b> — every granted permission must end in {@code _READ} or
     * {@code _QUERY} — rather than by listing mutating suffixes to exclude. A denylist only catches
     * the verbs it happens to name, and would have missed {@link Permissions#SCALER_LICENCE_CANCEL}
     * when that permission was introduced. This way any new verb is caught by default.
     */
    @Test
    @DisplayName("holds nothing but read and query permissions")
    void isStrictlyReadOnly() {
      List<String> mutating = granted.stream()
          .filter(permission -> !permission.endsWith("_READ") && !permission.endsWith("_QUERY"))
          .toList();
      assertTrue(mutating.isEmpty(),
          () -> "Industry Scaler is read-only per matrix column IND (every cell is R), but holds "
              + "these non-read permissions: " + mutating);
    }

    /**
     * The column's recurring shape, and the one most likely to be "fixed" by someone adding the missing
     * query back: this role opens records it is entitled to and searches no register it is not.
     * {@link Permissions#SCALE_SITE_READ} without {@link Permissions#SCALE_SITE_QUERY} was the first
     * instance; {@link Permissions#SCALER_RISK_ASSESSMENT_READ} without
     * {@link Permissions#SCALER_RISK_ASSESSMENT_QUERY} is the second, added 2026-09-03 — the Risk Rating
     * tab lists the record's own assessments and links each one, so the standalone search screen reaches
     * nothing the record does not. {@link ScaleSiteOwner#readsAssessmentsFromTheRecordOnly()} pins the
     * same risk shape on the other external column. Pinned in both directions so neither half drifts
     * alone.
     */
    @Test
    @DisplayName("opens records without searching the registers they belong to")
    void readsRecordsWithoutTheirRegisters() {
      assertTrue(granted.contains(Permissions.SCALE_SITE_READ));
      assertFalse(granted.contains(Permissions.SCALE_SITE_QUERY));

      assertTrue(granted.contains(Permissions.SCALER_RISK_ASSESSMENT_READ),
          () -> "reached from the scaler record's Risk Rating tab");
      assertTrue(granted.contains(Permissions.SCALER_RISK_RATING_QUERY),
          () -> "the tab itself");
      assertFalse(granted.contains(Permissions.SCALER_RISK_ASSESSMENT_QUERY),
          () -> "the standalone Scaler Risk Assessments search screen is withheld");
    }

    /**
     * The screens denied outright by the matrix. {@code SCALE_SITE_QUERY} is the deliberate line
     * between "may read a site record they are authorized at" (granted) and "may search the site
     * register" (denied) — see {@code RolePermissions.industryScaler()}.
     */
    @Test
    @DisplayName("is denied scale-site search, work bench, reports, inspections and site risk")
    void isDeniedOutOfScopeAreas() {
      for (String denied : List.of(
          Permissions.SCALE_SITE_QUERY,
          Permissions.SCALE_SITE_SUMMARY_READ,
          Permissions.SCALE_SITE_ACTIVITY_READ,
          Permissions.SCALE_SITE_CONTACT_QUERY,
          Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
          Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
          Permissions.SCALE_SITE_MSD_QUERY,
          Permissions.SCALE_SITE_INSPECTION_QUERY,
          // Risk assessment: the client's 2026-09-02 spec gives this column the SCALER subject only —
          // the record it lives on. The site subject belongs to the Scale Site Owner
          Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
          Permissions.SCALE_SITE_RISK_RATING_QUERY,
          // And the SEARCH screen even on its own subject — withheld 2026-09-03, because the Risk
          // Rating tab already lists and links the record's assessments. See industryScaler()
          Permissions.SCALER_RISK_ASSESSMENT_QUERY,
          // Read only: it holds no risk-assessment create or update
          Permissions.SCALER_RISK_ASSESSMENT_CREATE,
          Permissions.SCALER_RISK_ASSESSMENT_UPDATE,
          Permissions.CHECK_SCALE_QUERY,
          Permissions.WORKBENCH_QUERY,
          Permissions.REPORT_READ,
          Permissions.MAINTAIN_QUESTIONS_QUERY,
          Permissions.MAINTAIN_SYSTEM_READ,
          Permissions.SCALER_UPDATE,
          // Legacy "suspend licence / recommend cancellation" — a manager capability, surfaced on the
          // Performance Remarks tab that this role *can* read, so worth pinning explicitly.
          Permissions.SCALER_LICENCE_CANCEL,
          Permissions.SYSTEM_ADMIN)) {
        assertFalse(granted.contains(denied),
            () -> "Industry Scaler must not hold " + denied);
      }
    }
  }

  @Nested
  @DisplayName("scale site owner")
  class ScaleSiteOwner {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_OWNER);

    @Test
    @DisplayName("holds exactly the read permissions from matrix column OWN")
    void holdsTheMatrixReads() {
      assertEquals(Set.of(
          Permissions.WELCOME_READ,
          Permissions.LOV_READ,
          Permissions.CLIENT_QUERY,
          Permissions.SCALER_QUERY,
          Permissions.SCALER_READ,
          Permissions.SCALER_ADDRESS_READ,
          Permissions.SCALER_EXAM_QUERY,
          Permissions.SCALE_SITE_QUERY,
          Permissions.SCALE_SITE_READ,
          Permissions.SCALE_SITE_SUMMARY_READ,
          Permissions.SCALE_SITE_CONTACT_QUERY,
          Permissions.SCALE_SITE_CONTACT_READ,
          Permissions.SCALE_SITE_ACTIVITY_READ,
          Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
          Permissions.SCALE_SITE_AUTHORIZATION_READ,
          Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
          Permissions.SCALE_SITE_MSD_QUERY,
          Permissions.SCALE_SITE_INSPECTION_QUERY,
          Permissions.SCALE_SITE_INSPECTION_READ,
          Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
          Permissions.SCALE_SITE_SOFTWARE_QUERY,
          Permissions.SCALE_SITE_RISK_RATING_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_READ), granted);
    }

    /**
     * Every cell in matrix column {@code OWN} is {@code R}. Asserted as an allowlist for the same
     * reason as the Industry Scaler's: a denylist only catches the verbs it happens to name.
     */
    @Test
    @DisplayName("holds nothing but read and query permissions")
    void isStrictlyReadOnly() {
      List<String> mutating = granted.stream()
          .filter(permission -> !permission.endsWith("_READ") && !permission.endsWith("_QUERY"))
          .toList();
      assertTrue(mutating.isEmpty(),
          () -> "Scale Site Owner is read-only per matrix column OWN (every cell is R), but holds "
              + "these non-read permissions: " + mutating);
    }

    /**
     * The one place §3 and §4 disagree, pinned so the resolution cannot drift silently. §3 is
     * {@code -} on "Scaler Record – Address" and "– Exams / Upgrades"; §4 grants the owner
     * "addresses, exam and upgrade history". §4 won — but only for those two rows, so the other five
     * scaler tabs stay denied. See {@code RolePermissions.scaleSiteOwner()} decision (1).
     */
    @Test
    @DisplayName("reads a scaler's Summary, Address and Exams only — §4 over §3, and no further")
    void holdsOnlyTheScalerTabsSection4Names() {
      assertTrue(granted.contains(Permissions.SCALER_ADDRESS_READ),
          () -> "§4 grants the owner scaler addresses");
      assertTrue(granted.contains(Permissions.SCALER_EXAM_QUERY),
          () -> "§4 grants the owner scaler exam and upgrade history");

      for (String denied : List.of(
          Permissions.SCALER_AUTHORIZATION_QUERY,
          Permissions.SCALER_CHECK_SCALE_QUERY,
          Permissions.SCALER_APPOINTMENT_QUERY,
          Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
          Permissions.SCALER_RISK_RATING_QUERY)) {
        assertFalse(granted.contains(denied),
            () -> "§3 and §4 agree the Scale Site Owner is denied " + denied);
      }
    }

    /**
     * §E's "Scaler Authorization" row is {@code -} for {@code OWN}, even though the site record's
     * Authorized Scalers tab (granted) lists those authorizations. Withholding the read is what makes
     * that tab's id column render as text rather than as a link to a page the role cannot open.
     */
    /**
     * The risk half of the Industry Scaler's shape, on this column — but note the contrast, because it is
     * what makes the grant deliberate rather than a copy: this role <b>does</b> search the site register
     * ({@link Permissions#SCALE_SITE_QUERY}, §D's plain {@code R}), so withholding
     * {@link Permissions#SCALE_SITE_RISK_ASSESSMENT_QUERY} is a statement about the assessment register
     * specifically, not a general "no registers" rule. Added 2026-09-03: the site record's Risk Rating
     * tab lists and links its own assessments, so the standalone search screen reaches nothing extra.
     */
    @Test
    @DisplayName("reads risk assessments from the site record only, though it does search the site register")
    void readsAssessmentsFromTheRecordOnly() {
      assertTrue(granted.contains(Permissions.SCALE_SITE_QUERY),
          () -> "§D grants this column the site register, unlike the Industry Scaler");

      assertTrue(granted.contains(Permissions.SCALE_SITE_RISK_RATING_QUERY),
          () -> "the Risk Rating tab");
      assertTrue(granted.contains(Permissions.SCALE_SITE_RISK_ASSESSMENT_READ),
          () -> "an assessment opened from that tab");
      assertFalse(granted.contains(Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY),
          () -> "the standalone Scale Site Risk Assessments search screen is withheld");
    }

    @Test
    @DisplayName("lists a site's authorized scalers without being able to open an authorization")
    void readsAuthorizedScalersButNotTheAuthorization() {
      assertTrue(granted.contains(Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY));
      assertFalse(granted.contains(Permissions.SCALER_AUTHORIZATION_READ));
    }

    /**
     * Matrix §F is {@code -} for {@code OWN} on every Mark / Site Designation row: the standalone MSD
     * search and record are the area withheld from the Scale Site Owner outright. Written while the role
     * was still welcome-only precisely so the constraint would outlive enabling it — which it now has.
     *
     * <p>Keyed on the {@code MSD_} prefix, not "contains MSD": §D grants {@code OWN} the MSD <i>tab</i>
     * on a site record as {@code R (ltd)}, and {@link Permissions#SCALE_SITE_MSD_QUERY} <b>is</b> now
     * granted to them, so a looser match here would fail on a permission the matrix allows.
     */
    @Test
    @DisplayName("never holds a standalone mark/site designation permission")
    void neverHoldsStandaloneMsd() {
      List<String> msd = granted.stream()
          .filter(permission -> permission.startsWith("MSD_"))
          .sorted()
          .toList();

      assertTrue(msd.isEmpty(),
          () -> "Matrix §F denies the Scale Site Owner every MSD row, but the role holds: " + msd);
    }

    @Test
    @DisplayName("is denied check scales, work bench, reports, risk and maintenance")
    void isDeniedOutOfScopeAreas() {
      for (String denied : List.of(
          // §I is - throughout: the site's Check Scales *tab* is granted, the check-scale record is not
          Permissions.CHECK_SCALE_QUERY,
          Permissions.CHECK_SCALE_UPDATE,
          // Risk assessment: the client's 2026-09-02 spec gives this column the SCALE-SITE subject
          // only — the record it lives on. The scaler subject belongs to the Industry Scaler
          Permissions.SCALER_RISK_ASSESSMENT_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_READ,
          // And the SEARCH screen even on its own subject — withheld 2026-09-03, because the Risk
          // Rating tab already lists and links the record's assessments. See scaleSiteOwner()
          Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
          // Read only: it holds no risk-assessment create or update
          Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
          Permissions.WORKBENCH_QUERY,
          Permissions.REPORT_READ,
          Permissions.MAINTAIN_QUESTIONS_QUERY,
          Permissions.MAINTAIN_SYSTEM_READ,
          Permissions.SCALE_SITE_UPDATE,
          Permissions.SCALE_SITE_CONTACT_CREATE,
          Permissions.SCALE_SITE_INSPECTION_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
          Permissions.SCALER_LICENCE_CANCEL,
          Permissions.SYSTEM_ADMIN)) {
        assertFalse(granted.contains(denied),
            () -> "Scale Site Owner must not hold " + denied);
      }
    }
  }

  @Nested
  @DisplayName("check scaler")
  class CheckScaler {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_CHECK_SCALER);

    @Test
    @DisplayName("holds exactly the permissions from matrix column CHK")
    void holdsTheMatrixColumn() {
      assertEquals(Set.of(
          Permissions.WELCOME_READ,
          Permissions.LOV_READ,
          Permissions.CLIENT_QUERY,
          Permissions.SCALER_QUERY,
          Permissions.SCALER_READ,
          Permissions.SCALER_ADDRESS_READ,
          Permissions.SCALER_AUTHORIZATION_QUERY,
          Permissions.SCALER_AUTHORIZATION_READ,
          Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
          Permissions.SCALER_CHECK_SCALE_QUERY,
          Permissions.SCALER_EXAM_QUERY,
          Permissions.SCALER_APPOINTMENT_QUERY,
          Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
          Permissions.SCALER_PERFORMANCE_REMARK_CREATE,
          Permissions.SCALER_PERFORMANCE_REMARK_UPDATE,
          Permissions.SCALER_PERFORMANCE_REMARK_DELETE,
          Permissions.SCALE_SITE_QUERY,
          Permissions.SCALE_SITE_READ,
          Permissions.SCALE_SITE_SUMMARY_READ,
          Permissions.SCALE_SITE_ACTIVITY_READ,
          Permissions.SCALE_SITE_CONTACT_QUERY,
          Permissions.SCALE_SITE_CONTACT_READ,
          Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
          Permissions.SCALE_SITE_AUTHORIZATION_READ,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
          Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
          Permissions.SCALE_SITE_MSD_QUERY,
          Permissions.SCALE_SITE_INSPECTION_QUERY,
          Permissions.SCALE_SITE_INSPECTION_READ,
          Permissions.SCALE_SITE_INSPECTION_CREATE,
          Permissions.SCALE_SITE_INSPECTION_UPDATE,
          Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
          Permissions.SCALE_SITE_SOFTWARE_QUERY,
          Permissions.CHECK_SCALE_QUERY,
          Permissions.CHECK_SCALE_CREATE,
          Permissions.CHECK_SCALE_UPDATE,
          Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE,
          Permissions.SUMMARY_CHECK_SCALE_CREATE,
          Permissions.SUMMARY_CHECK_SCALE_UPDATE,
          Permissions.MSD_QUERY,
          Permissions.MSD_READ,
          Permissions.MSD_CREATE,
          Permissions.MSD_UPDATE,
          Permissions.MSD_LETTER_CREATE,
          Permissions.MSD_LETTER_VIEW,
          // The letter pages' signatory picker — not §J's MAINTAIN_SIGNATORIES_QUERY
          Permissions.LETTER_SIGNATORY_QUERY,
          // One of the four create roles the client's 2026-09-02 spec names, on both subjects
          Permissions.SCALER_RISK_RATING_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_READ,
          Permissions.SCALER_RISK_ASSESSMENT_CREATE,
          Permissions.SCALER_RISK_ASSESSMENT_UPDATE,
          Permissions.SCALE_SITE_RISK_RATING_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
          Permissions.WORKBENCH_QUERY,
          Permissions.WORKBENCH_CREATE,
          Permissions.WORKBENCH_UPDATE,
          Permissions.REPORT_READ), granted);
    }

    /**
     * The first role with write access, so there is no "read-only" allowlist to lean on the way the two
     * external columns do. This is its replacement: the mutations the role holds are enumerated, and any
     * mutating permission outside that list fails the build.
     *
     * <p>Framed as an allowlist for the same reason as the read-only assertions above — a denylist only
     * catches the verbs it happens to name, so a permission added to the column later would slip through.
     */
    @Test
    @DisplayName("writes exactly five record types, plus Work Bench renewals — and nothing else")
    void writesOnlyWhatTheMatrixGrants() {
      Set<String> expectedMutations = Set.of(
          // §C Scaler Record – Performance Remarks CRD, Scaler Performance Remark – Create/Edit CRU
          Permissions.SCALER_PERFORMANCE_REMARK_CREATE,
          Permissions.SCALER_PERFORMANCE_REMARK_UPDATE,
          Permissions.SCALER_PERFORMANCE_REMARK_DELETE,
          // §H Site Inspection – Create CR, Site Inspection RU
          Permissions.SCALE_SITE_INSPECTION_CREATE,
          Permissions.SCALE_SITE_INSPECTION_UPDATE,
          // §I Check Scale – Create CR, – Edit RU (+ summary check scales, judgement call 2)
          Permissions.CHECK_SCALE_CREATE,
          Permissions.CHECK_SCALE_UPDATE,
          Permissions.SUMMARY_CHECK_SCALE_CREATE,
          Permissions.SUMMARY_CHECK_SCALE_UPDATE,
          // §F Mark Site Designation – Create/Edit CRUD
          Permissions.MSD_CREATE,
          Permissions.MSD_UPDATE,
          // All four letter families, by the client's 2026-09-02 spec. The three _LETTER_VIEW verbs are
          // reads, so the filter below excludes them alongside _READ and _QUERY
          Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
          Permissions.MSD_LETTER_CREATE,
          Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE,
          // Risk assessments — the fifth record type it authors
          Permissions.SCALER_RISK_ASSESSMENT_CREATE,
          Permissions.SCALER_RISK_ASSESSMENT_UPDATE,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
          // §A Work Bench CRU (ltd)
          Permissions.WORKBENCH_CREATE,
          Permissions.WORKBENCH_UPDATE);

      Set<String> actualMutations = granted.stream()
          .filter(permission -> !permission.endsWith("_READ")
              && !permission.endsWith("_QUERY")
              && !permission.endsWith("_LETTER_VIEW"))
          .collect(Collectors.toSet());

      assertEquals(expectedMutations, actualMutations,
          "Check Scaler writes check scales, site inspections, performance remarks, mark/site "
              + "designations and risk assessments, and renews from the Work Bench. Any other mutation "
              + "is a matrix departure that needs recording in RolePermissions.checkScaler().");
    }

    /**
     * §A grants Work Bench {@code CRU} while §E denies every authorization-create row, and the renew
     * endpoints sit on the §A side of that line. Pinned in both directions because the two look
     * contradictory in isolation — see {@code RolePermissions.checkScaler()} judgement call (1).
     */
    @Test
    @DisplayName("renews from the Work Bench but cannot open an authorization create wizard")
    void renewsWithoutHoldingAuthorizationCreate() {
      assertTrue(granted.contains(Permissions.WORKBENCH_CREATE),
          () -> "§A gives the Check Scaler Work Bench CRU");

      for (String denied : List.of(
          Permissions.SCALER_AUTHORIZATION_CREATE,
          Permissions.SCALER_AUTHORIZATION_UPDATE,
          Permissions.SCALER_AUTHORIZATION_DELETE,
          Permissions.SCALE_SITE_AUTHORIZATION_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_UPDATE,
          Permissions.SCALE_SITE_AUTHORIZATION_DELETE)) {
        assertFalse(granted.contains(denied),
            () -> "§E is - on every authorization create/edit row for CHK: " + denied);
      }

      // The letters are the exception, and they come from outside §E: the client's 2026-09-02 spec
      // names this role among the four holding all of them. Authoring an authorization and composing
      // its letter are separate capabilities here.
      assertTrue(granted.contains(Permissions.SCALER_AUTHORIZATION_LETTER_CREATE));
      assertTrue(granted.contains(Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE));
    }

    /**
     * Summary check scales have no matrix row; §I's "Check Scale" rows govern them. The {@code D}
     * appears only in {@code ADM}'s {@code RUD}, so the create and update are granted and the delete is
     * not — judgement call (2). Pinned so the resolution cannot drift in either direction.
     */
    @Test
    @DisplayName("records summary check scales but cannot delete one")
    void recordsSummaryCheckScalesWithoutDelete() {
      assertTrue(granted.contains(Permissions.SUMMARY_CHECK_SCALE_CREATE));
      assertTrue(granted.contains(Permissions.SUMMARY_CHECK_SCALE_UPDATE));
      assertFalse(granted.contains(Permissions.SUMMARY_CHECK_SCALE_DELETE),
          () -> "only ADM's \"Check Scale\" cell carries the D");
    }

    /**
     * The role is internal, so it is deliberately absent from {@link Roles#CLIENT_SCOPED_ROLES} and the
     * forest-client scoping layer is a no-op for it. Adding it there would be a lockout, not a
     * tightening: {@code expandAuthorities} withholds a client-scoped role's permissions entirely when
     * no client number is present, and FAM never delivers this group with a client suffix.
     */
    @Test
    @DisplayName("is internal: not client-scoped, and grants its column with no client number")
    void isInternalAndNeedsNoClientNumber() {
      assertFalse(Roles.isClientScoped(Roles.SCS_CHECK_SCALER));

      List<String> authorities = authorityNames(Set.of(Roles.SCS_CHECK_SCALER), Set.of());
      assertTrue(authorities.contains(Roles.SCS_CHECK_SCALER));
      assertTrue(authorities.contains(Permissions.CHECK_SCALE_CREATE));
      assertEquals(Set.of(),
          RolePermissions.rolesDeniedForMissingClient(
              List.of(new SimpleGrantedAuthority(Roles.SCS_CHECK_SCALER)), Set.of()));
    }

    @Test
    @DisplayName("is denied record creation, scaler edits, risk assessment and all maintenance")
    void isDeniedOutOfScopeAreas() {
      for (String denied : List.of(
          // §C / §D "– Create" and "Summary – Edit" rows are - for CHK
          Permissions.SCALER_CREATE,
          Permissions.SCALER_UPDATE,
          Permissions.SCALER_DELETE,
          Permissions.SCALE_SITE_CREATE,
          Permissions.SCALE_SITE_UPDATE,
          // Surfaced on the Performance Remarks tab this role writes to, but §4 gives suspend/cancel to
          // the district and regional managers — the split SCALER_LICENCE_CANCEL exists for
          Permissions.SCALER_LICENCE_CANCEL,
          // §C "Scaler Exam / Upgrade – Create/Edit" and "– Appointment – Create/Edit" are -
          Permissions.SCALER_EXAM_CREATE,
          Permissions.SCALER_EXAM_UPDATE,
          Permissions.SCALER_EXAM_DELETE,
          Permissions.SCALER_APPOINTMENT_CREATE,
          Permissions.SCALER_APPOINTMENT_UPDATE,
          Permissions.SCALER_APPOINTMENT_DELETE,
          // §D "Scale Site Contact – Create / – Edit" are -
          Permissions.SCALE_SITE_CONTACT_CREATE,
          Permissions.SCALE_SITE_CONTACT_UPDATE,
          Permissions.SCALE_SITE_CONTACT_DELETE,
          // §H has no delete row for any column
          Permissions.SCALE_SITE_INSPECTION_DELETE,
          // §D "Scale Site Record – Risk Rating Criteria" is -, and RSK has no other matrix row
          // risk assessment is held now — it follows the record, see the class javadoc
          // §J is - for CHK on every row, "Maintain Questions" included (that one is R for CET)
          Permissions.MAINTAIN_QUESTIONS_QUERY,
          Permissions.MAINTAIN_TEMPLATES_QUERY,
          Permissions.MAINTAIN_CONDITIONS_QUERY,
          Permissions.MAINTAIN_EXAM_UPGRADES_QUERY,
          Permissions.MAINTAIN_APPOINTMENT_TYPES_QUERY,
          Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY,
          Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_QUERY,
          Permissions.MAINTAIN_SIGNATORIES_QUERY,
          Permissions.MAINTAIN_SYSTEM_READ,
          Permissions.MAINTAIN_SYSTEM_UPDATE,
          Permissions.SYSTEM_ADMIN)) {
        assertFalse(granted.contains(denied),
            () -> "Check Scaler must not hold " + denied);
      }
    }
  }

  @Nested
  @DisplayName("branch & district clerical")
  class Clerical {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_CLERICAL);

    @Test
    @DisplayName("holds exactly the read permissions from matrix column CLE")
    void holdsTheMatrixColumn() {
      assertEquals(Set.of(
          Permissions.WELCOME_READ,
          Permissions.LOV_READ,
          Permissions.CLIENT_QUERY,
          Permissions.SCALER_QUERY,
          Permissions.SCALER_READ,
          Permissions.SCALER_ADDRESS_READ,
          Permissions.SCALER_AUTHORIZATION_QUERY,
          Permissions.SCALER_AUTHORIZATION_READ,
          Permissions.SCALER_CHECK_SCALE_QUERY,
          Permissions.SCALER_EXAM_QUERY,
          Permissions.SCALER_APPOINTMENT_QUERY,
          Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
          Permissions.SCALE_SITE_QUERY,
          Permissions.SCALE_SITE_READ,
          Permissions.SCALE_SITE_SUMMARY_READ,
          Permissions.SCALE_SITE_ACTIVITY_READ,
          Permissions.SCALE_SITE_CONTACT_QUERY,
          Permissions.SCALE_SITE_CONTACT_READ,
          Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
          Permissions.SCALE_SITE_AUTHORIZATION_READ,
          Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
          Permissions.SCALE_SITE_MSD_QUERY,
          Permissions.SCALE_SITE_INSPECTION_QUERY,
          Permissions.SCALE_SITE_INSPECTION_READ,
          Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
          Permissions.SCALE_SITE_SOFTWARE_QUERY,
          // Risk assessment follows the record — see the RolePermissions class javadoc: reads every tab of both
          // records and authors on neither
          Permissions.SCALER_RISK_RATING_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_READ,
          Permissions.SCALE_SITE_RISK_RATING_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
          Permissions.MSD_QUERY,
          Permissions.MSD_READ,
          Permissions.WORKBENCH_QUERY,
          Permissions.REPORT_READ), granted);
    }

    /**
     * Every cell in matrix column {@code CLE} is {@code R} or {@code -}. Asserted as an allowlist for
     * the same reason as the two external columns': a denylist only catches the verbs it happens to
     * name, so a write added to the column later would slip through.
     */
    @Test
    @DisplayName("holds nothing but read and query permissions")
    void isStrictlyReadOnly() {
      List<String> mutating = granted.stream()
          .filter(permission -> !permission.endsWith("_READ") && !permission.endsWith("_QUERY"))
          .toList();
      assertTrue(mutating.isEmpty(),
          () -> "Branch & District Clerical is read-only per matrix column CLE (every cell is R or -), "
              + "but holds these non-read permissions: " + mutating);
    }

    /**
     * §I is {@code -} throughout for this column, yet §C's "Scaler Record – Check Scales" and §D's
     * "Scale Site Record – Check Scales" are both {@code R}. The list is readable; the report is not.
     * Pinned in both directions — see {@code RolePermissions.clerical()} judgement call (2), which also
     * records the two visible consequences.
     */
    @Test
    @DisplayName("reads check-scale history on both records without opening a check scale")
    void readsCheckScaleHistoryWithoutOpeningACheckScale() {
      assertTrue(granted.contains(Permissions.SCALER_CHECK_SCALE_QUERY),
          () -> "§C \"Scaler Record – Check Scales\" is R for CLE");
      assertTrue(granted.contains(Permissions.SCALE_SITE_CHECK_SCALE_QUERY),
          () -> "§D \"Scale Site Record – Check Scales\" is R for CLE");

      for (String denied : List.of(
          Permissions.CHECK_SCALE_QUERY,
          Permissions.CHECK_SCALE_CREATE,
          Permissions.CHECK_SCALE_UPDATE,
          Permissions.CHECK_SCALE_DELETE,
          Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE,
          Permissions.SUMMARY_CHECK_SCALE_CREATE,
          Permissions.SUMMARY_CHECK_SCALE_UPDATE,
          Permissions.SUMMARY_CHECK_SCALE_DELETE)) {
        assertFalse(granted.contains(denied),
            () -> "§I is - on every row for CLE: " + denied);
      }
    }

    /**
     * §A's Work Bench cell is {@code R (ltd)} — the inverse of the Check Scaler's {@code CRU}. The queue
     * is readable and nothing on it can be renewed, which is the case the Work Bench actions column was
     * taught to drop rather than render empty.
     */
    @Test
    @DisplayName("reads the Work Bench queue but renews nothing on it")
    void readsTheWorkBenchWithoutRenewing() {
      assertTrue(granted.contains(Permissions.WORKBENCH_QUERY));
      assertFalse(granted.contains(Permissions.WORKBENCH_CREATE));
      assertFalse(granted.contains(Permissions.WORKBENCH_UPDATE));
    }

    /**
     * Internal, so deliberately absent from {@link Roles#CLIENT_SCOPED_ROLES}: FAM never delivers this
     * group with a client suffix, and adding it there would be a lockout rather than a tightening, since
     * {@code expandAuthorities} withholds a client-scoped role's permissions entirely without one.
     */
    @Test
    @DisplayName("is internal: not client-scoped, and grants its column with no client number")
    void isInternalAndNeedsNoClientNumber() {
      assertFalse(Roles.isClientScoped(Roles.SCS_CLERICAL));

      List<String> authorities = authorityNames(Set.of(Roles.SCS_CLERICAL), Set.of());
      assertTrue(authorities.contains(Roles.SCS_CLERICAL));
      assertTrue(authorities.contains(Permissions.SCALER_READ));
      assertEquals(Set.of(),
          RolePermissions.rolesDeniedForMissingClient(
              List.of(new SimpleGrantedAuthority(Roles.SCS_CLERICAL)), Set.of()));
    }

    @Test
    @DisplayName("is denied every create wizard, letter, risk assessment and maintenance screen")
    void isDeniedOutOfScopeAreas() {
      for (String denied : List.of(
          // §C / §D "– Create" and "Summary – Edit" rows are - for CLE
          Permissions.SCALER_CREATE,
          Permissions.SCALER_UPDATE,
          Permissions.SCALER_DELETE,
          Permissions.SCALE_SITE_CREATE,
          Permissions.SCALE_SITE_UPDATE,
          // §4 gives suspend/cancel to the district and regional managers, not to support staff
          Permissions.SCALER_LICENCE_CANCEL,
          // §C "– Exams / Upgrades" and "– Appointments" are R; their Create/Edit rows are -
          Permissions.SCALER_EXAM_CREATE,
          Permissions.SCALER_APPOINTMENT_CREATE,
          // §C "Scaler Performance Remark – Create/Edit" is - (CHK holds CRD here, this column R)
          Permissions.SCALER_PERFORMANCE_REMARK_CREATE,
          Permissions.SCALER_PERFORMANCE_REMARK_UPDATE,
          Permissions.SCALER_PERFORMANCE_REMARK_DELETE,
          // §D "Scale Site Contact – Create / – Edit" are -
          Permissions.SCALE_SITE_CONTACT_CREATE,
          Permissions.SCALE_SITE_CONTACT_UPDATE,
          Permissions.SCALE_SITE_CONTACT_DELETE,
          // §H "Site Inspection – Create / – Create/Edit" are - (the record itself is R)
          Permissions.SCALE_SITE_INSPECTION_CREATE,
          Permissions.SCALE_SITE_INSPECTION_UPDATE,
          Permissions.SCALE_SITE_INSPECTION_DELETE,
          // §E and §F are plain R with no create row, so no lifecycle to document. And the client's
          // 2026-09-02 spec names only CHK/ADM/RSM/DSM for letters and CET for viewing them, so this
          // column holds no letter verb of either kind
          Permissions.SCALER_AUTHORIZATION_CREATE,
          Permissions.SCALER_AUTHORIZATION_UPDATE,
          Permissions.SCALER_AUTHORIZATION_DELETE,
          Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
          Permissions.SCALE_SITE_AUTHORIZATION_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_UPDATE,
          Permissions.SCALE_SITE_AUTHORIZATION_DELETE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
          Permissions.MSD_CREATE,
          Permissions.MSD_UPDATE,
          Permissions.MSD_LETTER_CREATE,
          Permissions.MSD_LETTER_VIEW,
          // §D "Scale Site Record – Risk Rating Criteria" is -, and RSK has no other matrix row
          // risk assessment is held now — it follows the record, see the class javadoc
          // §J is - for CLE on every row, "Maintain Questions" included (that one is R for CET)
          Permissions.MAINTAIN_QUESTIONS_QUERY,
          Permissions.MAINTAIN_TEMPLATES_QUERY,
          Permissions.MAINTAIN_CONDITIONS_QUERY,
          Permissions.MAINTAIN_EXAM_UPGRADES_QUERY,
          Permissions.MAINTAIN_APPOINTMENT_TYPES_QUERY,
          Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY,
          Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_QUERY,
          Permissions.MAINTAIN_SIGNATORIES_QUERY,
          Permissions.MAINTAIN_SYSTEM_READ,
          Permissions.MAINTAIN_SYSTEM_UPDATE,
          Permissions.SYSTEM_ADMIN)) {
        assertFalse(granted.contains(denied),
            () -> "Branch & District Clerical must not hold " + denied);
      }
    }
  }

  @Nested
  @DisplayName("branch system support")
  class BranchSystemSupport {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_BRANCH_SYS_SUPPORT);

    /** Restated independently of {@link SharedReadOnlyColumn}, so neither test alone is load-bearing. */
    @Test
    @DisplayName("holds exactly the read permissions from matrix column SUP")
    void holdsTheMatrixColumn() {
      assertEquals(Set.of(
          Permissions.WELCOME_READ,
          Permissions.LOV_READ,
          Permissions.CLIENT_QUERY,
          Permissions.SCALER_QUERY,
          Permissions.SCALER_READ,
          Permissions.SCALER_ADDRESS_READ,
          Permissions.SCALER_AUTHORIZATION_QUERY,
          Permissions.SCALER_AUTHORIZATION_READ,
          Permissions.SCALER_CHECK_SCALE_QUERY,
          // §4 also names "exam requirements, exam schedules"; neither exists anywhere in SCS, so this
          // tab is the role's whole exam surface — see branchSystemSupport()
          Permissions.SCALER_EXAM_QUERY,
          Permissions.SCALER_APPOINTMENT_QUERY,
          Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
          Permissions.SCALE_SITE_QUERY,
          Permissions.SCALE_SITE_READ,
          Permissions.SCALE_SITE_SUMMARY_READ,
          Permissions.SCALE_SITE_ACTIVITY_READ,
          Permissions.SCALE_SITE_CONTACT_QUERY,
          Permissions.SCALE_SITE_CONTACT_READ,
          Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
          Permissions.SCALE_SITE_AUTHORIZATION_READ,
          Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
          Permissions.SCALE_SITE_MSD_QUERY,
          // §4 names inspection results and approved software explicitly; §3 already granted both
          Permissions.SCALE_SITE_INSPECTION_QUERY,
          Permissions.SCALE_SITE_INSPECTION_READ,
          Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
          Permissions.SCALE_SITE_SOFTWARE_QUERY,
          Permissions.MSD_QUERY,
          Permissions.MSD_READ,
          // Risk assessment follows the record — see the RolePermissions class javadoc: as the clerical column
          Permissions.SCALER_RISK_RATING_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_READ,
          Permissions.SCALE_SITE_RISK_RATING_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
          // §A Work Bench: plain R here (province-wide), R (ltd) for the clerical column
          Permissions.WORKBENCH_QUERY,
          Permissions.REPORT_READ), granted);
    }

    @Test
    @DisplayName("holds nothing but read and query permissions")
    void isStrictlyReadOnly() {
      List<String> mutating = granted.stream()
          .filter(permission -> !permission.endsWith("_READ") && !permission.endsWith("_QUERY"))
          .toList();
      assertTrue(mutating.isEmpty(),
          () -> "Branch System Support is read-only per matrix column SUP (every cell is R or -), but "
              + "holds these non-read permissions: " + mutating);
    }

    /**
     * §4's "exam requirements, exam schedules" describes nothing SCS built, so it must not have leaked
     * in as the maintenance screen that sounds closest. §J is {@code -} for this column, and legacy kept
     * that whole submenu behind a WebADE action this role did not hold.
     */
    @Test
    @DisplayName("reads a scaler's exams without reaching the exam reference data")
    void readsExamHistoryButNotTheExamReferenceData() {
      assertTrue(granted.contains(Permissions.SCALER_EXAM_QUERY));

      for (String denied : List.of(
          Permissions.MAINTAIN_EXAM_UPGRADES_QUERY,
          Permissions.MAINTAIN_EXAM_UPGRADES_READ,
          Permissions.MAINTAIN_EXAM_UPGRADES_CREATE,
          Permissions.SCALER_EXAM_CREATE,
          Permissions.SCALER_EXAM_UPDATE,
          Permissions.SCALER_EXAM_DELETE)) {
        assertFalse(granted.contains(denied),
            () -> "§J is - for SUP and §C's exam Create/Edit row is too: " + denied);
      }
    }

    @Test
    @DisplayName("is internal: not client-scoped, and grants its column with no client number")
    void isInternalAndNeedsNoClientNumber() {
      assertFalse(Roles.isClientScoped(Roles.SCS_BRANCH_SYS_SUPPORT));

      List<String> authorities = authorityNames(Set.of(Roles.SCS_BRANCH_SYS_SUPPORT), Set.of());
      assertTrue(authorities.contains(Roles.SCS_BRANCH_SYS_SUPPORT));
      assertTrue(authorities.contains(Permissions.SCALER_READ));
    }

    @Test
    @DisplayName("is denied every create wizard, letter, check scale, risk assessment and maintenance screen")
    void isDeniedOutOfScopeAreas() {
      for (String denied : List.of(
          Permissions.SCALER_CREATE,
          Permissions.SCALER_UPDATE,
          Permissions.SCALER_LICENCE_CANCEL,
          Permissions.SCALER_PERFORMANCE_REMARK_CREATE,
          Permissions.SCALER_APPOINTMENT_CREATE,
          Permissions.SCALE_SITE_CREATE,
          Permissions.SCALE_SITE_UPDATE,
          Permissions.SCALE_SITE_CONTACT_CREATE,
          Permissions.SCALE_SITE_INSPECTION_CREATE,
          Permissions.SCALE_SITE_INSPECTION_UPDATE,
          // §I is - throughout for this column, exactly as for the clerical one
          Permissions.CHECK_SCALE_QUERY,
          Permissions.CHECK_SCALE_CREATE,
          Permissions.SUMMARY_CHECK_SCALE_CREATE,
          Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE,
          // §E and §F are plain R with no create row, so no lifecycle to document — and the client's
          // 2026-09-02 spec gives this column no letter verb of either kind
          Permissions.SCALER_AUTHORIZATION_CREATE,
          Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
          Permissions.SCALE_SITE_AUTHORIZATION_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
          Permissions.MSD_CREATE,
          Permissions.MSD_UPDATE,
          Permissions.MSD_LETTER_CREATE,
          Permissions.MSD_LETTER_VIEW,
          // §A gives it Work Bench R, not CRU — nothing on the queue can be renewed
          Permissions.WORKBENCH_CREATE,
          Permissions.WORKBENCH_UPDATE,
          // risk assessment is held now — it follows the record, see the class javadoc
          Permissions.MAINTAIN_QUESTIONS_QUERY,
          Permissions.MAINTAIN_TEMPLATES_QUERY,
          Permissions.MAINTAIN_SIGNATORIES_QUERY,
          Permissions.MAINTAIN_SYSTEM_READ,
          Permissions.SYSTEM_ADMIN)) {
        assertFalse(granted.contains(denied),
            () -> "Branch System Support must not hold " + denied);
      }
    }
  }

  @Nested
  @DisplayName("regional manager")
  class RegionalManager {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_REGIONAL_MANAGER);

    /**
     * The decision that defines this column. §4 claims "Create scaler licences (full create for acting
     * exams; pending branch approval for licensed exams)" — the same bullet {@code DSM} and {@code RSM}
     * carry, and both of those hold {@code CR} on §C's "Scaler – Create", so the phrase means the create
     * wizard. §3 denies it here in two separate rows, and legacy's {@code MenuUtils} gave this role no
     * Create menu at all. Pinned in both directions; see {@code RolePermissions.regionalManager()}.
     */
    @Test
    @DisplayName("cannot create a scaler, despite §4's \"create scaler licences\"")
    void doesNotHoldScalerCreate() {
      assertFalse(granted.contains(Permissions.SCALER_CREATE),
          () -> "§3 is - on \"Scaler – Create\" and R (not CR) on \"Queries – Scalers – Results\", and "
              + "legacy MenuUtils gave SCS_REGIONAL_MANAGER no Create menu. If this is being granted, "
              + "record why in RolePermissions.regionalManager() — it reverses a documented decision.");
      // The reads that bullet sits next to *are* granted, so the role is not simply locked out of scalers.
      assertTrue(granted.contains(Permissions.SCALER_QUERY));
      assertTrue(granted.contains(Permissions.SCALER_READ));
      assertTrue(granted.contains(Permissions.SCALER_EXAM_QUERY));
    }

    /**
     * §4's "Suspend scaler licence / recommend cancellations" belongs to {@code DM}, {@code DSM} and
     * {@code RSM}. This column's four bullets do not include it — worth its own assertion because
     * {@link Permissions#SCALER_LICENCE_CANCEL} was split out of {@link Permissions#SCALER_UPDATE} for
     * "the manager roles", which invites granting it to anything called Manager.
     */
    @Test
    @DisplayName("cannot suspend a licence — that bullet is the District Manager's, not this one's")
    void doesNotHoldLicenceCancel() {
      assertFalse(granted.contains(Permissions.SCALER_LICENCE_CANCEL));
      assertFalse(granted.contains(Permissions.SCALER_UPDATE));
    }

    /**
     * §4 does not mention the Work Bench for this role, while §A grants it {@code R (ltd)}. §3 wins:
     * §4 omission is not denial, the same reading the clerical column rests on.
     */
    @Test
    @DisplayName("reads the Work Bench queue that §A grants and §4 forgets, and renews nothing")
    void readsTheWorkBenchWithoutRenewing() {
      assertTrue(granted.contains(Permissions.WORKBENCH_QUERY));
      assertFalse(granted.contains(Permissions.WORKBENCH_CREATE));
      assertFalse(granted.contains(Permissions.WORKBENCH_UPDATE));
    }

    @Test
    @DisplayName("holds nothing but read and query permissions")
    void isStrictlyReadOnly() {
      List<String> mutating = granted.stream()
          .filter(permission -> !permission.endsWith("_READ") && !permission.endsWith("_QUERY"))
          .toList();
      assertTrue(mutating.isEmpty(),
          () -> "Regional Manager is read-only per matrix column RM (every cell is R or -), but holds "
              + "these non-read permissions: " + mutating);
    }

    @Test
    @DisplayName("is internal: not client-scoped, and grants its column with no client number")
    void isInternalAndNeedsNoClientNumber() {
      assertFalse(Roles.isClientScoped(Roles.SCS_REGIONAL_MANAGER));

      List<String> authorities = authorityNames(Set.of(Roles.SCS_REGIONAL_MANAGER), Set.of());
      assertTrue(authorities.contains(Roles.SCS_REGIONAL_MANAGER));
      assertTrue(authorities.contains(Permissions.SCALER_READ));
    }
  }

  @Nested
  @DisplayName("district manager")
  class DistrictManager {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_DIST_MANAGER);

    /**
     * The whole column: the shared read-only list plus §4's one write. Expressed against that list
     * rather than as thirty-one literals, so it stays true by construction if the shared list changes —
     * the point of interest here is the delta, and {@link #writesOnlyTheLicenceCancellation()} pins that
     * independently.
     */
    @Test
    @DisplayName("holds the shared read-only column plus SCALER_LICENCE_CANCEL")
    void holdsTheSharedColumnPlusLicenceCancel() {
      Set<String> expected = new LinkedHashSet<>(RolePermissions.forRole(Roles.SCS_CLERICAL));
      expected.add(Permissions.SCALER_LICENCE_CANCEL);

      assertEquals(expected, granted);
    }

    /**
     * §4's "Suspend scaler licence / recommend cancellations", granted against §3's {@code -} on
     * "Scaler Record – Summary – Edit" — because legacy gated the licence-cancelled date under its own
     * WebADE action ({@code scalerPerformanceRemarkCancelScaler}), separate from both scaler edit and
     * remark authoring. Pinned in both directions: the cancel is held, the scaler edit is not.
     */
    @Test
    @DisplayName("suspends a licence without being able to edit the scaler")
    void cancelsALicenceWithoutScalerEdit() {
      assertTrue(granted.contains(Permissions.SCALER_LICENCE_CANCEL),
          () -> "§4 gives the District Manager \"Suspend scaler licence / recommend cancellations\", "
              + "and legacy gated it independently of scaler edit — see "
              + "RolePermissions.districtManager()");

      assertFalse(granted.contains(Permissions.SCALER_UPDATE),
          () -> "§3's \"Scaler Record – Summary – Edit\" is - for DM: the licence-cancelled date is the "
              + "only field this role writes, and it is not a Summary field");
      assertFalse(granted.contains(Permissions.SCALER_CREATE));
      assertFalse(granted.contains(Permissions.SCALER_DELETE));
    }

    /**
     * Not read-only, so there is no allowlist of read suffixes to lean on. Same shape as the Check
     * Scaler's replacement: enumerate the mutations, and any other mutating permission fails the build.
     */
    @Test
    @DisplayName("writes exactly one thing — the licence cancellation — and nothing else")
    void writesOnlyTheLicenceCancellation() {
      Set<String> actualMutations = granted.stream()
          .filter(permission -> !permission.endsWith("_READ") && !permission.endsWith("_QUERY"))
          .collect(Collectors.toSet());

      assertEquals(Set.of(Permissions.SCALER_LICENCE_CANCEL), actualMutations,
          "The District Manager's only write is the licence cancellation. Any other mutation is a "
              + "matrix departure that needs recording in RolePermissions.districtManager().");
    }

    /**
     * The first enabled role that is <b>not</b> a subset of the Check Scaler, because that column
     * deliberately withholds this one permission. Recorded as a test so the exception is visible rather
     * than surprising: the "every page was already swept" argument cannot be made by containment here,
     * and holds instead because this permission gates a control on a tab the shared list already opens.
     */
    @Test
    @DisplayName("is not a subset of the Check Scaler column — the licence cancellation is the one gap")
    void differsFromCheckScalerByExactlyTheLicenceCancel() {
      Set<String> checkScaler = RolePermissions.forRole(Roles.SCS_CHECK_SCALER);

      Set<String> beyondCheckScaler = granted.stream()
          .filter(permission -> !checkScaler.contains(permission))
          .collect(Collectors.toSet());

      assertEquals(Set.of(Permissions.SCALER_LICENCE_CANCEL), beyondCheckScaler,
          "Only the licence cancellation should sit outside the Check Scaler column. Anything else "
              + "here is a page that role's in-page control sweep never covered.");
    }

    /**
     * The control it newly reaches sits on the Performance Remarks tab, which the shared list already
     * opens — so no new page, and the remark-authoring controls on that tab stay hidden.
     */
    @Test
    @DisplayName("reads performance remarks without authoring them")
    void readsRemarksWithoutWritingThem() {
      assertTrue(granted.contains(Permissions.SCALER_PERFORMANCE_REMARK_QUERY));
      for (String denied : List.of(
          Permissions.SCALER_PERFORMANCE_REMARK_CREATE,
          Permissions.SCALER_PERFORMANCE_REMARK_UPDATE,
          Permissions.SCALER_PERFORMANCE_REMARK_DELETE)) {
        assertFalse(granted.contains(denied),
            () -> "§C's \"Scaler Performance Remark – Create/Edit\" is - for DM: " + denied);
      }
    }

    @Test
    @DisplayName("reads the Work Bench queue that §4 names, and renews nothing")
    void readsTheWorkBenchWithoutRenewing() {
      assertTrue(granted.contains(Permissions.WORKBENCH_QUERY));
      assertFalse(granted.contains(Permissions.WORKBENCH_CREATE));
      assertFalse(granted.contains(Permissions.WORKBENCH_UPDATE));
    }

    @Test
    @DisplayName("is internal: not client-scoped, and grants its column with no client number")
    void isInternalAndNeedsNoClientNumber() {
      assertFalse(Roles.isClientScoped(Roles.SCS_DIST_MANAGER));

      List<String> authorities = authorityNames(Set.of(Roles.SCS_DIST_MANAGER), Set.of());
      assertTrue(authorities.contains(Roles.SCS_DIST_MANAGER));
      assertTrue(authorities.contains(Permissions.SCALER_LICENCE_CANCEL));
    }
  }

  /**
   * §3 gives three columns the same cells, so {@code RolePermissions} keeps one list for them. These are
   * the tests that make that safe: the equality is asserted here, with the reasoning in the failure
   * message, and each role separately asserts its own exact set in the blocks above — so a divergence
   * fails loudly and lands the reader on the reason rather than on a diff of thirty names.
   */
  @Nested
  @DisplayName("the shared read-only internal column")
  class SharedReadOnlyColumn {

    @Test
    @DisplayName("clerical, branch support and regional manager hold identical sets")
    void theThreeColumnsAreEqual() {
      Set<String> clerical = RolePermissions.forRole(Roles.SCS_CLERICAL);

      for (String role : List.of(Roles.SCS_BRANCH_SYS_SUPPORT, Roles.SCS_REGIONAL_MANAGER)) {
        assertEquals(clerical, RolePermissions.forRole(role),
            "§3 gives CLE, SUP and RM identical cells in 78 of 79 rows; the only variation is §A's "
                + "Work Bench, R (ltd) against plain R, which is org-unit breadth rather than a "
                + "different permission. If " + role + " must differ, say why in its own method in "
                + "RolePermissions and give it its own Set.of.");
      }
    }

    /**
     * The District Manager's §3 column is identical to these three, which makes "simplify it into the
     * shared list" an inviting and wrong edit: §4 gives it a write the others do not have. Asserted as a
     * non-membership so the union stays deliberate.
     */
    @Test
    @DisplayName("does not include the district manager, whose §4 adds a write")
    void excludesTheDistrictManager() {
      Set<String> shared = RolePermissions.forRole(Roles.SCS_CLERICAL);
      Set<String> districtManager = RolePermissions.forRole(Roles.SCS_DIST_MANAGER);

      assertFalse(shared.equals(districtManager),
          "DM's §3 column is identical to the shared one, but §4 gives it \"Suspend scaler licence / "
              + "recommend cancellations\". If these are now equal, that capability has been dropped — "
              + "see RolePermissions.districtManager().");
      assertTrue(districtManager.containsAll(shared),
          "DM should be the shared column plus SCALER_LICENCE_CANCEL, not a different set");
    }

    /**
     * The property that makes all three cheap to enable, and the one to re-check if a fourth joins them:
     * every page they open, the Check Scaler already opened, so that role's in-page control sweep covers
     * them and no new ungated control can be reached.
     */
    @Test
    @DisplayName("is a strict subset of the Check Scaler column")
    void isAStrictSubsetOfCheckScaler() {
      Set<String> checkScaler = RolePermissions.forRole(Roles.SCS_CHECK_SCALER);

      for (String role : List.of(
          Roles.SCS_CLERICAL, Roles.SCS_BRANCH_SYS_SUPPORT, Roles.SCS_REGIONAL_MANAGER)) {
        Set<String> granted = RolePermissions.forRole(role);
        List<String> beyond = granted.stream()
            .filter(permission -> !checkScaler.contains(permission))
            .sorted()
            .toList();

        assertTrue(beyond.isEmpty(),
            () -> role + " holds permissions the Check Scaler does not, so it may reach a page that "
                + "role's control sweep never covered: " + beyond);
        assertTrue(granted.size() < checkScaler.size(), () -> role + " should be a strict subset");
      }
    }
  }

  @Nested
  @DisplayName("c&e technician")
  class CeTechnician {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_CE_TECHNICIAN);

    /**
     * The client's 2026-09-02 rule, asserted the way the read-only columns assert theirs: as an
     * <b>allowlist</b>. "No where in the app should they be able to edit, delete or create something",
     * so every granted name must end {@code _READ}, {@code _QUERY} or {@code _LETTER_VIEW}. A denylist
     * would only catch the verbs it happens to name; this catches any write added later by default.
     */
    @Test
    @DisplayName("holds nothing but read, query and letter-view permissions")
    void isStrictlyReadOnly() {
      List<String> mutating = granted.stream()
          .filter(permission -> !permission.endsWith("_READ")
              && !permission.endsWith("_QUERY")
              && !permission.endsWith("_LETTER_VIEW"))
          .sorted()
          .toList();
      assertTrue(mutating.isEmpty(),
          () -> "The client's 2026-09-02 spec makes the C&E Technician read-only everywhere, but it "
              + "holds these non-read permissions: " + mutating);
    }

    /**
     * Stated as the delta from the shared read-only column, because that is what this role became when
     * the client's spec withdrew its writes. Four differences, each recorded in
     * {@code RolePermissions.ceTechnician()}.
     */
    @Test
    @DisplayName("is the read-only column minus Work Bench, plus check-scale read, letter views and Maintain Questions")
    void differsFromTheReadOnlyColumnByTheDocumentedCells() {
      Set<String> readOnlyInternal = RolePermissions.forRole(Roles.SCS_CLERICAL);

      Set<String> onlyReadOnlyInternal = readOnlyInternal.stream()
          .filter(permission -> !granted.contains(permission))
          .collect(Collectors.toSet());
      Set<String> onlyCeTechnician = granted.stream()
          .filter(permission -> !readOnlyInternal.contains(permission))
          .collect(Collectors.toSet());

      assertEquals(Set.of(
          // §A Work Bench is - for CET and R (ltd) for the read-only internal columns
          Permissions.WORKBENCH_QUERY), onlyReadOnlyInternal,
          "the Work Bench is the only thing the read-only internal column holds that CET does not");

      assertEquals(Set.of(
          // §I's read row is R for CET and - for CLE — see RolePermissions.ceTechnician()
          Permissions.CHECK_SCALE_QUERY,
          // "CE_TECH should only be able to view letters" — the client's 2026-09-02 spec
          Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
          Permissions.MSD_LETTER_VIEW,
          // §J's "Maintain Questions" R, the only §J cell granted to any non-administrator
          Permissions.MAINTAIN_QUESTIONS_QUERY,
          Permissions.MAINTAIN_QUESTIONS_READ), onlyCeTechnician,
          "these are the cells CET holds that the read-only internal column does not");
    }

    /**
     * The whole point of splitting {@code _LETTER} into two verbs. This is the only role that may open a
     * letter someone else composed without being able to compose one, so it is pinned in both
     * directions — and the advisory letter is absent from both halves, because SCS stores no advisory
     * letter and so exposes nothing for a view verb to fetch.
     */
    @Test
    @DisplayName("views letters without composing any, and reaches no advisory letter at all")
    void viewsLettersWithoutCreatingThem() {
      for (String permission : List.of(
          Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
          Permissions.MSD_LETTER_VIEW)) {
        assertTrue(granted.contains(permission), () -> "CET views letters: " + permission);
      }

      for (String denied : List.of(
          Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
          Permissions.MSD_LETTER_CREATE,
          // No _VIEW counterpart exists, so CET reaches no advisory letter by any route
          Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE)) {
        assertFalse(granted.contains(denied),
            () -> "CET may only view letters, not compose them: " + denied);
      }
    }

    /**
     * The reversal, pinned so it cannot drift back. §I's four rows and §D's tab row gave this column
     * {@code CR}/{@code RU} on check scales, and this class used to grant them on that basis over §C's
     * {@code R} and §4's "View check-scale history". The client's 2026-09-02 rule settles it the other
     * way: the read survives, every write is gone.
     */
    @Test
    @DisplayName("reads check scales without recording one — the client's rule over §I")
    void readsCheckScalesWithoutRecordingThem() {
      assertTrue(granted.contains(Permissions.CHECK_SCALE_QUERY),
          () -> "§I's read row survives: the check-scale record stays open to CET");
      assertTrue(granted.contains(Permissions.SCALER_CHECK_SCALE_QUERY));
      assertTrue(granted.contains(Permissions.SCALE_SITE_CHECK_SCALE_QUERY));

      for (String denied : List.of(
          Permissions.CHECK_SCALE_CREATE,
          Permissions.CHECK_SCALE_UPDATE,
          Permissions.CHECK_SCALE_DELETE,
          Permissions.SUMMARY_CHECK_SCALE_CREATE,
          Permissions.SUMMARY_CHECK_SCALE_UPDATE,
          Permissions.SUMMARY_CHECK_SCALE_DELETE)) {
        assertFalse(granted.contains(denied),
            () -> "the client's 2026-09-02 rule withdrew every CET write: " + denied);
      }
    }

    /** §H's {@code CR} / {@code RU} went the same way as §I's — the reads remain. */
    @Test
    @DisplayName("reads site inspections without completing one")
    void readsSiteInspectionsWithoutCompletingThem() {
      assertTrue(granted.contains(Permissions.SCALE_SITE_INSPECTION_QUERY));
      assertTrue(granted.contains(Permissions.SCALE_SITE_INSPECTION_READ));

      for (String denied : List.of(
          Permissions.SCALE_SITE_INSPECTION_CREATE,
          Permissions.SCALE_SITE_INSPECTION_UPDATE,
          Permissions.SCALE_SITE_INSPECTION_DELETE)) {
        assertFalse(granted.contains(denied), () -> "CET is read-only on inspections: " + denied);
      }
    }

    /**
     * Risk assessment: read on both subjects. The client's spec names CHECK_SCALER, SYS_ADMIN,
     * REG_SCAL_MAN and REG_DIST_MAN as the create roles and puts "the remaining roles" on read — which
     * withdrew the create and update this column used to hold.
     */
    @Test
    @DisplayName("reads risk assessments on both subjects without authoring one")
    void readsRiskAssessmentsWithoutAuthoringThem() {
      for (String permission : List.of(
          Permissions.SCALER_RISK_RATING_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_READ,
          Permissions.SCALE_SITE_RISK_RATING_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_READ)) {
        assertTrue(granted.contains(permission), () -> "CET reads risk assessments: " + permission);
      }

      for (String denied : List.of(
          Permissions.SCALER_RISK_ASSESSMENT_CREATE,
          Permissions.SCALER_RISK_ASSESSMENT_UPDATE,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_UPDATE)) {
        assertFalse(granted.contains(denied),
            () -> "CET is not one of the four create roles the client named: " + denied);
      }
    }

    /**
     * §J is {@code -} for every other non-administrator column, so this one cell is the whole of this
     * role's maintenance reach — and it is read-only. Pinned tightly: the write verbs on the same screen
     * must stay withheld, and no other maintenance area may leak in.
     */
    @Test
    @DisplayName("reads the inspection questions screen without being able to change it")
    void readsMaintainQuestionsOnly() {
      assertTrue(granted.contains(Permissions.MAINTAIN_QUESTIONS_QUERY));
      assertTrue(granted.contains(Permissions.MAINTAIN_QUESTIONS_READ));

      for (String denied : List.of(
          Permissions.MAINTAIN_QUESTIONS_CREATE,
          Permissions.MAINTAIN_QUESTIONS_UPDATE,
          Permissions.MAINTAIN_QUESTIONS_DELETE)) {
        assertFalse(granted.contains(denied),
            () -> "§J's \"Maintain Questions\" is R, not CRUD, for CET: " + denied);
      }

      List<String> otherMaintenance = granted.stream()
          .filter(permission -> permission.startsWith("MAINTAIN_"))
          .filter(permission -> !permission.startsWith("MAINTAIN_QUESTIONS_"))
          .sorted()
          .toList();
      assertTrue(otherMaintenance.isEmpty(),
          () -> "§J grants CET the questions row and nothing else, but it holds: " + otherMaintenance);
    }

    /** §A is {@code -}: still the only internal column with no Work Bench at all. */
    @Test
    @DisplayName("has no Work Bench, unlike every other enabled internal role")
    void hasNoWorkBench() {
      for (String denied : List.of(
          Permissions.WORKBENCH_QUERY,
          Permissions.WORKBENCH_CREATE,
          Permissions.WORKBENCH_UPDATE)) {
        assertFalse(granted.contains(denied), () -> "§A is - for CET: " + denied);
      }
    }

    @Test
    @DisplayName("reads mark/site designations without authoring them")
    void readsMsdWithoutAuthoringIt() {
      assertTrue(granted.contains(Permissions.MSD_QUERY));
      assertTrue(granted.contains(Permissions.MSD_READ));
      assertTrue(granted.contains(Permissions.SCALE_SITE_MSD_QUERY));

      for (String denied : List.of(
          Permissions.MSD_CREATE, Permissions.MSD_UPDATE, Permissions.MSD_LETTER_CREATE)) {
        assertFalse(granted.contains(denied), () -> "§F is - on both create rows for CET: " + denied);
      }
    }

    @Test
    @DisplayName("is internal: not client-scoped, and grants its column with no client number")
    void isInternalAndNeedsNoClientNumber() {
      assertFalse(Roles.isClientScoped(Roles.SCS_CE_TECHNICIAN));

      List<String> authorities = authorityNames(Set.of(Roles.SCS_CE_TECHNICIAN), Set.of());
      assertTrue(authorities.contains(Roles.SCS_CE_TECHNICIAN));
      assertTrue(authorities.contains(Permissions.CHECK_SCALE_QUERY));
    }

    @Test
    @DisplayName("is denied every create wizard, scaler edit, remark write and authorization write")
    void isDeniedOutOfScopeAreas() {
      for (String denied : List.of(
          Permissions.SCALER_CREATE,
          Permissions.SCALER_UPDATE,
          Permissions.SCALER_LICENCE_CANCEL,
          Permissions.SCALER_EXAM_CREATE,
          Permissions.SCALER_APPOINTMENT_CREATE,
          // §C's Performance Remarks CRD went with the client's read-only rule
          Permissions.SCALER_PERFORMANCE_REMARK_CREATE,
          Permissions.SCALER_PERFORMANCE_REMARK_UPDATE,
          Permissions.SCALER_PERFORMANCE_REMARK_DELETE,
          Permissions.SCALE_SITE_CREATE,
          Permissions.SCALE_SITE_UPDATE,
          Permissions.SCALE_SITE_CONTACT_CREATE,
          Permissions.SCALER_AUTHORIZATION_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_CREATE,
          Permissions.MAINTAIN_SYSTEM_READ,
          Permissions.SYSTEM_ADMIN)) {
        assertFalse(granted.contains(denied),
            () -> "C&E Technician must not hold " + denied);
      }
    }
  }

  @Nested
  @DisplayName("district scaling manager")
  class DistrictScalingManager {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_DIST_SCALING_MANAGER);

    /**
     * The shape of the column, asserted as the delta from {@code ALL_PERMISSIONS}: what the
     * administrator holds and this role does not. That is the list a reviewer can check against §3's
     * {@code CRUD}-vs-{@code CRU} columns, and it is far more legible than seventy granted names.
     */
    @Test
    @DisplayName("is the administrator minus the deletes, Maintain System and a signatory create")
    void isTheAdministratorMinusTheDeletes() {
      Set<String> missing = Permissions.ALL_PERMISSIONS.stream()
          .filter(permission -> !granted.contains(permission))
          .collect(Collectors.toSet());

      assertEquals(Set.of(
          // §C "Summary – Edit" is RU here, RUD for the administrator
          Permissions.SCALER_DELETE,
          // §C Exams / Appointments are CRU, CRUD for the administrator
          Permissions.SCALER_EXAM_DELETE,
          Permissions.SCALER_APPOINTMENT_DELETE,
          // §H has no delete row for any column; §I's D is the administrator's alone
          Permissions.SCALE_SITE_INSPECTION_DELETE,
          Permissions.CHECK_SCALE_DELETE,
          Permissions.SUMMARY_CHECK_SCALE_DELETE,
          // §J Questions is R, and every other area CRU: authored, never removed
          Permissions.MAINTAIN_QUESTIONS_CREATE,
          Permissions.MAINTAIN_QUESTIONS_UPDATE,
          Permissions.MAINTAIN_QUESTIONS_DELETE,
          Permissions.MAINTAIN_TEMPLATES_DELETE,
          Permissions.MAINTAIN_CONDITIONS_DELETE,
          Permissions.MAINTAIN_EXAM_UPGRADES_DELETE,
          Permissions.MAINTAIN_APPOINTMENT_TYPES_DELETE,
          Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE,
          Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_DELETE,
          // §J Signatories are RU (dist) — the one maintenance area with no C
          Permissions.MAINTAIN_SIGNATORIES_CREATE,
          Permissions.MAINTAIN_SIGNATORIES_DELETE,
          // §J "Maintain System" is - for every column but the administrator
          Permissions.MAINTAIN_SYSTEM_READ,
          Permissions.MAINTAIN_SYSTEM_UPDATE,
          Permissions.SYSTEM_ADMIN), missing);
    }

    /** The first column to reach the create wizards; §C/§D/§E/§F all carry the {@code C}. */
    @Test
    @DisplayName("opens every create wizard")
    void opensEveryCreateWizard() {
      for (String permission : List.of(
          Permissions.SCALER_CREATE,
          Permissions.SCALE_SITE_CREATE,
          Permissions.SCALER_AUTHORIZATION_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_CREATE,
          Permissions.MSD_CREATE,
          Permissions.CHECK_SCALE_CREATE,
          Permissions.SUMMARY_CHECK_SCALE_CREATE)) {
        assertTrue(granted.contains(permission), () -> "§3 gives DSM the C on " + permission);
      }
    }

    /**
     * Risk assessment follows the record: these columns read and author across the whole scaler and
     * scale-site records, so they hold every verb either subject exposes.
     *
     * <p>The {@code _UPDATE}s are the ones worth pinning. While §D's lone "Risk Rating Criteria"
     * {@code CR} was being read as the ceiling they were administrator-only — which left the two
     * assessment edit routes reachable by nobody else, and the view page offering an Edit button that
     * only the administrator could follow.
     */
    @Test
    @DisplayName("holds every risk-assessment verb for both subjects")
    void holdsEveryRiskAssessmentVerb() {
      for (String permission : List.of(
          Permissions.SCALER_RISK_RATING_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_QUERY,
          Permissions.SCALER_RISK_ASSESSMENT_READ,
          Permissions.SCALER_RISK_ASSESSMENT_CREATE,
          Permissions.SCALER_RISK_ASSESSMENT_UPDATE,
          Permissions.SCALE_SITE_RISK_RATING_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE,
          Permissions.SCALE_SITE_RISK_ASSESSMENT_UPDATE)) {
        assertTrue(granted.contains(permission), () -> "risk assessment: " + permission);
      }
    }

    /**
     * Every letter verb, view and create alike: the client's 2026-09-02 spec names REG_SCAL_MAN and
     * REG_DIST_MAN — this column and {@link Roles#SCS_REGIONAL_SCALING_MANAGER} — among the four with
     * "access to all letters". Seven, not eight: the advisory letter has no view verb because SCS
     * stores no advisory letter.
     */
    @Test
    @DisplayName("issues and views every letter")
    void issuesEveryLetterItAuthors() {
      for (String permission : List.of(
          Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
          Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
          Permissions.MSD_LETTER_CREATE,
          Permissions.MSD_LETTER_VIEW,
          Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE,
          Permissions.LETTER_SIGNATORY_QUERY)) {
        assertTrue(granted.contains(permission), () -> "letter: " + permission);
      }
    }

    /**
     * §J's Signatory rows are {@code RU (dist)}: the one maintenance area this column edits without
     * being able to add to. Worth its own assertion because it is the only such asymmetry in §J, and the
     * Add button on that page had to be gated for it.
     */
    @Test
    @DisplayName("edits signature blocks but cannot add one")
    void editsSignatoriesWithoutCreating() {
      assertTrue(granted.contains(Permissions.MAINTAIN_SIGNATORIES_UPDATE));
      assertFalse(granted.contains(Permissions.MAINTAIN_SIGNATORIES_CREATE));
    }

    @Test
    @DisplayName("is internal: not client-scoped, and grants its column with no client number")
    void isInternalAndNeedsNoClientNumber() {
      assertFalse(Roles.isClientScoped(Roles.SCS_DIST_SCALING_MANAGER));

      List<String> authorities = authorityNames(Set.of(Roles.SCS_DIST_SCALING_MANAGER), Set.of());
      assertTrue(authorities.contains(Roles.SCS_DIST_SCALING_MANAGER));
      assertTrue(authorities.contains(Permissions.SCALER_CREATE));
    }
  }

  @Nested
  @DisplayName("regional scaling manager")
  class RegionalScalingManager {

    private final Set<String> granted = RolePermissions.forRole(Roles.SCS_REGIONAL_SCALING_MANAGER);

    /**
     * §3 gives {@code DSM} and {@code RSM} the same cells in all 79 rows; only six qualifiers differ
     * ({@code (dist)} against {@code (rgn)} on the Template and Signatory rows), and those are org-unit
     * breadth rather than permissions. Asserted with the reason attached so separating the two columns
     * has to be deliberate.
     */
    @Test
    @DisplayName("holds the same column as the district scaling manager")
    void holdsTheSameColumnAsTheDistrictScalingManager() {
      assertEquals(RolePermissions.forRole(Roles.SCS_DIST_SCALING_MANAGER), granted,
          "§3 gives DSM and RSM identical cells in all 79 rows; the only variation is the (dist) vs "
              + "(rgn) qualifier on §J's three Template and three Signatory rows, which is org-unit "
              + "breadth, not a different permission. If these columns must differ, say why in "
              + "RolePermissions.regionalScalingManager() and give it its own Set.of.");
    }

    /**
     * §4 names three capabilities the district summary does not. None of them adds a permission, and
     * this pins the two that could be mistaken for one — see
     * {@code RolePermissions.regionalScalingManager()}.
     */
    @Test
    @DisplayName("§4's extra bullets add nothing: inspections and exam results are already in §3")
    void section4ExtrasAddNothing() {
      // "Complete site-inspection reports" — §H gives both columns CR and RU
      assertTrue(granted.contains(Permissions.SCALE_SITE_INSPECTION_CREATE));
      assertTrue(granted.contains(Permissions.SCALE_SITE_INSPECTION_UPDATE));
      // "record exam results" — §C's Exams / Upgrades is CRU for both
      assertTrue(granted.contains(Permissions.SCALER_EXAM_CREATE));
      assertTrue(granted.contains(Permissions.SCALER_EXAM_UPDATE));
      // "schedule exams" has no surface in SCS at all, so nothing is granted for it; the nearest
      // reference-data screen stays authored-not-deleted like the rest of §J
      assertFalse(granted.contains(Permissions.MAINTAIN_EXAM_UPGRADES_DELETE));
    }

    @Test
    @DisplayName("is internal: not client-scoped, and grants its column with no client number")
    void isInternalAndNeedsNoClientNumber() {
      assertFalse(Roles.isClientScoped(Roles.SCS_REGIONAL_SCALING_MANAGER));

      List<String> authorities =
          authorityNames(Set.of(Roles.SCS_REGIONAL_SCALING_MANAGER), Set.of());
      assertTrue(authorities.contains(Roles.SCS_REGIONAL_SCALING_MANAGER));
      assertTrue(authorities.contains(Permissions.SCALER_CREATE));
    }
  }

  /**
   * The letter pages' signatory picker ({@code GET /letter-signature-blocks}) is gated on
   * {@link Permissions#LETTER_SIGNATORY_QUERY}. A role that can compose a letter but not load the picker
   * issues letters with no signatory — the nr-scs #286 follow-up, where the picker borrowed §J's
   * {@code MAINTAIN_SIGNATORIES_QUERY} and the Check Scaler, a letter author with no §J access, got an
   * empty list. Pinned in both directions so a future letter grant (or revocation) cannot drift.
   */
  @Nested
  @DisplayName("letter signatory lookup")
  class LetterSignatoryLookup {

    private static final List<String> LETTER_CREATE_VERBS = List.of(
        Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
        Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
        Permissions.MSD_LETTER_CREATE,
        Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE);

    @Test
    @DisplayName("the _LETTER_CREATE verb list above is every _LETTER_CREATE permission there is")
    void letterCreateVerbListIsComplete() {
      Set<String> declared = Permissions.ALL_PERMISSIONS.stream()
          .filter(permission -> permission.endsWith("_LETTER_CREATE"))
          .collect(Collectors.toSet());
      assertEquals(declared, Set.copyOf(LETTER_CREATE_VERBS),
          "a new _LETTER_CREATE verb must be added to LETTER_CREATE_VERBS so the invariant covers it");
    }

    @Test
    @DisplayName("held by exactly the roles holding at least one _LETTER_CREATE verb")
    void heldByExactlyTheLetterAuthors() {
      for (String role : Roles.ALL_ROLES) {
        Set<String> granted = RolePermissions.forRole(role);
        boolean authorsALetter = LETTER_CREATE_VERBS.stream().anyMatch(granted::contains);
        assertEquals(authorsALetter, granted.contains(Permissions.LETTER_SIGNATORY_QUERY),
            () -> role + (authorsALetter
                ? " can compose a letter but cannot load its signatory picker"
                : " holds the letter signatory lookup without any letter to compose"));
      }
    }

    @Test
    @DisplayName("today that is ADM, CHK, DSM and RSM")
    void heldByTheFourLetterRoles() {
      Set<String> holders = Roles.ALL_ROLES.stream()
          .filter(role -> RolePermissions.forRole(role).contains(Permissions.LETTER_SIGNATORY_QUERY))
          .collect(Collectors.toSet());
      assertEquals(Set.of(
          Roles.SCS_SYS_ADMIN,
          Roles.SCS_CHECK_SCALER,
          Roles.SCS_DIST_SCALING_MANAGER,
          Roles.SCS_REGIONAL_SCALING_MANAGER), holders);
    }

    @Test
    @DisplayName("the Check Scaler reads the letter lookup without any Maintain Signatories verb")
    void checkScalerGetsNoMaintenanceSignatoryVerb() {
      Set<String> granted = RolePermissions.forRole(Roles.SCS_CHECK_SCALER);
      assertTrue(granted.contains(Permissions.LETTER_SIGNATORY_QUERY));
      List<String> maintain = granted.stream()
          .filter(permission -> permission.startsWith("MAINTAIN_SIGNATORIES_"))
          .toList();
      assertTrue(maintain.isEmpty(), () -> "§J is - for CHK, yet it holds " + maintain);
    }
  }

  /**
   * The roll-out is complete: all eleven columns are filled in, so there is no longer a "recognised but
   * not enabled" state to assert. What replaces that block is the inverse — <b>no role may be left
   * holding welcome access alone</b>, which would now mean a column was emptied by accident rather than
   * awaiting its turn.
   *
   * <p>{@code Vocabulary.everyRoleHasAColumn} already fails on a role with <i>no</i> permissions; this
   * catches the subtler regression of a column collapsing back to the old staging value.
   */
  @Nested
  @DisplayName("the roll-out is complete")
  class RollOutComplete {

    @Test
    @DisplayName("no role holds WELCOME_READ alone any more")
    void noRoleIsWelcomeOnly() {
      List<String> welcomeOnly = Roles.ALL_ROLES.stream()
          .filter(role -> RolePermissions.forRole(role).equals(Set.of(Permissions.WELCOME_READ)))
          .sorted()
          .toList();

      assertTrue(welcomeOnly.isEmpty(),
          () -> "every role now has a real column; these hold welcome access alone, which means a "
              + "column was emptied rather than staged: " + welcomeOnly);
    }

    /**
     * None of the eleven was left unmapped. Ten are hand-authored columns in one of three shapes — its
     * own list, a shared list, or a shared list plus one permission — and {@code SCS_SYS_ADMIN} maps
     * straight to {@link Permissions#ALL_PERMISSIONS} rather than being a column at all.
     */
    @Test
    @DisplayName("all eleven roles hold a distinct, non-trivial column")
    void everyRoleHasARealColumn() {
      assertEquals(11, Roles.ALL_ROLES.size());

      for (String role : Roles.ALL_ROLES) {
        assertTrue(RolePermissions.forRole(role).size() > 1,
            () -> role + " holds one permission or none, so its column is not filled in");
      }
    }
  }

  @Nested
  @DisplayName("expansion and lookup")
  class Expansion {

    @Test
    @DisplayName("keeps the role authorities and appends the permissions they grant")
    void expandsRolesToRolesPlusPermissions() {
      List<String> authorities = authorityNames(Set.of(Roles.SCS_INDUSTRY_SCALER));
      assertEquals(Roles.SCS_INDUSTRY_SCALER, authorities.get(0));
      assertEquals(
          1 + RolePermissions.forRole(Roles.SCS_INDUSTRY_SCALER).size(), authorities.size());
      assertTrue(authorities.contains(Permissions.SCALER_READ));
    }

    /** A group SCS does not know must not widen access — fail closed. */
    @Test
    @DisplayName("an unrecognised role grants no permissions")
    void unrecognisedRoleGrantsNothing() {
      assertEquals(Set.of(), RolePermissions.forRole("SCS_MADE_UP"));
      assertEquals(List.of("SCS_MADE_UP"), authorityNames(Set.of("SCS_MADE_UP")));
    }

    @Test
    @DisplayName("multiple roles union their permissions without duplicates")
    void multipleRolesUnion() {
      Set<String> union =
          RolePermissions.forRoles(List.of(Roles.SCS_INDUSTRY_SCALER, Roles.SCS_CLERICAL));
      assertTrue(union.containsAll(RolePermissions.forRole(Roles.SCS_INDUSTRY_SCALER)));
      assertTrue(union.contains(Permissions.WELCOME_READ));

      List<String> authorities =
          authorityNames(Set.of(Roles.SCS_INDUSTRY_SCALER, Roles.SCS_CLERICAL));
      assertEquals(authorities.size(), Set.copyOf(authorities).size(), "no duplicate authorities");
    }

    @Test
    @DisplayName("null and empty inputs are handled without throwing")
    void handlesEmptyInput() {
      assertEquals(Set.of(), RolePermissions.forRoles(null));
      assertEquals(Set.of(), RolePermissions.forRoles(List.of()));
      assertTrue(RolePermissions.expandAuthorities(null, Set.of()).isEmpty());
      assertTrue(RolePermissions.expandAuthorities(List.of(), Set.of()).isEmpty());
    }
  }

  /**
   * A client-scoped role without a forest client number must grant nothing at all. It is the only
   * combination where a *recognised, enabled* role yields no permissions, and getting it wrong is a
   * data leak rather than a lockout: before this rule an Industry Scaler whose FAM group lacked the
   * {@code _<clientNumber>} suffix fell through to the unrestricted internal data scope.
   */
  @Nested
  @DisplayName("client-scoped roles require a client number")
  class ClientScopeRequired {

    private static final Set<String> NO_CLIENT = Set.of();

    /**
     * Nothing at all, role authority included. Keeping the role authority (as this did until
     * 2026-08-20) cleared {@code SecurityConfig}'s coarse {@code hasAnyAuthority(ALL_ROLES)} gate on
     * {@code /api/**}, so the caller reached method security on every endpoint and collected a 403 per
     * handler instead of being refused outright. With no authority at all the URL rule refuses first —
     * see {@code SecurityConfigAuthorizationTest.callerWithNoAuthoritiesIsForbiddenFromApi}.
     */
    @Test
    @DisplayName("Industry Scaler with no client number gets nothing at all, role authority included")
    void industryScalerWithoutClientGetsNothing() {
      List<String> authorities = authorityNames(Set.of(Roles.SCS_INDUSTRY_SCALER), NO_CLIENT);

      assertEquals(List.of(), authorities,
          "a client-scoped role held without a client number is a misconfigured FAM group, not a "
              + "lesser grade of access: it must grant no permission and no role authority, so the "
              + "/api gate refuses before any handler is reached");
      assertFalse(authorities.contains(Permissions.WELCOME_READ));
      assertFalse(authorities.contains(Permissions.SCALER_READ));
    }

    @Test
    @DisplayName("the same role with a client number grants its full column")
    void industryScalerWithClientGetsItsPermissions() {
      List<String> authorities = authorityNames(Set.of(Roles.SCS_INDUSTRY_SCALER));

      assertTrue(authorities.contains(Permissions.WELCOME_READ));
      assertTrue(authorities.contains(Permissions.SCALER_READ));
    }

    @Test
    @DisplayName("SCS_OWNER is client-scoped too, so the rule is not Industry-Scaler-specific")
    void ownerIsAlsoClientScoped() {
      assertEquals(List.of(), authorityNames(Set.of(Roles.SCS_OWNER), NO_CLIENT));
      assertTrue(authorityNames(Set.of(Roles.SCS_OWNER)).contains(Permissions.WELCOME_READ));
    }

    /**
     * Both external roles, held together with no client number, still come to nothing — so a user
     * carrying two misconfigured FAM groups cannot add up to access the way two half-permissions might.
     */
    @Test
    @DisplayName("holding both external roles without a client still grants nothing")
    void bothExternalRolesWithoutClientGrantNothing() {
      assertEquals(List.of(),
          authorityNames(Set.of(Roles.SCS_INDUSTRY_SCALER, Roles.SCS_OWNER), NO_CLIENT));
    }

    @Test
    @DisplayName("an internal role is unaffected by having no client number")
    void internalRoleNeedsNoClient() {
      assertTrue(authorityNames(Set.of(Roles.SCS_SYS_ADMIN), NO_CLIENT)
          .contains(Permissions.MAINTAIN_SYSTEM_UPDATE));
      assertTrue(authorityNames(Set.of(Roles.SCS_CLERICAL), NO_CLIENT)
          .contains(Permissions.WELCOME_READ));
    }

    /** Only the client-scoped role's contribution is withheld, not the whole authority set. */
    @Test
    @DisplayName("holding an internal role as well keeps that role's permissions")
    void mixedRolesKeepTheInternalRolesPermissions() {
      List<String> authorities =
          authorityNames(Set.of(Roles.SCS_INDUSTRY_SCALER, Roles.SCS_SYS_ADMIN), NO_CLIENT);

      assertTrue(authorities.contains(Permissions.MAINTAIN_SYSTEM_UPDATE),
          "the administrator role does not depend on a client number");
      assertTrue(authorities.contains(Roles.SCS_SYS_ADMIN),
          "the internal role authority is kept, so the coarse /api gate still admits them");
      assertFalse(authorities.contains(Roles.SCS_INDUSTRY_SCALER),
          "the misconfigured external role is dropped even here — it grants nothing either way, and "
              + "leaving it in would misreport what the user actually holds");
    }

    @Test
    @DisplayName("the withheld roles are reported so the 403s are explainable")
    void deniedRolesAreReported() {
      var industryScaler = List.of(new SimpleGrantedAuthority(Roles.SCS_INDUSTRY_SCALER));

      assertEquals(Set.of(Roles.SCS_INDUSTRY_SCALER),
          RolePermissions.rolesDeniedForMissingClient(industryScaler, NO_CLIENT));
      assertEquals(Set.of(),
          RolePermissions.rolesDeniedForMissingClient(industryScaler, Set.of("00001074")),
          "nothing is withheld once a client number is present");
      assertEquals(Set.of(),
          RolePermissions.rolesDeniedForMissingClient(
              List.of(new SimpleGrantedAuthority(Roles.SCS_SYS_ADMIN)), NO_CLIENT),
          "an internal role is never withheld");
    }

    /**
     * Guards the constant itself: {@code Roles.CLIENT_SCOPED_ROLES} must stay in step with the roles
     * FAM actually delivers client-scoped, which is what {@code JWTService} parses a suffix from.
     */
    @Test
    @DisplayName("exactly the external roles are client-scoped")
    void clientScopedRolesAreTheExternalOnes() {
      assertEquals(Set.of(Roles.SCS_INDUSTRY_SCALER, Roles.SCS_OWNER), Roles.CLIENT_SCOPED_ROLES);
      assertTrue(Roles.isClientScoped(Roles.SCS_INDUSTRY_SCALER));
      assertFalse(Roles.isClientScoped(Roles.SCS_SYS_ADMIN));
      assertFalse(Roles.isClientScoped(null));
    }
  }
}
