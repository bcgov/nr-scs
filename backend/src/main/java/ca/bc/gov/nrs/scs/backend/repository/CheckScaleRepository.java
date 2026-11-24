package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleParams;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSpgSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleStats;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyDetail;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyDetailSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyHeader;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyDetail;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyDetailSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyHeader;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScaleSide;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScalerCheckScaleFilter;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SpeciesSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleEntry;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleSpgRowCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.TallyDoc;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CheckScaleRepository extends AbstractRepository {

  private static final String CHECK_SCALE_PKG = "scs_check_scale_pkg";
  private static final String SAMPLE_LOG_TALLY_PKG = "scs_sample_log_tally_pkg";
  private static final String LOG_TALLY_PKG = "scs_log_tally_pkg";
  private static final String SMPL_TLLY_DTL_SMMRY_VW_PKG = "scs_smpl_tlly_dtl_smmry_vw_pkg";
  private static final String LOG_TALLY_DTL_SMMRY_VW_PKG = "scs_log_tally_dtl_smmry_vw_pkg";
  private static final String CHECK_SCALE_SPG_SUMMRY_PKG = "scs_check_scale_spg_summry_pkg";
  private static final String CHECK_SCALE_SUMMARY_VW_PKG = "scs_check_scale_summary_vw_pkg";
  private static final String CS_SITE_SUMMRY_VW_PKG = "scs_cs_site_summry_vw_pkg";
  private static final String SUMMARY_CHECK_SCALE_VW_PKG = "scs_summary_check_scal_vw_pkg";
  private static final String CALC_CHECK_SCALE_PKG = "scs_calc_check_scale_pkg";

  // Legacy tab sort arguments for the summary-view search_recs ORDER BY case blocks.
  private static final int SORT_CHECK_SCALE_ID = 1;
  private static final int SORT_SCALE_SITE_ID_NMBR = 2;
  private static final int SORT_CHECK_SCALE_DATE = 8;

  private static final int SUMMARY_SORT_PRIMARY = 10;
  private static final int SUMMARY_SORT_SECONDARY = 0;

  // calculate_check_scale OUT parameter positions.
  private static final int OUT_ALL_VOLUME = 5;
  private static final int OUT_ALL_VALUE = 6;
  private static final int OUT_LAST_TEN_VOLUME = 7;
  private static final int OUT_LAST_TEN_VALUE = 8;
  private static final int OUT_LAST_TWELVE_VOLUME = 9;
  private static final int OUT_LAST_TWELVE_VALUE = 10;

  // Tally detail summary cursor column positions, shared by the log-tally and
  // sample-log-tally summary views (legacy *TllyDtlSmmryVwDtoAssembler order).
  private static final int TALLY_SUMMARY_COL_VERSION = 1;
  private static final int TALLY_SUMMARY_COL_DOC_NO = 2;
  private static final int TALLY_SUMMARY_COL_GRADE = 3;
  private static final int TALLY_SUMMARY_COL_PRODUCT = 4;
  private static final int TALLY_SUMMARY_COL_SPECIES = 5;
  private static final int TALLY_SUMMARY_COL_PIECES = 6;
  private static final int TALLY_SUMMARY_COL_NET_VOLUME = 7;
  private static final int TALLY_SUMMARY_COL_NET_LENGTH = 8;
  private static final int TALLY_SUMMARY_COL_TOP = 9;
  private static final int TALLY_SUMMARY_COL_BUTT = 10;

  // Cursor column constants — shared across views.
  private static final String COL_DETAIL_DOCUMENT_NUMBER = "DETAIL_DOCUMENT_NUMBER";
  private static final String COL_VERSION = "VERSION";
  private static final String COL_NET_VOLUME = "NET_VOLUME";
  private static final String COL_TOP = "TOP";
  private static final String COL_BUTT = "BUTT";
  private static final String COL_SCALE_SPECIES_CODE = "SCALE_SPECIES_CODE";
  private static final String COL_SCALE_GRADE_CODE = "SCALE_GRADE_CODE";
  private static final String COL_SCALE_PRODUCT_CODE = "SCALE_PRODUCT_CODE";
  private static final String COL_SCALE_DATE = "SCALE_DATE";
  private static final String COL_RETURN_NUMBER = "RETURN_NUMBER";
  private static final String COL_SCALE_SITE_ID_NMBR = "SCALE_SITE_ID_NMBR";
  private static final String COL_TIMBER_MARK = "TIMBER_MARK";
  private static final String COL_LOAD_ARRIVAL_NUMBER = "LOAD_ARRIVAL_NUMBER";
  private static final String COL_PRIMARY_LICENSE_NUMBER = "PRIMARY_LICENSE_NUMBER";
  private static final String COL_SECONDARY_LICENSE_NUMBER = "SECONDARY_LICENSE_NUMBER";
  private static final String COL_CHECK_REPLACES_ORIGINAL_IND = "CHECK_REPLACES_ORIGINAL_IND";
  private static final String COL_SAMPLED_WEIGH_SLIP = "SAMPLED_WEIGH_SLIP";
  private static final String COL_POPULATION_NUMBER = "POPULATION_NUMBER";
  private static final String COL_STRATUM_NUMBER = "STRATUM_NUMBER";
  private static final String COL_SAMPLING_YEAR = "SAMPLING_YEAR";
  private static final String COL_ORIGINAL_SCALE_PIECE_CNT = "ORIGINAL_SCALE_PIECE_CNT";
  private static final String COL_ORIGINAL_SCALE_NET_VOLUME = "ORIGINAL_SCALE_NET_VOLUME";
  private static final String COL_ORIGINAL_SCALE_NET_VALUE = "ORIGINAL_SCALE_NET_VALUE";
  private static final String COL_CHECK_SCALE_PIECE_CNT = "CHECK_SCALE_PIECE_CNT";
  private static final String COL_CHECK_SCALE_NET_VOLUME = "CHECK_SCALE_NET_VOLUME";
  private static final String COL_CHECK_SCALE_NET_VALUE = "CHECK_SCALE_NET_VALUE";

  // Parameter counts.
  private static final int CHECK_SCALE_SEARCH_PARAM_COUNT = 39;
  private static final int CHECK_SCALE_WRITE_PARAM_COUNT = 39;
  private static final int CHECK_SCALE_SPG_SUMMARY_PARAM_COUNT = 12;
  private static final int CHECK_SCALE_SPG_INSERT_PARAM_COUNT = 12;
  private static final int CHECK_SCALE_SPG_DELETE_PARAM_COUNT = 4;
  private static final int LOG_TALLY_HEADER_PARAM_COUNT = 50;
  private static final int SAMPLE_LOG_TALLY_HEADER_PARAM_COUNT = 49;
  private static final int LOG_TALLY_DETAIL_SUMMARY_PARAM_COUNT = 12;
  private static final int SAMPLE_LOG_TALLY_DETAIL_SUMMARY_PARAM_COUNT = 12;
  private static final int CHECK_SCALE_SUMMARY_VW_PARAM_COUNT = 6;
  private static final int CS_SITE_SUMMRY_VW_PARAM_COUNT = 4;
  private static final int SUMMARY_CHECK_SCALE_VW_PARAM_COUNT = 24;
  private static final int CALC_CHECK_SCALE_PARAM_COUNT = 10;

  public CheckScaleRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<CheckScale> searchCheckScales(CheckScaleSearchCriteria c) {
    ScaleSide org = c.originalScale();
    ScaleSide chk = c.checkScale();
    return queryCursorCall(
        buildSearchRecsCall(CHECK_SCALE_PKG, CHECK_SCALE_SEARCH_PARAM_COUNT),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(c.checkScaleId())
            .string(c.checkScaleTypeCode())
            .string(c.ckscType())
            .string(c.partialInd())
            .string(c.followedGoodPracticeInd())
            .string(c.originalWithinStandardInd())
            .doubleValue(c.originalScaleNetValue())
            .doubleValue(c.checkScaleNetValue())
            .string(c.chkScalerCommentTxt())
            .string(TallyDoc.docNoOf(c.orgLogTally()))
            .intValue(TallyDoc.versionOf(c.orgLogTally()))
            .string(TallyDoc.docNoOf(c.chkLogTally()))
            .intValue(TallyDoc.versionOf(c.chkLogTally()))
            .intValue(TallyDoc.versionOf(c.orgSampleLogTally()))
            .string(TallyDoc.docNoOf(c.orgSampleLogTally()))
            .intValue(TallyDoc.versionOf(c.chkSampleLogTally()))
            .string(TallyDoc.docNoOf(c.chkSampleLogTally()))
            .string(c.originalScalerLicenceNo())
            .string(c.checkScalerLicenceNo())
            .string(c.scaleSiteIdNmbr())
            .string(c.timberMark())
            .string(c.loadArrivalNumber())
            .intValue(c.weighSlipNumber())
            .string(c.checkReplacesOriginalInd())
            .string(c.population())
            .string(c.stratum())
            .intValue(c.samplingYear())
            .date(org.scaleDate())
            .intValue(org.returnNo())
            .intValue(org.totalTops())
            .intValue(org.totalButts())
            .doubleValue(org.totalLength())
            .date(chk.scaleDate())
            .intValue(chk.returnNo())
            .intValue(chk.totalTops())
            .intValue(chk.totalButts())
            .doubleValue(chk.totalLength())
            .string(c.entryUserid())
            .string(c.updateUserid()),
        this::mapCheckScaleRows);
  }

  private List<CheckScale> mapCheckScaleRows(ResultSet rs) throws SQLException {
    List<CheckScale> out = new ArrayList<>();
    if (rs == null) {
      return out;
    }
    while (rs.next()) {
      TallyDoc chkLogTally =
          new TallyDoc(
              rs.getString("chk_log_tally_doc_no"), getIntNullable(rs, "chk_log_tally_ver"));
      TallyDoc chkSampleLogTally =
          new TallyDoc(
              rs.getString("chk_sample_log_tally_doc_no"),
              getIntNullable(rs, "chk_sample_log_tally_ver"));
      TallyDoc orgLogTally =
          new TallyDoc(
              rs.getString("org_log_tally_doc_no"), getIntNullable(rs, "org_log_tally_ver"));
      TallyDoc orgSampleLogTally =
          new TallyDoc(
              rs.getString("org_sample_log_tally_doc_no"),
              getIntNullable(rs, "org_sample_log_tally_ver"));

      ScaleSide originalScale =
          new ScaleSide(
              getLocalDateNullable(rs, "original_scale_date"),
              getIntNullable(rs, "original_scale_return_no"),
              getIntNullable(rs, "original_scale_total_tops"),
              getIntNullable(rs, "original_scale_total_butts"),
              getDoubleNullable(rs, "original_scale_total_length"),
              /* totalVolume */ null,
              /* totalPieces */ null);
      ScaleSide checkScale =
          new ScaleSide(
              getLocalDateNullable(rs, "chk_scale_date"),
              getIntNullable(rs, "chk_scale_return_no"),
              getIntNullable(rs, "chk_scale_total_tops"),
              getIntNullable(rs, "chk_scale_total_butts"),
              getDoubleNullable(rs, "chk_scale_total_length"),
              /* totalVolume */ null,
              /* totalPieces */ null);

      out.add(
          new CheckScale(
              getLongNullable(rs, "check_scale_id"),
              rs.getString("check_scale_type_code"),
              rs.getString("cksc_type"),
              rs.getString("partial_ind"),
              YesNo.fromCode(rs.getString("followed_good_practice_ind")),
              YesNo.fromCode(rs.getString("original_within_standard_ind")),
              YesNo.fromCode(rs.getString("check_replaces_original_ind")),
              rs.getString("chk_scaler_comment_txt"),
              getDoubleNullable(rs, "original_scale_net_value"),
              getDoubleNullable(rs, "check_scale_net_value"),
              chkLogTally,
              chkSampleLogTally,
              orgLogTally,
              orgSampleLogTally,
              rs.getString("original_scaler_licence_no"),
              rs.getString("check_scaler_licence_no"),
              /* secondScalerLicenceNo */ null,
              rs.getString("scale_site_id_nmbr"),
              rs.getString("timber_mark"),
              rs.getString("load_arrival_number"),
              getIntNullable(rs, "weigh_slip_number"),
              rs.getString("population"),
              rs.getString("stratum"),
              getIntNullable(rs, "sampling_year"),
              originalScale,
              checkScale,
              getOffsetDateTimeNullable(rs, "entry_timestamp"),
              rs.getString("entry_userid"),
              getOffsetDateTimeNullable(rs, "update_timestamp"),
              rs.getString("update_userid"),
              getIntNullable(rs, "revision_count"),
              /* speciesSummary */ null));
    }
    return out;
  }

  public Long createCheckScale(CheckScaleParams p) {
    return queryCursorCall(
        buildInsertRecCall(CHECK_SCALE_PKG, CHECK_SCALE_WRITE_PARAM_COUNT),
        cs -> bindWriteParams(cs, null, p), // null id — assigned by the DB on insert
        rs -> rs != null && rs.next() ? getLongNullable(rs, 1) : null);
  }

  public Long updateCheckScale(Long checkScaleId, CheckScaleParams p) {
    return queryCursorCall(
        buildUpdateRecCall(CHECK_SCALE_PKG, CHECK_SCALE_WRITE_PARAM_COUNT),
        cs -> bindWriteParams(cs, checkScaleId, p),
        rs -> rs != null && rs.next() ? getLongNullable(rs, 1) : null);
  }

  /**
   * Deletes an entire check scale via {@code scs_check_scale_pkg.delete_rec}. The procedure cascades
   * to the {@code check_scale_spg_summary} children before removing the {@code check_scale} header,
   * so summary check scales need no separate child cleanup. A {@code delete_rec} procedure call has
   * no return slot, so the single id binds at index 1.
   */
  public void deleteCheckScale(Long checkScaleId) {
    executeVoidCall(
        buildDeleteRecCall(CHECK_SCALE_PKG, 1),
        cs -> ParameterBinder.fromStart(cs).longValue(checkScaleId));
  }

  /**
   * Binds the shared {@code insert_rec} / {@code update_rec} parameter list (positions 2..40).
   * {@code checkScaleId} is null on insert (DB assigns) and the target id on update. Audit userids
   * come from the authenticated principal.
   */
  private void bindWriteParams(CallableStatement cs, Long checkScaleId, CheckScaleParams p)
      throws SQLException {
    String userId = currentUserIdOrSystem();
    ParameterBinder.afterReturn(cs)
        .longValue(checkScaleId)
        .string(p.checkScaleTypeCode())
        .string(p.ckscType())
        .string(p.partialInd())
        .string(YesNo.toCode(p.followedGoodPractice()))
        .string(YesNo.toCode(p.originalWithinStandard()))
        .doubleValue(p.originalScaleNetValue())
        .doubleValue(p.checkScaleNetValue())
        .string(p.commentTxt())
        .string(p.orgLogTallyDocNo())
        .intValue(p.orgLogTallyVer())
        .string(p.chkLogTallyDocNo())
        .intValue(p.chkLogTallyVer())
        .intValue(p.orgSampleLogTallyVer())
        .string(p.orgSampleLogTallyDocNo())
        .intValue(p.chkSampleLogTallyVer())
        .string(p.chkSampleLogTallyDocNo())
        .string(p.originalScalerLicenceNo())
        .string(p.checkScalerLicenceNo())
        .string(p.scaleSiteIdNmbr())
        .string(p.timberMark())
        .string(p.loadArrivalNumber())
        .intValue(p.weighSlipNumber())
        .string(YesNo.toCode(p.checkReplacesOriginal()))
        .string(p.population())
        .string(p.stratum())
        .intValue(p.samplingYear())
        .date(p.originalScaleDate())
        .intValue(p.originalScaleReturnNo())
        .intValue(p.originalScaleTotalTops())
        .intValue(p.originalScaleTotalButts())
        .doubleValue(p.originalScaleTotalLength())
        .date(p.chkScaleDate())
        .intValue(p.chkScaleReturnNo())
        .intValue(p.chkScaleTotalTops())
        .intValue(p.chkScaleTotalButts())
        .doubleValue(p.chkScaleTotalLength())
        .string(userId)
        .string(userId);
  }

  public ExistenceResult existsHbsRecord(String ddn, Integer ver, boolean sample) {
    if (ddn == null) {
      return new ExistenceResult(false, null);
    }
    try {
      String packageName = sample ? SAMPLE_LOG_TALLY_PKG : LOG_TALLY_PKG;
      int paramCount = sample ? SAMPLE_LOG_TALLY_HEADER_PARAM_COUNT : LOG_TALLY_HEADER_PARAM_COUNT;
      boolean found =
          querySearchRecs(
              packageName,
              paramCount,
              cs -> {
                ParameterBinder binder = ParameterBinder.afterReturn(cs)
                    .string(ddn)
                    .intValue(ver);
                for (int i = 4; i <= paramCount + 1; i++) {
                  binder.nullUntyped();
                }
              },
              rs -> rs != null && rs.next());
      return new ExistenceResult(found, null);
    } catch (Exception ex) {
      return new ExistenceResult(
          false,
          "HBS "
              + (sample ? "sample_log_tally" : "log_tally")
              + " lookup failed: "
              + ex.getMessage());
    }
  }

  /**
   * Inserts one SPG roll-up row for a summary check scale via
   * {@code scs_check_scale_spg_summry_pkg.insert_rec}, keyed to {@code checkScaleId}. Bind order
   * mirrors the legacy {@code CheckScaleSpgSummaryMapper}: id, species, product, grade, original
   * pieces/volume/value, check pieces/volume/value, then the two audit userids. Audit userids come
   * from the authenticated principal. Lives here (not in a separate summary repository) because this
   * repository already owns the {@code scs_check_scale_spg_summry_pkg} read path
   * ({@link #getSpgSummary}); the SPG delete (CHK-5) belongs here too.
   */
  public void insertSpgSummaryRow(Long checkScaleId, SummaryCheckScaleSpgRowCommand row) {
    String userId = currentUserIdOrSystem();
    queryCursorCall(
        buildInsertRecCall(CHECK_SCALE_SPG_SUMMRY_PKG, CHECK_SCALE_SPG_INSERT_PARAM_COUNT),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(checkScaleId)
            .string(row.speciesCode())
            .string(row.productCode())
            .string(row.gradeCode())
            .intValue(row.originalPieces())
            .doubleValue(row.originalNetVolume())
            .doubleValue(row.originalNetValue())
            .intValue(row.checkPieces())
            .doubleValue(row.checkNetVolume())
            .doubleValue(row.checkNetValue())
            .string(userId)
            .string(userId),
        rs -> null);
  }

  /**
   * Deletes one SPG roll-up row via {@code scs_check_scale_spg_summry_pkg.delete_rec}, keyed by the
   * composite PK {@code (check_scale_id, species, product, grade)}. A {@code delete_rec} procedure
   * call has no return slot, so the IN params bind from index 1. A non-matching key is a no-op (the
   * service enforces the "cannot delete the last remaining row" rule before calling this).
   */
  public void deleteSpgSummaryRow(
      Long checkScaleId, String species, String product, String grade) {
    executeVoidCall(
        buildDeleteRecCall(CHECK_SCALE_SPG_SUMMRY_PKG, CHECK_SCALE_SPG_DELETE_PARAM_COUNT),
        cs -> ParameterBinder.fromStart(cs)
            .longValue(checkScaleId)   // p_check_scale_id
            .string(species)           // p_species
            .string(product)           // p_product
            .string(grade));           // p_grade
  }

  public CheckScaleSpgSummary getSpgSummary(Long checkScaleId) {
    return queryCursorCall(
        buildSearchRecsCall(CHECK_SCALE_SPG_SUMMRY_PKG, CHECK_SCALE_SPG_SUMMARY_PARAM_COUNT),
        cs -> {
          cs.setObject(2, checkScaleId, Types.NUMERIC);
          cs.setObject(3, null, Types.VARCHAR);
          cs.setObject(4, null, Types.VARCHAR);
          cs.setObject(5, null, Types.VARCHAR);
          cs.setObject(6, null, Types.NUMERIC);
          cs.setObject(7, null, Types.NUMERIC);
          cs.setObject(8, null, Types.NUMERIC);
          cs.setObject(9, null, Types.NUMERIC);
          cs.setObject(10, null, Types.NUMERIC);
          cs.setObject(11, null, Types.NUMERIC);
          cs.setObject(12, null, Types.VARCHAR);
          cs.setObject(13, null, Types.VARCHAR);
        },
        this::mapSpgSummary);
  }

  private CheckScaleSpgSummary mapSpgSummary(ResultSet rs) throws SQLException {
    if (rs == null) {
      return null;
    }
    List<SpeciesSummary> species = new ArrayList<>();
    double origVol = 0.0;
    double chkVol = 0.0;
    int origPieces = 0;
    int chkPieces = 0;

    while (rs.next()) {
      Integer oPcs = getIntNullable(rs, COL_ORIGINAL_SCALE_PIECE_CNT);
      Double oVol = getDoubleNullable(rs, COL_ORIGINAL_SCALE_NET_VOLUME);
      Double oVal = getDoubleNullable(rs, COL_ORIGINAL_SCALE_NET_VALUE);
      Integer cPcs = getIntNullable(rs, COL_CHECK_SCALE_PIECE_CNT);
      Double cVol = getDoubleNullable(rs, COL_CHECK_SCALE_NET_VOLUME);
      Double cVal = getDoubleNullable(rs, COL_CHECK_SCALE_NET_VALUE);

      if (oPcs != null) origPieces += oPcs;
      if (oVol != null) origVol += oVol;
      if (cPcs != null) chkPieces += cPcs;
      if (cVol != null) chkVol += cVol;

      species.add(
          new SpeciesSummary(
              rs.getString(COL_SCALE_SPECIES_CODE),
              rs.getString(COL_SCALE_GRADE_CODE),
              rs.getString(COL_SCALE_PRODUCT_CODE),
              oPcs,
              oVol,
              oVal,
              cPcs,
              cVol,
              cVal));
    }

    if (species.isEmpty()) {
      return null;
    }
    return new CheckScaleSpgSummary(origVol, chkVol, origPieces, chkPieces, species);
  }

  public LogTallyHeader getLogTallyHeader(String docNo, Integer docVer) {
    if (docNo == null || docNo.trim().isEmpty() || docVer == null) {
      return null;
    }
    return queryCursorCall(
        buildSearchRecsCall(LOG_TALLY_PKG, LOG_TALLY_HEADER_PARAM_COUNT),
        cs -> {
          ParameterBinder binder = ParameterBinder.afterReturn(cs)
              .string(docNo)
              .intValue(docVer);
          for (int i = 4; i <= 51; i++) {
            binder.nullUntyped();
          }
        },
        rs -> {
          if (rs == null || !rs.next()) {
            return null;
          }
          return new LogTallyHeader(
              rs.getString(COL_DETAIL_DOCUMENT_NUMBER),
              getIntNullable(rs, COL_VERSION),
              getLocalDateNullable(rs, COL_SCALE_DATE),
              getIntNullable(rs, COL_RETURN_NUMBER),
              rs.getString(COL_SCALE_SITE_ID_NMBR),
              rs.getString(COL_TIMBER_MARK),
              rs.getString(COL_LOAD_ARRIVAL_NUMBER),
              rs.getString(COL_PRIMARY_LICENSE_NUMBER),
              rs.getString(COL_SECONDARY_LICENSE_NUMBER),
              rs.getString(COL_CHECK_REPLACES_ORIGINAL_IND));
        });
  }

  public SampleLogTallyHeader getSampleLogTallyHeader(String docNo, Integer docVer) {
    if (docNo == null || docNo.trim().isEmpty() || docVer == null) {
      return null;
    }
    return queryCursorCall(
        buildSearchRecsCall(SAMPLE_LOG_TALLY_PKG, SAMPLE_LOG_TALLY_HEADER_PARAM_COUNT),
        cs -> {
          ParameterBinder binder = ParameterBinder.afterReturn(cs)
              .string(docNo)
              .intValue(docVer);
          for (int i = 4; i <= 50; i++) {
            binder.nullUntyped();
          }
        },
        rs -> {
          if (rs == null || !rs.next()) {
            return null;
          }
          return new SampleLogTallyHeader(
              rs.getString(COL_DETAIL_DOCUMENT_NUMBER),
              getIntNullable(rs, COL_VERSION),
              getLocalDateNullable(rs, COL_SCALE_DATE),
              getIntNullable(rs, COL_RETURN_NUMBER),
              rs.getString(COL_SCALE_SITE_ID_NMBR),
              rs.getString(COL_TIMBER_MARK),
              rs.getString(COL_LOAD_ARRIVAL_NUMBER),
              rs.getString(COL_PRIMARY_LICENSE_NUMBER),
              rs.getString(COL_SECONDARY_LICENSE_NUMBER),
              rs.getString(COL_SAMPLED_WEIGH_SLIP),
              rs.getString(COL_POPULATION_NUMBER),
              rs.getString(COL_STRATUM_NUMBER),
              getIntNullable(rs, COL_SAMPLING_YEAR),
              rs.getString(COL_CHECK_REPLACES_ORIGINAL_IND));
        });
  }

  public List<LogTallyDetailSummary> getLogTallyDetailSummary(String docNo, Integer docVer) {
    if (docNo == null || docNo.trim().isEmpty()) {
      return new ArrayList<>();
    }
    return queryCursorCall(
        buildSearchRecsCall(LOG_TALLY_DTL_SMMRY_VW_PKG, LOG_TALLY_DETAIL_SUMMARY_PARAM_COUNT),
        cs -> {
          cs.setObject(2, docVer, Types.NUMERIC);
          cs.setString(3, docNo);
          for (int i = 4; i <= 13; i++) {
            cs.setObject(i, null);
          }
        },
        rs -> {
          List<LogTallyDetailSummary> out = new ArrayList<>();
          if (rs == null) return out;
          while (rs.next()) {
            out.add(
                new LogTallyDetailSummary(
                    rs.getString(TALLY_SUMMARY_COL_DOC_NO),
                    getIntNullable(rs, TALLY_SUMMARY_COL_VERSION),
                    getDoubleNullable(rs, TALLY_SUMMARY_COL_NET_VOLUME),
                    getIntNullable(rs, TALLY_SUMMARY_COL_PIECES),
                    rs.getString(TALLY_SUMMARY_COL_SPECIES),
                    rs.getString(TALLY_SUMMARY_COL_GRADE),
                    rs.getString(TALLY_SUMMARY_COL_PRODUCT),
                    getIntNullable(rs, TALLY_SUMMARY_COL_TOP),
                    getIntNullable(rs, TALLY_SUMMARY_COL_BUTT),
                    getDoubleNullable(rs, TALLY_SUMMARY_COL_NET_LENGTH)));
          }
          return out;
        });
  }

  public List<SampleLogTallyDetailSummary> getSampleLogTallyDetailSummary(
      String docNo, Integer docVer) {
    if (docNo == null || docNo.trim().isEmpty()) {
      return new ArrayList<>();
    }
    return queryCursorCall(
        buildSearchRecsCall(
            SMPL_TLLY_DTL_SMMRY_VW_PKG, SAMPLE_LOG_TALLY_DETAIL_SUMMARY_PARAM_COUNT),
        cs -> {
          cs.setObject(2, docVer, Types.NUMERIC);
          cs.setString(3, docNo);
          for (int i = 4; i <= 13; i++) {
            cs.setObject(i, null);
          }
        },
        rs -> {
          List<SampleLogTallyDetailSummary> out = new ArrayList<>();
          if (rs == null) return out;
          while (rs.next()) {
            out.add(
                new SampleLogTallyDetailSummary(
                    rs.getString(TALLY_SUMMARY_COL_DOC_NO),
                    getIntNullable(rs, TALLY_SUMMARY_COL_VERSION),
                    getDoubleNullable(rs, TALLY_SUMMARY_COL_NET_VOLUME),
                    getIntNullable(rs, TALLY_SUMMARY_COL_PIECES),
                    rs.getString(TALLY_SUMMARY_COL_SPECIES),
                    rs.getString(TALLY_SUMMARY_COL_GRADE),
                    rs.getString(TALLY_SUMMARY_COL_PRODUCT),
                    getIntNullable(rs, TALLY_SUMMARY_COL_TOP),
                    getIntNullable(rs, TALLY_SUMMARY_COL_BUTT),
                    getDoubleNullable(rs, TALLY_SUMMARY_COL_NET_LENGTH)));
          }
          return out;
        });
  }

  public List<LogTallyDetail> getLogTallyDetail(String ddn, Integer ver) {
    if (ddn == null || ddn.trim().isEmpty()) {
      return new ArrayList<>();
    }
    return querySearchRecs(
        "scs_log_tally_detail_pkg",
        20,
        cs -> {
          ParameterBinder binder = ParameterBinder.afterReturn(cs)
              .nullNumeric()
              .intValue(ver)
              .string(ddn);
          for (int i = 5; i <= 21; i++) {
            binder.nullUntyped();
          }
        },
        rs -> {
          List<LogTallyDetail> out = new ArrayList<>();
          if (rs == null) return out;
          Map<String, Integer> colIndex = buildColumnIndex(rs.getMetaData());
          while (rs.next()) {
            out.add(
                new LogTallyDetail(
                    stringFrom(rs, colIndex, COL_SCALE_SPECIES_CODE, "INPUT_SPECIES"),
                    stringFrom(rs, colIndex, COL_SCALE_PRODUCT_CODE, "INPUT_PRODUCT"),
                    stringFrom(rs, colIndex, COL_SCALE_GRADE_CODE, "INPUT_GRADE"),
                    intFrom(rs, colIndex, COL_TOP, "TOPS"),
                    intFrom(rs, colIndex, COL_BUTT),
                    doubleFrom(rs, colIndex, "LENGTH"),
                    bigDecimalFrom(rs, colIndex, COL_NET_VOLUME, "NETVOLUME", "NET_VOL")));
          }
          return out;
        });
  }

  public List<SampleLogTallyDetail> getSampleLogTallyDetail(String ddn, Integer ver) {
    if (ddn == null || ddn.trim().isEmpty()) {
      return new ArrayList<>();
    }
    return querySearchRecs(
        "scs_sample_tally_detail_pkg",
        18,
        cs -> {
          ParameterBinder binder = ParameterBinder.afterReturn(cs)
              .nullNumeric()
              .string(ddn)
              .intValue(ver);
          for (int i = 5; i <= 19; i++) {
            binder.nullUntyped();
          }
        },
        rs -> {
          List<SampleLogTallyDetail> out = new ArrayList<>();
          if (rs == null) return out;
          Map<String, Integer> colIndex = buildColumnIndex(rs.getMetaData());
          while (rs.next()) {
            out.add(
                new SampleLogTallyDetail(
                    stringFrom(rs, colIndex, COL_SCALE_SPECIES_CODE, "INPUT_SPECIES"),
                    stringFrom(rs, colIndex, COL_SCALE_PRODUCT_CODE, "INPUT_PRODUCT"),
                    stringFrom(rs, colIndex, COL_SCALE_GRADE_CODE, "INPUT_GRADE"),
                    intFrom(rs, colIndex, COL_TOP, "TOPS"),
                    intFrom(rs, colIndex, COL_BUTT),
                    doubleFrom(rs, colIndex, "LENGTH"),
                    bigDecimalFrom(rs, colIndex, COL_NET_VOLUME, "NETVOLUME", "NET_VOL")));
          }
          return out;
        });
  }

  private Map<String, Integer> buildColumnIndex(ResultSetMetaData md) throws SQLException {
    Map<String, Integer> colIndex = new HashMap<>();
    int cols = md.getColumnCount();
    for (int i = 1; i <= cols; i++) {
      String lbl = md.getColumnLabel(i);
      if (lbl != null) {
        colIndex.put(lbl.toUpperCase(), i);
      }
    }
    return colIndex;
  }

  private String stringFrom(ResultSet rs, Map<String, Integer> colIndex, String... names)
      throws SQLException {
    Object v = firstValue(rs, colIndex, names);
    return v != null ? v.toString().trim() : "";
  }

  private Integer intFrom(ResultSet rs, Map<String, Integer> colIndex, String... names)
      throws SQLException {
    Object v = firstValue(rs, colIndex, names);
    if (v instanceof Number number) return number.intValue();
    if (v != null) {
      try {
        return Integer.parseInt(v.toString());
      } catch (Exception ignored) {
        return null;
      }
    }
    return null;
  }

  private Double doubleFrom(ResultSet rs, Map<String, Integer> colIndex, String... names)
      throws SQLException {
    Object v = firstValue(rs, colIndex, names);
    if (v instanceof Number number) return number.doubleValue();
    if (v != null) {
      try {
        return Double.parseDouble(v.toString());
      } catch (Exception ignored) {
        return null;
      }
    }
    return null;
  }

  private BigDecimal bigDecimalFrom(ResultSet rs, Map<String, Integer> colIndex, String... names)
      throws SQLException {
    Object v = firstValue(rs, colIndex, names);
    if (v instanceof BigDecimal bd) return bd;
    if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
    if (v != null) {
      try {
        return new BigDecimal(v.toString());
      } catch (Exception ignored) {
        return null;
      }
    }
    return null;
  }

  private Object firstValue(ResultSet rs, Map<String, Integer> colIndex, String... names)
      throws SQLException {
    for (String n : names) {
      Integer idx = colIndex.get(n.toUpperCase());
      if (idx != null) {
        return rs.getObject(idx);
      }
    }
    return null;
  }

  public List<CheckScaleSummary> searchScalerCheckScaleSummaries(
      ScalerCheckScaleFilter filter, String scalerLicenceNo) {
    return querySearchRecs(
        CHECK_SCALE_SUMMARY_VW_PKG,
        CHECK_SCALE_SUMMARY_VW_PARAM_COUNT,
        cs -> ParameterBinder.afterReturn(cs)
            .string(filter.primCheckLicenceNo(scalerLicenceNo))
            .string(filter.secCheckLicenceNo(scalerLicenceNo))
            .string(filter.primOrigLicenceNo(scalerLicenceNo))
            .string(filter.secOrigLicenceNo(scalerLicenceNo))
            .intValue(SORT_CHECK_SCALE_DATE)
            .intValue(SORT_CHECK_SCALE_ID),
        this::mapCheckScaleSummaryRows);
  }

  public List<CheckScaleSummary> searchScaleSiteCheckScaleSummaries(
      String scaleSiteIdNmbr, String checkScaleTypeCode) {
    return querySearchRecs(
        CS_SITE_SUMMRY_VW_PKG,
        CS_SITE_SUMMRY_VW_PARAM_COUNT,
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleSiteIdNmbr)
            .string(checkScaleTypeCode)
            .intValue(SORT_CHECK_SCALE_DATE)
            .intValue(SORT_SCALE_SITE_ID_NMBR),
        this::mapCheckScaleSummaryRows);
  }

  /**
   * Summary check scale rows for the Scaler Summary Check Scales tab (legacy P132,
   * {@code summaryCheckScaleList.jsp}). Calls {@code scs_summary_check_scal_vw_pkg.search_recs}
   * with all four licence criteria bound to the scaler licence, the other view criteria as NULLs,
   * and the legacy default sort.
   */
  public List<SummaryCheckScaleEntry> searchScalerSummaryCheckScales(String scalerLicenceNo) {
    return querySearchRecs(
        SUMMARY_CHECK_SCALE_VW_PKG,
        SUMMARY_CHECK_SCALE_VW_PARAM_COUNT,
        cs -> ParameterBinder.afterReturn(cs)
            .nullString() // cksc_type
            .nullString() // partial_ind
            .nullNumeric() // check_scale_id
            .nullString() // scale_site_id_nmbr
            .string(scalerLicenceNo) // prim_check_licence_no
            .string(scalerLicenceNo) // sec_check_licence_no
            .string(scalerLicenceNo) // prim_orig_licence_no
            .string(scalerLicenceNo) // sec_orig_licence_no
            .nullDate() // orig_scale_date
            .nullDate() // check_scale_date
            .nullNumeric() // piece_diff
            .nullNumeric() // volume_variance
            .nullNumeric() // value_variance
            .nullString() // replaced_ind
            .nullString() // check_scale_type_code
            .nullString() // record_type
            .nullString() // followed_good_practice_ind
            .nullString() // original_within_standard_ind
            .nullNumeric() // orig_volume
            .nullNumeric() // check_volume
            .nullNumeric() // orig_value
            .nullNumeric() // check_value
            .intValue(SUMMARY_SORT_PRIMARY)
            .intValue(SUMMARY_SORT_SECONDARY),
        this::mapSummaryCheckScaleEntryRows);
  }

  public CheckScaleStats calculateCheckScaleStats(
      ScalerCheckScaleFilter filter, String scalerLicenceNo) {
    return queryOutParamsCall(
        buildProcedureCall(
            CALC_CHECK_SCALE_PKG, "calculate_check_scale", CALC_CHECK_SCALE_PARAM_COUNT),
        cs -> {
          cs.setString(1, filter.primOrigLicenceNo(scalerLicenceNo));
          cs.setString(2, filter.primCheckLicenceNo(scalerLicenceNo));
          cs.setString(3, filter.secOrigLicenceNo(scalerLicenceNo));
          cs.setString(4, filter.secCheckLicenceNo(scalerLicenceNo));
          for (int i = OUT_ALL_VOLUME; i <= OUT_LAST_TWELVE_VALUE; i++) {
            cs.registerOutParameter(i, Types.VARCHAR);
          }
        },
        cs ->
            new CheckScaleStats(
                bigDecimalOrNull(cs.getString(OUT_LAST_TEN_VOLUME)),
                bigDecimalOrNull(cs.getString(OUT_LAST_TEN_VALUE)),
                bigDecimalOrNull(cs.getString(OUT_LAST_TWELVE_VOLUME)),
                bigDecimalOrNull(cs.getString(OUT_LAST_TWELVE_VALUE)),
                bigDecimalOrNull(cs.getString(OUT_ALL_VOLUME)),
                bigDecimalOrNull(cs.getString(OUT_ALL_VALUE))));
  }

  private List<CheckScaleSummary> mapCheckScaleSummaryRows(ResultSet rs) throws SQLException {
    List<CheckScaleSummary> out = new ArrayList<>();
    if (rs == null) {
      return out;
    }
    while (rs.next()) {
      out.add(
          new CheckScaleSummary(
              getLongNullable(rs, "check_scale_id"),
              rs.getString("scale_site_id_nmbr"),
              rs.getString("prim_check_licence_no"),
              rs.getString("sec_check_licence_no"),
              rs.getString("prim_orig_licence_no"),
              rs.getString("sec_orig_licence_no"),
              getLocalDateNullable(rs, "orig_scale_date"),
              getLocalDateNullable(rs, "check_scale_date"),
              rs.getBigDecimal("piece_diff"),
              rs.getBigDecimal("volume_variance"),
              rs.getBigDecimal("value_variance"),
              YesNo.fromCode(rs.getString("replaced_ind")),
              rs.getString("check_scale_type_code"),
              rs.getString("record_type"),
              YesNo.fromCode(rs.getString("followed_good_practice_ind")),
              YesNo.fromCode(rs.getString("original_within_standard_ind"))));
    }
    return out;
  }

  private List<SummaryCheckScaleEntry> mapSummaryCheckScaleEntryRows(ResultSet rs)
      throws SQLException {
    List<SummaryCheckScaleEntry> out = new ArrayList<>();
    if (rs == null) {
      return out;
    }
    while (rs.next()) {
      out.add(
          new SummaryCheckScaleEntry(
              getLongNullable(rs, "check_scale_id"),
              rs.getString("cksc_type"),
              rs.getString("prim_check_licence_no"),
              rs.getString("prim_orig_licence_no"),
              getLocalDateNullable(rs, "orig_scale_date"),
              getLocalDateNullable(rs, "check_scale_date"),
              rs.getBigDecimal("piece_diff"),
              rs.getBigDecimal("volume_variance"),
              rs.getBigDecimal("value_variance"),
              YesNo.fromCode(rs.getString("replaced_ind")),
              rs.getString("check_scale_type_code"),
              YesNo.fromCode(rs.getString("followed_good_practice_ind")),
              YesNo.fromCode(rs.getString("original_within_standard_ind"))));
    }
    return out;
  }

  private static BigDecimal bigDecimalOrNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return new BigDecimal(value.trim());
    } catch (NumberFormatException ex) {
      // A non-numeric stats value from the DB degrades to null rather than failing the read.
      return null;
    }
  }
}
