package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * Service-input shape for a single species/product/grade roll-up row of a summary check scale.
 * Persisted via {@code SCS_CHECK_SCALE_SPG_SUMMRY_PKG.insert_rec} keyed to the parent check scale
 * id. {@code productCode} / {@code gradeCode} are already normalized by
 * {@code SummaryCheckScaleApiMapper} (blank for the legacy non-applicable cases — see
 * {@code CheckScaleSpgSummaryBo.addSummarySPG}).
 *
 * <p>Producer: {@code SummaryCheckScaleApiMapper.toCreateCommand}. Consumer:
 * {@code CheckScaleRepository.insertSpgSummaryRow}.
 */
public record SummaryCheckScaleSpgRowCommand(
    String speciesCode,
    String productCode,
    String gradeCode,
    Integer originalPieces,
    Double originalNetVolume,
    Double originalNetValue,
    Integer checkPieces,
    Double checkNetVolume,
    Double checkNetValue) {

  /** Legacy graded product whose grade is retained on SFP summaries; all other SFP rows blank it. */
  private static final String SFP_GRADED_PRODUCT = "XM";

  /** Stored placeholder for the non-applicable product/grade cases (NOT NULL columns). */
  private static final String BLANK = " ";

  /**
   * Applies the legacy {@code CheckScaleSpgSummaryBo.addSummarySPG} product/grade blanking and
   * returns a normalized copy: for non-SFP summaries the product code is blanked; for SFP the grade
   * is blanked unless the product is the graded product ({@code XM}). Sole owner of the rule, shared
   * by the create (mapper) and add-row (service) flows.
   */
  public SummaryCheckScaleSpgRowCommand blankFor(boolean specialForestProduct) {
    String product = productCode;
    String grade = gradeCode;
    if (!specialForestProduct) {
      product = BLANK;
    } else if (product == null || !product.equals(SFP_GRADED_PRODUCT)) {
      grade = BLANK;
    }
    return new SummaryCheckScaleSpgRowCommand(
        speciesCode, product, grade,
        originalPieces, originalNetVolume, originalNetValue,
        checkPieces, checkNetVolume, checkNetValue);
  }
}
