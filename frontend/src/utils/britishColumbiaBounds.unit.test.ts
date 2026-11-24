import { describe, expect, it } from 'vitest';

import {
  BC_BOUNDARY_CORNERS,
  OUTSIDE_BRITISH_COLUMBIA_MESSAGE,
  isWithinBritishColumbia,
} from './britishColumbiaBounds';

const dms = (degrees: number, minutes: number, seconds: number) => ({ degrees, minutes, seconds });

describe('isWithinBritishColumbia', () => {
  it('accepts a point well inside the province', () => {
    // Vancouver, 49°17'N 123°7'W.
    expect(isWithinBritishColumbia(dms(49, 17, 0), dms(-123, 7, 0))).toBe(true);
  });

  /**
   * The server's `BritishColumbiaCoordinateValidator` compares `Math.abs(longitude.degrees())`,
   * so the legacy unsigned-west form and this app's signed form must resolve to the same point.
   * This is the pair the 3-character field cap used to make unenterable.
   */
  it('reads a west longitude the same signed or unsigned', () => {
    const latitude = dms(49, 17, 0);
    expect(isWithinBritishColumbia(latitude, dms(-123, 7, 0))).toBe(
      isWithinBritishColumbia(latitude, dms(123, 7, 0)),
    );
    expect(isWithinBritishColumbia(latitude, dms(123, 7, 0))).toBe(true);
  });

  it('rejects an in-range coordinate that is nowhere near BC', () => {
    // Toronto, 43°39'N 79°23'W — passes the ±90/±180 range checks, well south-east of the polygon.
    expect(isWithinBritishColumbia(dms(43, 39, 0), dms(-79, 23, 0))).toBe(false);
  });

  it('rejects a truncated longitude, the failure the character cap used to cause', () => {
    // `-123` sliced to `-12` is a valid ±180 longitude, but 12°W is in the Atlantic.
    expect(isWithinBritishColumbia(dms(49, 17, 0), dms(-12, 7, 0))).toBe(false);
  });

  /** The server short-circuits on the corners because the polygon test alone fails them. */
  it('accepts each corner point, signed and unsigned', () => {
    for (const corner of Object.values(BC_BOUNDARY_CORNERS)) {
      expect(
        isWithinBritishColumbia(dms(corner.latDeg, corner.latMin, 0), dms(corner.lonDeg, corner.lonMin, 0)),
      ).toBe(true);
      expect(
        isWithinBritishColumbia(dms(corner.latDeg, corner.latMin, 0), dms(-corner.lonDeg, corner.lonMin, 0)),
      ).toBe(true);
    }
  });

  it('treats a missing or non-finite coordinate as out of bounds', () => {
    expect(isWithinBritishColumbia(null, dms(-123, 7, 0))).toBe(false);
    expect(isWithinBritishColumbia(dms(49, 17, 0), null)).toBe(false);
    expect(isWithinBritishColumbia(null, null)).toBe(false);
    expect(isWithinBritishColumbia(dms(NaN, 17, 0), dms(-123, 7, 0))).toBe(false);
    expect(isWithinBritishColumbia(dms(49, 17, 0), dms(-123, NaN, 0))).toBe(false);
  });

  it('rejects points just outside the northern and southern extremes', () => {
    const insideLongitude = dms(-125, 0, 0);
    // The polygon's northern edge runs 60°53'N (NW) to 61°28'N (NE); 62°N clears both.
    expect(isWithinBritishColumbia(dms(62, 0, 0), insideLongitude)).toBe(false);
    // Southern edge runs 46°18'N (SW) to 46°28'N (SE); 45°N is below both.
    expect(isWithinBritishColumbia(dms(45, 0, 0), insideLongitude)).toBe(false);
  });
});

/**
 * The inline message has to read exactly like the round-trip one, because the server still
 * refuses boundary-edge points this check lets through.
 */
describe('OUTSIDE_BRITISH_COLUMBIA_MESSAGE', () => {
  it("matches the server's wording verbatim", () => {
    // ScaleSiteService.java, which in turn matches legacy `errors.scale_site_coordinates_not_within_bc`.
    expect(OUTSIDE_BRITISH_COLUMBIA_MESSAGE).toBe(
      'The coordinates specified are not within the boundaries of BC.',
    );
  });
});

/** Guards the copy against drift from the server's constants. */
describe('BC_BOUNDARY_CORNERS', () => {
  it('matches the legacy Constants.BC_BOUNDARY_* values the server uses', () => {
    expect(BC_BOUNDARY_CORNERS).toEqual({
      NW: { latDeg: 60, latMin: 53, lonDeg: 142, lonMin: 26 },
      NE: { latDeg: 61, latMin: 28, lonDeg: 108, lonMin: 10 },
      SE: { latDeg: 46, latMin: 28, lonDeg: 110, lonMin: 32 },
      SW: { latDeg: 46, latMin: 18, lonDeg: 136, lonMin: 32 },
    });
  });
});
