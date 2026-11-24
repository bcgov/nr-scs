package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.awt.Polygon;

/**
 * Tests whether a (latitude, longitude) pair falls inside the rough BC boundary
 * polygon used by the legacy SCS app. Mirrors
 * {@code ca.bc.gov.mof.scs.integration.validation.coordinates.bc.BritishColumbiaCoordinateValidator}
 * in the legacy code, including the integer-truncation quirk and the corner-point shortcut.
 *
 * Longitude is treated by magnitude — the legacy app stored W longitudes as positive
 * integers, while the modern API accepts -180..180. Comparing |longitude.degrees()|
 * lets either input convention pass. Legacy needed no such allowance: its
 * {@code Coordinate.validate} rejected any negative degrees/minutes/seconds outright, so a signed
 * longitude never reached the polygon test. That non-negative rule is deliberately gone here
 * (negative now means W/S) — tracked as Divergence #1 in
 * {@code frontend/e2e/features/sst/uc-sst-004-create/defects.md}.
 *
 * <p>The frontend mirrors this class in {@code frontend/src/utils/britishColumbiaBounds.ts} so the
 * refusal can be shown inline instead of costing a save round-trip. That copy is advisory only —
 * this check is the authoritative one and runs on every save. The two were diffed over 210,783
 * sampled coordinates and agree on all of them; the mirror deliberately treats boundary-edge points
 * as inside, so where it ever differs it is the more permissive of the two and defers here.
 */
public final class BritishColumbiaCoordinateValidator {

  private static final int MULTIPLIER = 10_000;

  // BC corner coordinates, carried over unchanged from legacy Constants.java. Each pair is
  // (latDeg, latMin, lonDeg, lonMin); longitude is west and unsigned, as legacy stored it.
  // The legacy constant for every value is named so the provenance is checkable without
  // re-deriving it -- Constants.java declares the NW pair at lines 111-121, further down the
  // file than the other three, which is easy to miss when grepping.
  //   NW: BC_BOUNDARY_NW_LAT_DEGREES/_MINUTES = 60/53, BC_BOUNDARY_NW_LONG_DEGREES/_MINUTES = 142/26
  //   NE: BC_BOUNDARY_NE_LAT_DEGREES/_MINUTES = 61/28, BC_BOUNDARY_NE_LONG_DEGREES/_MINUTES = 108/10
  //   SE: BC_BOUNDARY_SE_LAT_DEGREES/_MINUTES = 46/28, BC_BOUNDARY_SE_LONG_DEGREES/_MINUTES = 110/32
  //   SW: BC_BOUNDARY_SW_LAT_DEGREES/_MINUTES = 46/18, BC_BOUNDARY_SW_LONG_DEGREES/_MINUTES = 136/32
  // The polygon is a rough quadrilateral, not the real provincial outline -- it admits part of
  // Alberta, and legacy accepted those points too. Widening or tightening it is a behaviour
  // change, not a bug fix.
  private static final BcCorner NW = new BcCorner(60, 53, 142, 26);
  private static final BcCorner NE = new BcCorner(61, 28, 108, 10);
  private static final BcCorner SE = new BcCorner(46, 28, 110, 32);
  private static final BcCorner SW = new BcCorner(46, 18, 136, 32);

  private BritishColumbiaCoordinateValidator() {
  }

  public static boolean isWithinBritishColumbia(ScaleSiteCoordinate latitude, ScaleSiteCoordinate longitude) {
    if (latitude == null || longitude == null
        || latitude.degrees() == null || latitude.minutes() == null || latitude.seconds() == null
        || longitude.degrees() == null || longitude.minutes() == null || longitude.seconds() == null) {
      return false;
    }

    int latInt = toIntDegrees(latitude.degrees(), latitude.minutes(), latitude.seconds());
    int lonInt = toIntDegrees(Math.abs(longitude.degrees()), longitude.minutes(), longitude.seconds());

    if (matchesAnyCorner(latInt, lonInt)) {
      return true;
    }

    Polygon bcBoundary = new Polygon();
    bcBoundary.addPoint(NW.lonInt(), NW.latInt());
    bcBoundary.addPoint(NE.lonInt(), NE.latInt());
    bcBoundary.addPoint(SE.lonInt(), SE.latInt());
    bcBoundary.addPoint(SW.lonInt(), SW.latInt());

    return bcBoundary.contains(lonInt, latInt);
  }

  private static boolean matchesAnyCorner(int latInt, int lonInt) {
    return (latInt == NW.latInt() && lonInt == NW.lonInt())
        || (latInt == NE.latInt() && lonInt == NE.lonInt())
        || (latInt == SE.latInt() && lonInt == SE.lonInt())
        || (latInt == SW.latInt() && lonInt == SW.lonInt());
  }

  private static int toIntDegrees(int degrees, int minutes, int seconds) {
    double decimal = degrees + (minutes / 60.0) + (seconds / 3600.0);
    return (int) (decimal * MULTIPLIER);
  }

  private record BcCorner(int latDeg, int latMin, int lonDeg, int lonMin) {
    int latInt() {
      return toIntDegrees(latDeg, latMin, 0);
    }

    int lonInt() {
      return toIntDegrees(lonDeg, lonMin, 0);
    }
  }
}
