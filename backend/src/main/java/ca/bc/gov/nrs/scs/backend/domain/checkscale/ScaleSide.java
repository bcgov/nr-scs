package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.time.LocalDate;
import lombok.With;

/**
 * One scale side (original or check) on a CheckScale — bundles scale date,
 * return number, and the five totals (tops / butts / length / volume / pieces).
 */
@With
public record ScaleSide(
    LocalDate scaleDate,
    Integer returnNo,
    Integer totalTops,
    Integer totalButts,
    Double totalLength,
    Double totalVolume,
    Integer totalPieces) {

  /** All-null scale side — used as a sentinel in search criteria that don't filter on a side. */
  public static final ScaleSide EMPTY = new ScaleSide(null, null, null, null, null, null, null);
}
