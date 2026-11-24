package ca.bc.gov.nrs.scs.backend.domain.scaler;

import java.util.List;

/**
 * Scaler Summary panel aggregate: the {@link ScalerSummaryCore core columns} plus the licence-type
 * rows and the resolved licence status. Composed by {@code ScalerService.getScalerSummary} from the
 * three summary reads; projected to the generated {@code ScalerSummary} by {@code ScalerApiMapper}.
 */
public record ScalerSummaryRecord(
    ScalerSummaryCore core,
    List<ScalerLicenceTypeEntry> licenceTypes,
    ScalerLicenceStatus licenceStatus) {}
