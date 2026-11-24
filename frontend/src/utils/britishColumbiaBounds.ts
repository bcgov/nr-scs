/**
 * Client-side mirror of the server's BC-boundary check.
 *
 * The authoritative check is
 * {@link ../../../backend/src/main/java/ca/bc/gov/nrs/scs/backend/domain/scalesite/BritishColumbiaCoordinateValidator.java
 * BritishColumbiaCoordinateValidator}, which itself ports the legacy
 * `ca.bc.gov.mof.scs.integration.validation.coordinates.bc.BritishColumbiaCoordinateValidator`.
 * This copy exists so an out-of-BC coordinate is an inline field error while the user is still in
 * the form, rather than a save round-trip — the legacy screen validated in-form too. The server
 * still re-checks every save; nothing here is a security or integrity control.
 *
 * Every quirk of the Java version is reproduced deliberately, because a client that disagreed with
 * the server would either block a valid site or promise a save that then fails:
 *  - the same four corner constants (legacy `Constants.BC_BOUNDARY_*`),
 *  - the ×10,000 scaling with truncation toward zero (Java's `(int)` cast),
 *  - the corner-point shortcut, which the polygon test would otherwise fail on,
 *  - longitude compared by magnitude, so 123 and -123 resolve to the same BC point.
 *
 * Where it deliberately differs: a point exactly on a boundary edge counts as inside. Java's
 * `java.awt.Polygon.contains` excludes the right/bottom edges, and reproducing that off-by-one
 * would let the client reject a coordinate the server accepts. Erring toward "inside" keeps this
 * check no stricter than the server's — an edge point the server refuses still gets refused, just
 * on the round trip instead of inline.
 */

/** Legacy `Constants.BC_BOUNDARY_*`, degrees and minutes of each corner. Longitude is west, unsigned. */
export const BC_BOUNDARY_CORNERS = {
  NW: { latDeg: 60, latMin: 53, lonDeg: 142, lonMin: 26 },
  NE: { latDeg: 61, latMin: 28, lonDeg: 108, lonMin: 10 },
  SE: { latDeg: 46, latMin: 28, lonDeg: 110, lonMin: 32 },
  SW: { latDeg: 46, latMin: 18, lonDeg: 136, lonMin: 32 },
} as const;

/** Matches `BritishColumbiaCoordinateValidator.MULTIPLIER` / legacy `GeographicCoordinates.MULTIPLIER`. */
const MULTIPLIER = 10_000;

export type DmsNumbers = {
  degrees: number;
  minutes: number;
  seconds: number;
};

/** The server's wording for this refusal, so an inline error and a round-trip error read alike. */
export const OUTSIDE_BRITISH_COLUMBIA_MESSAGE =
  'The coordinates specified are not within the boundaries of BC.';

/** `(int) (decimalDegrees * 10000)` — `Math.trunc` matches Java's truncate-toward-zero cast. */
const toIntDegrees = (degrees: number, minutes: number, seconds: number): number =>
  Math.trunc((degrees + minutes / 60 + seconds / 3600) * MULTIPLIER);

/** Polygon vertices as [x, y] = [longitude, latitude], wound NW → NE → SE → SW as the server winds them. */
const boundaryPolygon = (): Array<[number, number]> =>
  [
    BC_BOUNDARY_CORNERS.NW,
    BC_BOUNDARY_CORNERS.NE,
    BC_BOUNDARY_CORNERS.SE,
    BC_BOUNDARY_CORNERS.SW,
  ].map((corner) => [
    toIntDegrees(corner.lonDeg, corner.lonMin, 0),
    toIntDegrees(corner.latDeg, corner.latMin, 0),
  ]);

const isCornerPoint = (lonInt: number, latInt: number): boolean =>
  boundaryPolygon().some(([x, y]) => x === lonInt && y === latInt);

/** True when (x, y) lies on the closed segment (x1, y1)–(x2, y2). All inputs are integers, so exact. */
const isOnSegment = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean => {
  if ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) !== 0) {
    return false;
  }
  return (
    x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)
  );
};

/** Even-odd ray cast, the same insideness rule `java.awt.Polygon.contains` uses. */
const isInsidePolygon = (x: number, y: number, polygon: Array<[number, number]>): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (isOnSegment(x, y, xi, yi, xj, yj)) {
      return true;
    }
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

/**
 * Whether a latitude/longitude pair falls inside the rough BC boundary polygon.
 *
 * Longitude is taken by magnitude, matching the server, so both the legacy unsigned-west
 * convention (123) and the rebuild's signed one (-123) resolve to the same point.
 * A non-finite part makes the whole coordinate out of bounds, as a null part does on the server.
 */
export const isWithinBritishColumbia = (
  latitude: DmsNumbers | null,
  longitude: DmsNumbers | null,
): boolean => {
  if (!latitude || !longitude) {
    return false;
  }
  const parts = [
    latitude.degrees,
    latitude.minutes,
    latitude.seconds,
    longitude.degrees,
    longitude.minutes,
    longitude.seconds,
  ];
  if (parts.some((part) => !Number.isFinite(part))) {
    return false;
  }

  const latInt = toIntDegrees(latitude.degrees, latitude.minutes, latitude.seconds);
  const lonInt = toIntDegrees(Math.abs(longitude.degrees), longitude.minutes, longitude.seconds);

  return isCornerPoint(lonInt, latInt) || isInsidePolygon(lonInt, latInt, boundaryPolygon());
};
