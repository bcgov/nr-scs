package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pins <b>which</b> permission gates <b>which</b> endpoint — the whole API surface, one row per
 * {@code METHOD /path}.
 *
 * <p><b>Why this exists alongside {@link ControllerAuthorizationConventionTest}.</b> That test proves
 * every handler carries a well-formed permission: present, a real name, and a write permission on a
 * write verb. What it cannot see is whether the permission named is the <i>correct</i> one. A handler
 * gated on {@code SCALE_SITE_READ} where the matrix says {@code SCALE_SITE_SUMMARY_READ} passes every
 * one of those checks and quietly hands a role a screen the matrix denies it — which is exactly the
 * distinction that keeps an Industry Scaler out of a scale-site Summary while still letting them open
 * the record.
 *
 * <p><b>Why a pinned table rather than a derivation.</b> The matrix in
 * the roles &amp; permissions matrix §3 is keyed by <i>function</i> ("Scaler
 * Record – Summary"), not by endpoint, and no mechanical rule maps one to the other — the split of
 * {@code R} into {@code _QUERY} and {@code _READ}, and judgement calls like granting
 * {@code SCALE_SITE_READ} while withholding {@code SCALE_SITE_SUMMARY_READ}, are decisions a
 * generator cannot re-derive. So the mapping is stated once, here, and this test makes any change to
 * it a deliberate, reviewable edit instead of a silent one. Reviewing a diff of this table against §3
 * is a five-minute job; noticing a one-word annotation change inside a 200-line controller diff is not.
 *
 * <p><b>Coverage this buys.</b> All eleven roles at once, and every role enabled later for free: the
 * table fixes endpoint→permission, {@code RolePermissions} fixes role→permission, so the two together
 * determine role→endpoint without a scenario per pair. The E2E role suites
 * ({@code e2e/features/sec/}) then only have to prove the layers compose at runtime — that the
 * meta-annotation templating actually resolves, that the scope interceptor and method security order
 * correctly — rather than re-walking the surface.
 *
 * <p><b>When this fails.</b> The message prints the exact rows added, removed, or changed, and a
 * paste-ready replacement block. Adding an endpoint <i>should</i> fail it once: check the new row
 * against §3, then paste. Never paste without reading — an unchecked paste turns this into a test that
 * records whatever the code does, which is worth nothing.
 */
class ControllerPermissionMapTest {

  private static final String CONTROLLER_PACKAGE = "ca.bc.gov.nrs.scs.backend.controller";

  /** Marks the handlers {@code SecurityConfig} deliberately leaves {@code permitAll}. */
  private static final String PERMIT_ALL = "(permit-all)";

  /**
   * The authorization surface: {@code METHOD /path} → the permission required to reach it. Paths are
   * as declared in the OpenAPI spec (the servlet adds the {@code /api} prefix at runtime).
   *
   * <p>Check a changed row against {@code roles-permissions.md} §3 before accepting it.
   */
  private static final Map<String, String> EXPECTED_PERMISSIONS = Map.ofEntries(
      Map.entry("DELETE /appointment-types/{appointmentTypeCode}", "MAINTAIN_APPOINTMENT_TYPES_DELETE"),
      Map.entry("DELETE /auth-clauses/{scaleMethodTypeCode}/{scaleMethodAuthClauseId}", "MAINTAIN_AUTHORIZATION_CLAUSES_DELETE"),
      Map.entry("DELETE /check-scales/{checkScaleId}", "CHECK_SCALE_DELETE"),
      Map.entry("DELETE /conditions/{scaleConditionClassCode}/{scaleAuthConditionId}", "MAINTAIN_CONDITIONS_DELETE"),
      Map.entry("DELETE /exam-upgrades/{classCode}/{typeId}", "MAINTAIN_EXAM_UPGRADES_DELETE"),
      Map.entry("DELETE /inspection-questions/{inspectionQuestionId}", "MAINTAIN_QUESTIONS_DELETE"),
      Map.entry("DELETE /scale-auth-templates/{templateId}", "MAINTAIN_TEMPLATES_DELETE"),
      Map.entry("DELETE /scale-site-authorizations/{scaleSiteAuthorizationId}", "SCALE_SITE_AUTHORIZATION_DELETE"),
      Map.entry("DELETE /scale-sites/inspection/{inspectionId}", "SCALE_SITE_INSPECTION_DELETE"),
      Map.entry("DELETE /scale-sites/{scaleSiteIdNmbr}/contacts/{clientContactId}", "SCALE_SITE_CONTACT_DELETE"),
      Map.entry("DELETE /scaler-authorizations/{scalerAuthorizationId}", "SCALER_AUTHORIZATION_DELETE"),
      Map.entry("DELETE /scalers/{scalerLicenceNo}", "SCALER_DELETE"),
      Map.entry("DELETE /scalers/{scalerLicenceNo}/appointments/{scalerLicenceAttributeId}", "SCALER_APPOINTMENT_DELETE"),
      Map.entry("DELETE /scalers/{scalerLicenceNo}/exams/{scalerTrainingTypeId}", "SCALER_EXAM_DELETE"),
      Map.entry("DELETE /scalers/{scalerLicenceNo}/performance-remarks/{scalerPerformanceRemarkId}", "SCALER_PERFORMANCE_REMARK_DELETE"),
      Map.entry("DELETE /signature-blocks/{scaleSignatoryBlockId}", "MAINTAIN_SIGNATORIES_DELETE"),
      Map.entry("DELETE /summary-check-scales/{checkScaleId}", "SUMMARY_CHECK_SCALE_DELETE"),
      Map.entry("DELETE /summary-check-scales/{checkScaleId}/spg-rows", "SUMMARY_CHECK_SCALE_UPDATE"),
      Map.entry("DELETE /valid-licence-attributes/{scaleGradingSystemCode}/{scalerAppointmentType}", "MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE"),
      Map.entry("GET /appointment-type-lov", "LOV_READ"),
      Map.entry("GET /appointment-types", "MAINTAIN_APPOINTMENT_TYPES_QUERY"),
      Map.entry("GET /auth-clauses", "MAINTAIN_AUTHORIZATION_CLAUSES_QUERY"),
      Map.entry("GET /auth-clauses/{scaleMethodTypeCode}/{scaleMethodAuthClauseId}", "MAINTAIN_AUTHORIZATION_CLAUSES_READ"),
      Map.entry("GET /check-scales/search", "CHECK_SCALE_QUERY"),
      Map.entry("GET /client-contacts/search", "SCALE_SITE_CONTACT_CREATE"),
      Map.entry("GET /clients/search", "CLIENT_QUERY"),
      Map.entry("GET /conditions", "MAINTAIN_CONDITIONS_QUERY"),
      Map.entry("GET /conditions/{scaleConditionClassCode}/{scaleAuthConditionId}", "MAINTAIN_CONDITIONS_READ"),
      Map.entry("GET /exam-upgrades", "MAINTAIN_EXAM_UPGRADES_QUERY"),
      Map.entry("GET /exam-upgrades/{classCode}/{typeId}", "MAINTAIN_EXAM_UPGRADES_READ"),
      Map.entry("GET /grading-code-appointment-type-lov", "LOV_READ"),
      Map.entry("GET /haul-mark-authorizations/search", "MSD_QUERY"),
      Map.entry("GET /timber-marks/exists", "REPORT_READ"),
      Map.entry("GET /health", "SYSTEM_ADMIN"),
      Map.entry("GET /inspection-questions", "MAINTAIN_QUESTIONS_QUERY"),
      Map.entry("GET /inspection-questions/{inspectionQuestionId}", "MAINTAIN_QUESTIONS_READ"),
      Map.entry("GET /letter-signature-blocks", "LETTER_SIGNATORY_QUERY"),
      Map.entry("GET /mark-site-designations", "MSD_QUERY"),
      Map.entry("GET /mark-site-designations/search", "MSD_QUERY"),
      Map.entry("GET /mark-site-designations/workbench", "WORKBENCH_QUERY"),
      Map.entry("GET /mark-site-designations/{authorizationId}", "MSD_READ"),
      Map.entry("GET /mark-site-designations/{authorizationId}/letter", "MSD_LETTER_VIEW"),
      Map.entry("GET /region-district-lov", "LOV_READ"),
      Map.entry("GET /region-district-rollup-lov", "LOV_READ"),
      Map.entry("GET /scale-auth-templates", "MAINTAIN_TEMPLATES_QUERY"),
      Map.entry("GET /scale-auth-templates/{templateId}", "MAINTAIN_TEMPLATES_READ"),
      Map.entry("GET /scale-method-type-lov", "LOV_READ"),
      Map.entry("GET /scale-site-authorizations/conditions", "SCALE_SITE_AUTHORIZATION_CREATE"),
      Map.entry("GET /scale-site-authorizations/templates/{templateId}/conditions", "SCALE_SITE_AUTHORIZATION_CREATE"),
      Map.entry("GET /scale-site-authorizations/workbench", "WORKBENCH_QUERY"),
      Map.entry("GET /scale-site-authorizations/{scaleSiteAuthorizationId}", "SCALE_SITE_AUTHORIZATION_READ"),
      Map.entry("GET /scale-site-authorizations/{scaleSiteAuthorizationId}/letter", "SCALE_SITE_AUTHORIZATION_LETTER_VIEW"),
      Map.entry("GET /scale-site-risk-assessments/search", "SCALE_SITE_RISK_ASSESSMENT_QUERY"),
      Map.entry("GET /scale-site-risk-assessments/{riskQuestionnaireId}", "SCALE_SITE_RISK_ASSESSMENT_READ"),
      Map.entry("GET /scale-sites/inspection/search", "SCALE_SITE_INSPECTION_QUERY"),
      Map.entry("GET /scale-sites/inspection/{inspectionId}", "SCALE_SITE_INSPECTION_READ"),
      Map.entry("GET /scale-sites/inspection/{inspectionId}/edit", "SCALE_SITE_INSPECTION_UPDATE"),
      Map.entry("GET /scale-sites/search", "SCALE_SITE_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/activity-summary", "SCALE_SITE_ACTIVITY_READ"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/authorizations", "SCALE_SITE_AUTHORIZATION_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/authorized-scalers", "SCALE_SITE_AUTHORIZED_SCALER_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/check-scales", "SCALE_SITE_CHECK_SCALE_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/contacts", "SCALE_SITE_CONTACT_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/contacts/{clientContactId}", "SCALE_SITE_CONTACT_READ"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/inspections", "SCALE_SITE_INSPECTION_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/inspections/create", "SCALE_SITE_INSPECTION_CREATE"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/mark-site-designations", "SCALE_SITE_MSD_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/owner", "SCALE_SITE_CONTACT_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/risk-assessments/create-init", "SCALE_SITE_RISK_ASSESSMENT_CREATE"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/risk-ratings", "SCALE_SITE_RISK_RATING_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/software", "SCALE_SITE_SOFTWARE_QUERY"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/summary", "SCALE_SITE_SUMMARY_READ"),
      Map.entry("GET /scale-sites/{scaleSiteIdNmbr}/tombstone", "SCALE_SITE_READ"),
      Map.entry("GET /scaler-authorizations/conditions", "SCALER_AUTHORIZATION_CREATE"),
      Map.entry("GET /scaler-authorizations/templates/{templateId}/conditions", "SCALER_AUTHORIZATION_CREATE"),
      Map.entry("GET /scaler-authorizations/workbench", "WORKBENCH_QUERY"),
      Map.entry("GET /scaler-authorizations/{scalerAuthorizationId}", "SCALER_AUTHORIZATION_READ"),
      Map.entry("GET /scaler-authorizations/{scalerAuthorizationId}/letter", "SCALER_AUTHORIZATION_LETTER_VIEW"),
      Map.entry("GET /scaler-risk-assessments/search", "SCALER_RISK_ASSESSMENT_QUERY"),
      Map.entry("GET /scaler-risk-assessments/{riskQuestionnaireId}", "SCALER_RISK_ASSESSMENT_READ"),
      Map.entry("GET /scaler-training-type-lov", "LOV_READ"),
      Map.entry("GET /scalers/search", "SCALER_QUERY"),
      Map.entry("GET /scalers/{scalerLicenceNo}", "SCALER_READ"),
      Map.entry("GET /scalers/{scalerLicenceNo}/address", "SCALER_ADDRESS_READ"),
      Map.entry("GET /scalers/{scalerLicenceNo}/appointments", "SCALER_APPOINTMENT_QUERY"),
      Map.entry("GET /scalers/{scalerLicenceNo}/authorizations", "SCALER_AUTHORIZATION_QUERY"),
      Map.entry("GET /scalers/{scalerLicenceNo}/check-scales", "SCALER_CHECK_SCALE_QUERY"),
      Map.entry("GET /scalers/{scalerLicenceNo}/exams", "SCALER_EXAM_QUERY"),
      Map.entry("GET /scalers/{scalerLicenceNo}/performance-remarks", "SCALER_PERFORMANCE_REMARK_QUERY"),
      Map.entry("GET /scalers/{scalerLicenceNo}/risk-assessments/create-init", "SCALER_RISK_ASSESSMENT_CREATE"),
      Map.entry("GET /scalers/{scalerLicenceNo}/risk-ratings", "SCALER_RISK_RATING_QUERY"),
      Map.entry("GET /scalers/{scalerLicenceNo}/summary", "SCALER_READ"),
      Map.entry("GET /scalers/{scalerLicenceNo}/summary-check-scales", "SCALER_CHECK_SCALE_QUERY"),
      Map.entry("GET /scalers/{scalerLicenceNo}/tombstone", "SCALER_READ"),
      Map.entry("GET /signature-blocks", "MAINTAIN_SIGNATORIES_QUERY"),
      Map.entry("GET /signature-blocks/{scaleSignatoryBlockId}", "MAINTAIN_SIGNATORIES_READ"),
      Map.entry("GET /species-product-grade-xref-lov", "LOV_READ"),
      Map.entry("GET /static-lov", "LOV_READ"),
      Map.entry("GET /system-settings/{settingKey}", "MAINTAIN_SYSTEM_READ"),
      Map.entry("GET /system-status", "(permit-all)"),
      Map.entry("GET /templates/{filterField}", "LOV_READ"),
      Map.entry("GET /valid-licence-attributes", "MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY"),
      Map.entry("GET /valid-licence-attributes/{scaleGradingSystemCode}/{scalerAppointmentType}", "MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ"),
      Map.entry("GET /welcome", "WELCOME_READ"),
      Map.entry("PATCH /scalers/{scalerLicenceNo}/licence-cancelled-date", "SCALER_LICENCE_CANCEL"),
      Map.entry("POST /appointment-types", "MAINTAIN_APPOINTMENT_TYPES_CREATE"),
      Map.entry("POST /auth-clauses", "MAINTAIN_AUTHORIZATION_CLAUSES_CREATE"),
      Map.entry("POST /cache/evict", "SYSTEM_ADMIN"),
      Map.entry("POST /check-scales/create", "CHECK_SCALE_CREATE"),
      Map.entry("POST /check-scales/validate", "CHECK_SCALE_CREATE"),
      Map.entry("POST /check-scales/{checkScaleId}/advisory-letter", "CHECK_SCALE_ADVISORY_LETTER_CREATE"),
      Map.entry("POST /conditions", "MAINTAIN_CONDITIONS_CREATE"),
      Map.entry("POST /exam-upgrades", "MAINTAIN_EXAM_UPGRADES_CREATE"),
      Map.entry("POST /inspection-questions", "MAINTAIN_QUESTIONS_CREATE"),
      Map.entry("POST /mark-site-designations", "MSD_CREATE"),
      Map.entry("POST /mark-site-designations/{authorizationId}/letter", "MSD_LETTER_CREATE"),
      Map.entry("POST /mark-site-designations/{authorizationId}/renew", "WORKBENCH_CREATE"),
      Map.entry("POST /mark-site-designations/{authorizationId}/workbench/remove", "WORKBENCH_UPDATE"),
      Map.entry("POST /reports/designated-marks-exception", "REPORT_READ"),
      Map.entry("POST /reports/district-check-scale-performance", "REPORT_READ"),
      Map.entry("POST /reports/district-site-inspection-performance", "REPORT_READ"),
      Map.entry("POST /reports/mark-site-designation", "REPORT_READ"),
      Map.entry("POST /reports/scale-site-compliance", "REPORT_READ"),
      Map.entry("POST /reports/scale-site-register", "REPORT_READ"),
      Map.entry("POST /reports/scaler-register", "REPORT_READ"),
      Map.entry("POST /reports/scaling-administration", "REPORT_READ"),
      Map.entry("POST /reports/scaling-exception", "REPORT_READ"),
      Map.entry("POST /scale-auth-templates", "MAINTAIN_TEMPLATES_CREATE"),
      Map.entry("POST /scale-site-authorizations", "SCALE_SITE_AUTHORIZATION_CREATE"),
      Map.entry("POST /scale-site-authorizations/{authorizationId}/renew", "WORKBENCH_CREATE"),
      Map.entry("POST /scale-site-authorizations/{authorizationId}/workbench/remove", "WORKBENCH_UPDATE"),
      Map.entry("POST /scale-site-authorizations/{scaleSiteAuthorizationId}/letter", "SCALE_SITE_AUTHORIZATION_LETTER_CREATE"),
      Map.entry("POST /scale-sites", "SCALE_SITE_CREATE"),
      Map.entry("POST /scale-sites/{scaleSiteIdNmbr}/contacts", "SCALE_SITE_CONTACT_CREATE"),
      Map.entry("POST /scale-sites/{scaleSiteIdNmbr}/inspections", "SCALE_SITE_INSPECTION_CREATE"),
      Map.entry("POST /scale-sites/{scaleSiteIdNmbr}/risk-assessments", "SCALE_SITE_RISK_ASSESSMENT_CREATE"),
      Map.entry("POST /scaler-authorizations", "SCALER_AUTHORIZATION_CREATE"),
      Map.entry("POST /scaler-authorizations/{authorizationId}/renew", "WORKBENCH_CREATE"),
      Map.entry("POST /scaler-authorizations/{authorizationId}/workbench/remove", "WORKBENCH_UPDATE"),
      Map.entry("POST /scaler-authorizations/{scalerAuthorizationId}/letter", "SCALER_AUTHORIZATION_LETTER_CREATE"),
      Map.entry("POST /scalers", "SCALER_CREATE"),
      Map.entry("POST /scalers/{scalerLicenceNo}/appointments", "SCALER_APPOINTMENT_CREATE"),
      Map.entry("POST /scalers/{scalerLicenceNo}/exams", "SCALER_EXAM_CREATE"),
      Map.entry("POST /scalers/{scalerLicenceNo}/performance-remarks", "SCALER_PERFORMANCE_REMARK_CREATE"),
      Map.entry("POST /scalers/{scalerLicenceNo}/risk-assessments", "SCALER_RISK_ASSESSMENT_CREATE"),
      Map.entry("POST /signature-blocks", "MAINTAIN_SIGNATORIES_CREATE"),
      Map.entry("POST /summary-check-scales/create", "SUMMARY_CHECK_SCALE_CREATE"),
      Map.entry("POST /summary-check-scales/{checkScaleId}/spg-rows", "SUMMARY_CHECK_SCALE_UPDATE"),
      Map.entry("POST /valid-licence-attributes", "MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE"),
      Map.entry("PUT /appointment-types/{appointmentTypeCode}", "MAINTAIN_APPOINTMENT_TYPES_UPDATE"),
      Map.entry("PUT /auth-clauses/{scaleMethodTypeCode}/{scaleMethodAuthClauseId}", "MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE"),
      Map.entry("PUT /check-scales/{checkScaleId}", "CHECK_SCALE_UPDATE"),
      Map.entry("PUT /conditions/{scaleConditionClassCode}/{scaleAuthConditionId}", "MAINTAIN_CONDITIONS_UPDATE"),
      Map.entry("PUT /exam-upgrades/{classCode}/{typeId}", "MAINTAIN_EXAM_UPGRADES_UPDATE"),
      Map.entry("PUT /inspection-questions/{inspectionQuestionId}", "MAINTAIN_QUESTIONS_UPDATE"),
      Map.entry("PUT /mark-site-designations/{authorizationId}", "MSD_UPDATE"),
      Map.entry("PUT /scale-auth-templates/{templateId}", "MAINTAIN_TEMPLATES_UPDATE"),
      Map.entry("PUT /scale-site-authorizations/{scaleSiteAuthorizationId}", "SCALE_SITE_AUTHORIZATION_UPDATE"),
      Map.entry("PUT /scale-site-risk-assessments/{riskQuestionnaireId}", "SCALE_SITE_RISK_ASSESSMENT_UPDATE"),
      Map.entry("PUT /scale-sites/inspection/{inspectionId}", "SCALE_SITE_INSPECTION_UPDATE"),
      Map.entry("PUT /scale-sites/{scaleSiteIdNmbr}", "SCALE_SITE_UPDATE"),
      Map.entry("PUT /scale-sites/{scaleSiteIdNmbr}/contacts/{clientContactId}", "SCALE_SITE_CONTACT_UPDATE"),
      Map.entry("PUT /scaler-authorizations/{scalerAuthorizationId}", "SCALER_AUTHORIZATION_UPDATE"),
      Map.entry("PUT /scaler-risk-assessments/{riskQuestionnaireId}", "SCALER_RISK_ASSESSMENT_UPDATE"),
      Map.entry("PUT /scalers/{scalerLicenceNo}", "SCALER_UPDATE"),
      Map.entry("PUT /scalers/{scalerLicenceNo}/appointments/{scalerLicenceAttributeId}", "SCALER_APPOINTMENT_UPDATE"),
      Map.entry("PUT /scalers/{scalerLicenceNo}/exams/{scalerTrainingTypeId}", "SCALER_EXAM_UPDATE"),
      Map.entry("PUT /scalers/{scalerLicenceNo}/performance-remarks/{scalerPerformanceRemarkId}", "SCALER_PERFORMANCE_REMARK_UPDATE"),
      Map.entry("PUT /signature-blocks/{scaleSignatoryBlockId}", "MAINTAIN_SIGNATORIES_UPDATE"),
      Map.entry("PUT /summary-check-scales/{checkScaleId}", "SUMMARY_CHECK_SCALE_UPDATE"),
      Map.entry("PUT /system-settings/{settingKey}", "MAINTAIN_SYSTEM_UPDATE"),
      Map.entry("PUT /valid-licence-attributes/{scaleGradingSystemCode}/{scalerAppointmentType}", "MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE"));

  @Test
  @DisplayName("every endpoint is gated on exactly the permission the matrix assigns it")
  void endpointPermissionsMatchThePinnedMap() throws Exception {
    Map<String, String> actual = actualPermissionMap();

    List<String> added = new ArrayList<>();
    List<String> changed = new ArrayList<>();
    List<String> removed = new ArrayList<>();

    actual.forEach((endpoint, permission) -> {
      String expected = EXPECTED_PERMISSIONS.get(endpoint);
      if (expected == null) {
        added.add(endpoint + " -> " + permission);
      } else if (!expected.equals(permission)) {
        changed.add(endpoint + " : expected " + expected + " but is " + permission);
      }
    });
    EXPECTED_PERMISSIONS.keySet().stream()
        .filter(endpoint -> !actual.containsKey(endpoint))
        .forEach(removed::add);

    assertTrue(added.isEmpty() && changed.isEmpty() && removed.isEmpty(),
        () -> "The endpoint -> permission map changed. Check each row below against "
            + "roles-permissions.md §3 before updating EXPECTED_PERMISSIONS.\n"
            + (changed.isEmpty() ? "" : "\nCHANGED (a role's access just moved):\n  "
                + String.join("\n  ", changed))
            + (added.isEmpty() ? "" : "\nADDED (new endpoint — confirm the permission is right):\n  "
                + String.join("\n  ", added))
            + (removed.isEmpty() ? "" : "\nREMOVED (endpoint gone — delete the row):\n  "
                + String.join("\n  ", removed))
            + "\n\nPaste-ready replacement:\n" + asJavaTable(actual));
  }

  /** The live map, read off the annotations: {@code METHOD /path} → permission. */
  private static Map<String, String> actualPermissionMap() throws ClassNotFoundException {
    Map<String, String> map = new TreeMap<>();
    for (Class<?> controller : controllers()) {
      for (Method handler : handlers(controller)) {
        RequestMapping mapping = mappingOf(handler);
        if (mapping == null) {
          continue;
        }
        RequiresPermission annotation = handler.getAnnotation(RequiresPermission.class);
        if (annotation == null) {
          annotation = controller.getAnnotation(RequiresPermission.class);
        }
        String permission = annotation == null ? PERMIT_ALL : annotation.value();
        for (RequestMethod httpMethod : mapping.method()) {
          for (String path : mapping.value()) {
            map.put(httpMethod + " " + path, permission);
          }
        }
      }
    }
    return map;
  }

  /**
   * The mapping declared for a handler. SCS controllers implement generated {@code *Api} interfaces
   * that carry the {@code @RequestMapping}, so the implementing method usually has none of its own and
   * the declaring interface has to be searched.
   */
  private static RequestMapping mappingOf(Method method) {
    RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
    if (mapping != null) {
      return mapping;
    }
    for (Class<?> apiInterface : method.getDeclaringClass().getInterfaces()) {
      try {
        Method declared = apiInterface.getMethod(method.getName(), method.getParameterTypes());
        RequestMapping declaredMapping =
            AnnotatedElementUtils.findMergedAnnotation(declared, RequestMapping.class);
        if (declaredMapping != null) {
          return declaredMapping;
        }
      } catch (NoSuchMethodException notOnThisInterface) {
        // A controller may implement several interfaces; only one declares the handler.
      }
    }
    return null;
  }

  private static List<Class<?>> controllers() throws ClassNotFoundException {
    ClassPathScanningCandidateComponentProvider scanner =
        new ClassPathScanningCandidateComponentProvider(false);
    scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

    List<Class<?>> controllers = new ArrayList<>();
    for (var candidate : scanner.findCandidateComponents(CONTROLLER_PACKAGE)) {
      controllers.add(Class.forName(candidate.getBeanClassName()));
    }
    return controllers;
  }

  private static List<Method> handlers(Class<?> controller) {
    return Arrays.stream(controller.getDeclaredMethods())
        .filter(method -> Modifier.isPublic(method.getModifiers()) && !method.isSynthetic())
        .toList();
  }

  /** Renders the live map as the Java literal to paste back into {@link #EXPECTED_PERMISSIONS}. */
  private static String asJavaTable(Map<String, String> map) {
    StringBuilder out = new StringBuilder("  private static final Map<String, String> "
        + "EXPECTED_PERMISSIONS = Map.ofEntries(\n");
    List<String> rows = map.entrySet().stream()
        .map(e -> "      Map.entry(\"" + e.getKey() + "\", \"" + e.getValue() + "\")")
        .toList();
    out.append(String.join(",\n", rows)).append(");\n");
    return out.toString();
  }

  @Test
  @DisplayName("the scan finds the whole API surface (guards against a vacuous pass)")
  void scanFindsTheApiSurface() throws Exception {
    // An empty or partial scan would make the map check pass by describing nothing.
    int found = actualPermissionMap().size();
    assertTrue(found >= 150,
        () -> "Expected the endpoint scan to find the full API surface; found " + found
            + " endpoints.");
  }
}
