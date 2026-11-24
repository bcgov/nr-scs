package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.GradingCodeAppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictRollupLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodTypeLov;
import ca.bc.gov.nrs.scs.backend.model.ScalerTrainingTypeLov;
import ca.bc.gov.nrs.scs.backend.model.SpeciesProductGradeXref;
import ca.bc.gov.nrs.scs.backend.model.StaticLov;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LovRepository extends AbstractRepository {

  private static final String STATIC_LOV_PKG = "scs_static_lov_pkg";


  static final String DESCRIPTION = "description";

  public LovRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<RegionDistrictLov> getRegionDistrictLov(
      String code,
      String description
  ) {
      return queryCursorCall(buildSearchRecsCall("scs_reg_dist_lov_vw_pkg", 2),
          cs -> ParameterBinder.afterReturn(cs)
              .string(code)
              .string(description),
          rs -> {
            List<RegionDistrictLov> out = new ArrayList<>();
            while (rs.next()) {
              out.add(new RegionDistrictLov()
                  .code(rs.getString("code"))
                  .description(rs.getString(DESCRIPTION)));
            }
            return out;
          });
  }

  public List<RegionDistrictRollupLov> getRegionDistrictRollupLov(
      Long orgUnitNo,
      String description,
      Long rollupRegionNo) {
      return queryCursorCall(buildSearchRecsCall("SCS_REG_DIST_ALL_LOV_VW_PKG", 3),
          cs -> {
            cs.setObject(2, orgUnitNo, Types.NUMERIC);
            cs.setString(3, description);
            cs.setObject(4, rollupRegionNo, Types.NUMERIC);
          },
          rs -> {
            List<RegionDistrictRollupLov> out = new ArrayList<>();
            while (rs.next()) {
              out.add(new RegionDistrictRollupLov()
                  .code(asLong(rs, "code"))
                  .description(rs.getString(DESCRIPTION))
                  .rollupRegionNo(asLong(rs, "rollup_region_no"))
                  .orgUnitCode(rs.getString("org_unit_code")));
            }
            return out;
          });
  }

  public List<AppointmentTypeLov> getAppointmentTypeLov(String code, String description) {
    return queryCursorCall(buildSearchRecsCall("scs_sclr_appt_lov_vw_pkg", 2),
        cs -> ParameterBinder.afterReturn(cs)
            .string(code)
            .string(description),
        rs -> {
          List<AppointmentTypeLov> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new AppointmentTypeLov()
                .code(rs.getString("code"))
                .description(rs.getString(DESCRIPTION)));
          }
          return out;
        });
  }

  public List<ScaleMethodTypeLov> getScaleMethodTypeLov(String code, String description) {
    return queryCursorCall(buildSearchRecsCall("SCS_SCALE_METHOD_TYP_CD_VW_PKG", 6),
        cs -> ParameterBinder.afterReturn(cs)
            .string(code)
            .string(description)
            .nullDate()
            .nullDate()
            .intValue(2)
            .intValue(0),
        rs -> {
          List<ScaleMethodTypeLov> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new ScaleMethodTypeLov()
                .code(rs.getString(1))
                .description(rs.getString(2))
                .effectiveDate(rs.getDate(3) != null ? rs.getDate(3).toLocalDate() : null)
                .expiryDate(rs.getDate(4) != null ? rs.getDate(4).toLocalDate() : null));
          }
          return out;
        });
  }

  public List<GradingCodeAppointmentTypeLov> getGradingCodeAppointmentTypeLov() {
    return queryCursorCall(buildSearchRecsCall("scs_sgcd_sapt_lov_vw_pkg", 6),
        cs -> ParameterBinder.afterReturn(cs)
            .nullString()
            .nullString()
            .nullString()
            .nullString()
            .nullDate()
            .nullDate(),
        rs -> {
          List<GradingCodeAppointmentTypeLov> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new GradingCodeAppointmentTypeLov()
                .code(rs.getString("code"))
                .description(rs.getString(DESCRIPTION))
                .scaleGradingSystemCode(rs.getString("scale_grading_system_code"))
                .scalerAppointmentType(rs.getString("scaler_appointment_type")));
          }
          return out;
        });
  }

  /**
   * Returns a map of scalerAppointmentType → actingInd (Y/N) by reading all
   * records from SCS_SCALER_APPOINTMENT_TYP_PKG.search_recs.
   */
  public Map<String, String> getAppointmentTypeActingMap() {
    return queryCursorCall(buildSearchRecsCall("SCS_SCALER_APPOINTMENT_TYP_PKG", 7),
        cs -> ParameterBinder.afterReturn(cs)
            .nullString() // scalerAppointmentType
            .nullString() // description
            .nullString() // actingInd
            .nullDate()   // effectiveDate
            .nullDate()   // expiryDate
            .nullString() // entryUserid
            .nullString(), // updateUserid
        rs -> {
          Map<String, String> map = new HashMap<>();
          while (rs.next()) {
            String code = rs.getString(1);   // scaler_appointment_type
            String acting = rs.getString(3); // acting_ind
            if (code != null) {
              map.put(code, acting);
            }
          }
          return map;
        });
  }

  public List<ScalerTrainingTypeLov> getScalerTrainingTypeLov() {
    return queryCursorCall(buildSearchRecsCall("scs_scty_lov_vw_pkg", 4),
        cs -> ParameterBinder.afterReturn(cs)
            .nullString()
            .nullString()
            .nullString()
            .nullString(),
        rs -> {
          List<ScalerTrainingTypeLov> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new ScalerTrainingTypeLov()
                .code(rs.getString("code"))
                .description(rs.getString(DESCRIPTION))
                .scalerTrainingClassCode(rs.getString("scaler_training_class_code"))
                .licenceAccreditInd(rs.getString("licence_accredit_ind")));
          }
          return out;
        });
  }

  /**
   * Returns every active valid species/product/grade combination from
   * {@code scs_species_prdct_grd_xrf_pkg.search_active_recs}. All five IN params are bound null,
   * which the package treats as "match all", returning the full set of active combinations used
   * to filter the Product/Grade dropdowns on the check-scale forms.
   */
  public List<SpeciesProductGradeXref> getSpeciesProductGradeXref() {
    return queryCursorCall(buildFunctionCall("scs_species_prdct_grd_xrf_pkg", "search_active_recs", 5),
        cs -> ParameterBinder.afterReturn(cs)
            .nullString()   // p_scale_grade_code
            .nullString()   // p_scale_species_code
            .nullString()   // p_scale_product_code
            .nullDate()     // p_effective_date
            .nullDate(),    // p_expiry_date
        rs -> {
          List<SpeciesProductGradeXref> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new SpeciesProductGradeXref()
                .scaleSpeciesCode(rs.getString("scale_species_code"))
                .scaleProductCode(rs.getString("scale_product_code"))
                .scaleGradeCode(rs.getString("scale_grade_code")));
          }
          return out;
        });
  }

  public List<StaticLov> getStaticLov(String tableKey) {
    return queryCursorCall("{ ? = call " + STATIC_LOV_PKG + ".static_lov_recs(?) }",
        cs -> ParameterBinder.afterReturn(cs)
            .string(tableKey),
        rs -> {
          List<StaticLov> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new StaticLov()
                .tableKey(rs.getString("table_key"))
                .code(rs.getString("code"))
                .description(rs.getString(DESCRIPTION)));
          }
          return out;
        });
  }

  /**
   * Retrieve template LOV rows from the dedicated view package.
   * @param filterField optional filter field passed to the package
   */
  public List<StaticLov> getTemplateLov(String filterField) {
    return queryCursorCall(buildSearchRecsCall("scs_scale_auth_template_pkg", 6),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()        // p_scale_auth_template_id
            .nullNumeric()        // p_org_unit_no
            .string(filterField)  // p_scale_condition_class_code -> use filterField if provided
            .nullString()         // p_scale_auth_template_name
            .nullString()         // p_entry_userid
            .nullString(),        // p_update_userid
        rs -> {
          List<StaticLov> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new StaticLov()
                .tableKey("SCS_SCALE_AUTH_TEMPLATE_PKG")
                .code(rs.getString("scale_auth_template_id") != null ? String.valueOf(rs.getObject("scale_auth_template_id")) : null)
                .description(rs.getString("scale_auth_template_name")));
          }
          return out;
        });
  }

  private Long asLong(ResultSet rs, String columnName) {
    try {
      Number value = (Number) rs.getObject(columnName);
      return value == null ? null : value.longValue();
    } catch (Exception ignored) {
      // Fall through to null.
    }
    return null;
  }
}
