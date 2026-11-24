package ca.bc.gov.nrs.scs.backend.domain.scaler;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;

/**
 * Core columns of the Scaler Summary panel, read from {@code scs_scaler_vw_pkg.search_recs}
 * (one row per licence). Produced by {@code ScalerRepository.getScalerSummaryCore}; carried into
 * the {@link ScalerSummaryRecord} aggregate and used as the scaler-existence probe. The client
 * number is stored zero-padded (as the aggregate {@code Scaler} does).
 */
public record ScalerSummaryCore(
    String scalerLicenceNo,
    String clientNumber,
    String orgUnitName,
    LocalDate issuedDate,
    LocalDate expiryDate,
    LocalDate licenceCancelledDate,
    YesNo oathTakenInd) {}
