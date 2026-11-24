package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.GradingCodeAppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictRollupLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodTypeLov;
import ca.bc.gov.nrs.scs.backend.model.ScalerTrainingTypeLov;
import ca.bc.gov.nrs.scs.backend.model.SpeciesProductGradeXref;
import ca.bc.gov.nrs.scs.backend.model.StaticLov;
import ca.bc.gov.nrs.scs.backend.repository.LovRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class LovService {

  private final LovRepository repository;

  public LovService(LovRepository repository) {
    this.repository = repository;
  }

  @Cacheable("lov-region-district")
  public List<RegionDistrictLov> getRegionDistrictLov(
      String code,
      String description
  ) {
    return repository.getRegionDistrictLov(code, description);
  }

  @Cacheable("lov-region-district-rollup")
  public List<RegionDistrictRollupLov> getRegionDistrictRollupLov(
      Long orgUnitNo,
      String description,
      Long rollupRegionNo
  ) {
    return repository.getRegionDistrictRollupLov(orgUnitNo, description, rollupRegionNo);
  }

  @Cacheable("lov-appointment-type")
  public List<AppointmentTypeLov> getAppointmentTypeLov(String code, String description) {
    return repository.getAppointmentTypeLov(code, description);
  }

  @Cacheable("lov-scale-method-type")
  public List<ScaleMethodTypeLov> getScaleMethodTypeLov(String code, String description) {
    return repository.getScaleMethodTypeLov(code, description);
  }

  @Cacheable("lov-grading-code-appointment-type")
  public List<GradingCodeAppointmentTypeLov> getGradingCodeAppointmentTypeLov() {
    return repository.getGradingCodeAppointmentTypeLov();
  }

  /** Returns the grading-code LOV indexed by {@code "gradingCode~appointmentType"} for O(1) enrichment lookups. */
  @Cacheable("lov-grading-code-appointment-type-map")
  public Map<String, GradingCodeAppointmentTypeLov> getGradingCodeAppointmentTypeLovMap() {
    return repository.getGradingCodeAppointmentTypeLov().stream()
        .filter(l -> l.getScaleGradingSystemCode() != null && l.getScalerAppointmentType() != null)
        .collect(Collectors.toMap(
            l -> gradingLovKey(getNullable(l.getScaleGradingSystemCode()), getNullable(l.getScalerAppointmentType())),
            l -> l,
            (a, b) -> a));
  }

  public static String gradingLovKey(String gradingCode, String apptType) {
    return gradingCode + "~" + apptType;
  }

  @Cacheable(value = "lov-scaler-training-type")
  public List<ScalerTrainingTypeLov> getScalerTrainingTypeLov() {
    return repository.getScalerTrainingTypeLov();
  }

  @Cacheable("lov-species-product-grade-xref")
  public List<SpeciesProductGradeXref> getSpeciesProductGradeXref() {
    return repository.getSpeciesProductGradeXref();
  }

  @Cacheable("lov-static")
  public List<StaticLov> getStaticLov(String tableKey) {
    List<StaticLov> rows = repository.getStaticLov(tableKey);
    String normalizedTableKey = trimToNull(tableKey);

    if (normalizedTableKey == null) {
      return rows;
    }

    return rows.stream()
        .filter(row -> matchesTableKey(row, normalizedTableKey))
        .toList();
  }

  @Cacheable("lov-template")
  public List<StaticLov> getTemplateLov(String filterField) {
    return repository.getTemplateLov(filterField);
  }

  /**
   * Builds a code &rarr; description map for a static LOV. Codes are upper-cased (LOV codes are
   * looked up case-insensitively); a blank/absent description maps to {@code null} so callers can
   * fall back to the raw code rather than render an empty label. Shared by the tabs that decode
   * LOV-backed columns server-side (e.g. inspection question answers, scaler performance remarks).
   */
  @Cacheable("lov-static-description-map")
  public Map<String, String> getStaticLovDescriptionMap(String tableKey) {
    Map<String, String> descriptions = new LinkedHashMap<>();
    for (StaticLov row : getStaticLov(tableKey)) {
      if (row == null || row.getCode() == null || !row.getCode().isPresent()) {
        continue;
      }
      String code = upperOrNull(row.getCode().get());
      if (code != null) {
        descriptions.put(code, trimToNull(getNullable(row.getDescription())));
      }
    }
    return descriptions;
  }

  @Cacheable(value = "lov-appointment-type-acting")
  public Map<String, String> getAppointmentTypeActingMap() {
    return repository.getAppointmentTypeActingMap();
  }

  private boolean matchesTableKey(StaticLov row, String tableKey) {
    if (row == null || row.getTableKey() == null || !row.getTableKey().isPresent()) {
      return false;
    }

    String rowTableKey = trimToNull(row.getTableKey().get());
    return rowTableKey != null && rowTableKey.equalsIgnoreCase(tableKey);
  }
}
