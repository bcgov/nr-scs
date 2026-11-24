import type { DmsInvalidParts, DmsValue } from '@/components/core/DmsInput';
import { SCALE_SITE_PRIORITY_CODE, type ScaleSitePriorityCode } from '@/services/scaleSites.constants';
import type {
  Coordinate,
  ScaleSiteCreateRequest,
  ScaleSiteSummary,
  ScaleSiteUpdateRequest,
  SiteScalingMethodInput,
} from '@/services/scaleSites.service';
import { OUTSIDE_BRITISH_COLUMBIA_MESSAGE, isWithinBritishColumbia } from '@/utils/britishColumbiaBounds';

export type ScaleSiteFormMode = 'create' | 'edit';

export interface ScaleSiteFormValues {
  scaleSiteName: string;
  ownerClient: string;
  ownerLoc: string;
  regDist: string;
  timberBrand: string;
  latitude: DmsValue;
  longitude: DmsValue;
  siteLocationDescription: string;
  primarySiteType: string;
  secondarySiteType: string;
  tertiarySiteType: string;
}

export type ScaleSiteFormErrors = Record<string, string>;

export interface ScaleSiteSiteTypeOption {
  code: string;
  description: string;
}


const emptyDms: DmsValue = { degrees: '', minutes: '', seconds: '' };

const PRIORITY_CODES: ScaleSitePriorityCode[] = [
  SCALE_SITE_PRIORITY_CODE.PRIMARY,
  SCALE_SITE_PRIORITY_CODE.SECONDARY,
  SCALE_SITE_PRIORITY_CODE.TERTIARY,
];

const isBetween = (value: number, min: number, max: number) => value >= min && value <= max;

const parseInt10 = (raw: string): number | null | typeof NaN => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return NaN;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : NaN;
};

const isDmsEmpty = (dms: DmsValue) =>
  dms.degrees.trim() === '' && dms.minutes.trim() === '' && dms.seconds.trim() === '';

const isDmsComplete = (dms: DmsValue) =>
  dms.degrees.trim() !== '' && dms.minutes.trim() !== '' && dms.seconds.trim() !== '';

const dmsToCoordinate = (dms: DmsValue): Coordinate | null => {
  if (isDmsEmpty(dms)) {
    return null;
  }
  return {
    degrees: Number(dms.degrees.trim()),
    minutes: Number(dms.minutes.trim()),
    seconds: Number(dms.seconds.trim()),
  };
};

const coordinateToDms = (
  degrees: number | null | undefined,
  minutes: number | null | undefined,
  seconds: number | null | undefined,
): DmsValue => {
  if (degrees == null && minutes == null && seconds == null) {
    return { ...emptyDms };
  }
  return {
    degrees: degrees == null ? '' : String(degrees),
    minutes: minutes == null ? '' : String(minutes),
    seconds: seconds == null ? '' : String(seconds),
  };
};

// Every reason this coordinate is invalid — one message per offending sub-field, in
// degrees→minutes→seconds order, so all failures can be shown at once (the legacy app
// listed a separate message per invalid sub-field). Empty when the coordinate is valid.
export const coordinateFieldMessages = (
  coord: DmsValue,
  dimension: 'latitude' | 'longitude',
): string[] => {
  if (isDmsEmpty(coord)) {
    return [];
  }

  const label = dimension === 'latitude' ? 'Latitude' : 'Longitude';
  const maxDegrees = dimension === 'latitude' ? 90 : 180;

  // A partially-filled coordinate is a single whole-group failure, not per-sub-field ones.
  if (!isDmsComplete(coord)) {
    return [`${label} must include degrees, minutes, and seconds.`];
  }

  const deg = parseInt10(coord.degrees);
  const min = parseInt10(coord.minutes);
  const sec = parseInt10(coord.seconds);

  const messages: string[] = [];
  if (deg === null || Number.isNaN(deg)) {
    messages.push(`${label} degrees must be an integer.`);
  } else if (!isBetween(deg, -maxDegrees, maxDegrees)) {
    messages.push(`${label} degrees must be between -${maxDegrees} and ${maxDegrees}.`);
  }
  if (min === null || Number.isNaN(min)) {
    messages.push(`${label} minutes must be an integer.`);
  } else if (!isBetween(min, 0, 59)) {
    messages.push(`${label} minutes must be between 0 and 59.`);
  }
  if (sec === null || Number.isNaN(sec)) {
    messages.push(`${label} seconds must be an integer.`);
  } else if (!isBetween(sec, 0, 59)) {
    messages.push(`${label} seconds must be between 0 and 59.`);
  }

  return messages;
};

// First failure only — kept for the errors map (drives `ok`/`showError` and the single-message
// fallback for cross-field and server-side coordinate errors).
const validateCoordinate = (
  coord: DmsValue,
  dimension: 'latitude' | 'longitude',
): string | null => coordinateFieldMessages(coord, dimension)[0] ?? null;

// Which individual sub-fields (degrees/minutes/seconds) are invalid, so the form can
// highlight only the offending one(s) instead of reddening the whole group.
// Returns undefined when no *specific* sub-field is at fault (e.g. an empty coordinate
// flagged by the cross-field rule, or a whole-coordinate server error) — the caller then
// falls back to group-level highlighting.
export const coordinateInvalidParts = (
  coord: DmsValue,
  dimension: 'latitude' | 'longitude',
): DmsInvalidParts | undefined => {
  if (isDmsEmpty(coord)) {
    return undefined;
  }

  const maxDegrees = dimension === 'latitude' ? 90 : 180;

  // Incomplete: only the blank sub-field(s) are at fault.
  if (!isDmsComplete(coord)) {
    return {
      degrees: coord.degrees.trim() === '',
      minutes: coord.minutes.trim() === '',
      seconds: coord.seconds.trim() === '',
    };
  }

  const deg = parseInt10(coord.degrees);
  const min = parseInt10(coord.minutes);
  const sec = parseInt10(coord.seconds);

  const parts: DmsInvalidParts = {
    degrees: deg === null || Number.isNaN(deg) || !isBetween(deg, -maxDegrees, maxDegrees),
    minutes: min === null || Number.isNaN(min) || !isBetween(min, 0, 59),
    seconds: sec === null || Number.isNaN(sec) || !isBetween(sec, 0, 59),
  };

  if (!parts.degrees && !parts.minutes && !parts.seconds) {
    return undefined;
  }
  return parts;
};


export const createEmptyScaleSiteFormValues = (): ScaleSiteFormValues => ({
  scaleSiteName: '',
  ownerClient: '',
  ownerLoc: '00',
  regDist: '',
  timberBrand: '',
  latitude: { ...emptyDms },
  longitude: { ...emptyDms },
  siteLocationDescription: '',
  primarySiteType: '',
  secondarySiteType: '',
  tertiarySiteType: '',
});

export const toScaleSiteFormValues = (summary: ScaleSiteSummary): ScaleSiteFormValues => {
  const slots = { primary: '', secondary: '', tertiary: '' };
  for (const siteType of summary.siteTypes ?? []) {
    const code = siteType.scaleMethodTypeCode ?? '';
    if (siteType.priorityCode === SCALE_SITE_PRIORITY_CODE.PRIMARY) {
      slots.primary = code;
    } else if (siteType.priorityCode === SCALE_SITE_PRIORITY_CODE.SECONDARY) {
      slots.secondary = code;
    } else if (siteType.priorityCode === SCALE_SITE_PRIORITY_CODE.TERTIARY) {
      slots.tertiary = code;
    }
  }

  return {
    scaleSiteName: summary.siteName ?? '',
    ownerClient: summary.ownerClientNumber ?? '',
    ownerLoc: summary.ownerClientLocnCode ?? '00',
    regDist: summary.orgUnitNo == null ? '' : String(summary.orgUnitNo),
    timberBrand: summary.timberBrand ?? '',
    latitude: coordinateToDms(summary.latitudeDegrees, summary.latitudeMinutes, summary.latitudeSeconds),
    longitude: coordinateToDms(summary.longitudeDegrees, summary.longitudeMinutes, summary.longitudeSeconds),
    siteLocationDescription: summary.siteLocation ?? '',
    primarySiteType: slots.primary,
    secondarySiteType: slots.secondary,
    tertiarySiteType: slots.tertiary,
  };
};

export const validateScaleSiteForm = (
  values: ScaleSiteFormValues,
): { ok: boolean; errors: ScaleSiteFormErrors } => {
  const errors: ScaleSiteFormErrors = {};
  const required = (key: string, ok: boolean, message: string) => {
    if (!ok) {
      errors[key] = message;
    }
  };

  required('scaleSiteName', values.scaleSiteName.trim().length > 0, 'Scale Site Name is required.');
  required('ownerClient', values.ownerClient.trim().length > 0, 'Owner client is required.');
  required('ownerLoc', values.ownerLoc.trim().length > 0, 'Owner loc is required.');
  required('regDist', values.regDist.trim().length > 0, 'Reg / Dist is required.');
  required(
    'siteLocation',
    values.siteLocationDescription.trim().length > 0,
    'Description of Site Location is required.',
  );
  required('primarySiteType', values.primarySiteType.trim().length > 0, 'Primary site type is required.');

  const timberBrandTrimmed = values.timberBrand.trim();
  if (timberBrandTrimmed.length > 0) {
    const timberBrandNormalized = timberBrandTrimmed.toUpperCase();
    const length = timberBrandNormalized.length;
    if (length < 6 || length > 7 || !/^[A-Z]{3}/.test(timberBrandNormalized)) {
      errors.timberBrand = "Timber brand format must be 'LLLXXX' or 'LLLXXXX'.";
    }
  }

  const codes = [values.primarySiteType, values.secondarySiteType, values.tertiarySiteType]
    .map((code) => code.trim())
    .filter((code) => code !== '');
  if (codes.length !== new Set(codes).size) {
    errors.siteTypes = 'Site type codes must be distinct.';
  }

  const latitudeError = validateCoordinate(values.latitude, 'latitude');
  if (latitudeError) {
    errors.latitude = latitudeError;
  }
  const longitudeError = validateCoordinate(values.longitude, 'longitude');
  if (longitudeError) {
    errors.longitude = longitudeError;
  }

  if (!isDmsEmpty(values.latitude) !== !isDmsEmpty(values.longitude)) {
    errors.latitude = errors.latitude ?? 'Latitude and longitude must both be provided or both be omitted.';
    errors.longitude = errors.longitude ?? 'Latitude and longitude must both be provided or both be omitted.';
  }

  // A well-formed pair still has to land inside BC. Only worth asking once both coordinates are
  // complete and individually valid -- otherwise the answer is meaningless and would bury the
  // more specific per-sub-field message. The server re-checks this on every save; running it here
  // just turns a save round-trip into an inline error, as the legacy screen did.
  const coordinatesSupplied = !isDmsEmpty(values.latitude) && !isDmsEmpty(values.longitude);
  if (coordinatesSupplied && !errors.latitude && !errors.longitude) {
    if (!isWithinBritishColumbia(dmsToCoordinate(values.latitude), dmsToCoordinate(values.longitude))) {
      errors.latitude = OUTSIDE_BRITISH_COLUMBIA_MESSAGE;
      errors.longitude = OUTSIDE_BRITISH_COLUMBIA_MESSAGE;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
};

const buildScalingMethods = (values: ScaleSiteFormValues): SiteScalingMethodInput[] => {
  const slots = [values.primarySiteType, values.secondarySiteType, values.tertiarySiteType];
  return slots
    .map((code, idx) => ({ code: code.trim(), priority: PRIORITY_CODES[idx] }))
    .filter((slot) => slot.code !== '')
    .map((slot) => ({ scaleMethodTypeCode: slot.code, scaleSitePriorityCode: slot.priority }));
};

export const buildCreateRequest = (values: ScaleSiteFormValues): ScaleSiteCreateRequest => ({
  siteName: values.scaleSiteName.trim(),
  ownerClientNumber: values.ownerClient.trim(),
  ownerClientLocnCode: values.ownerLoc.trim(),
  orgUnitNo: Number(values.regDist),
  siteLocation: values.siteLocationDescription.trim(),
  timberBrand: values.timberBrand.trim() === '' ? null : values.timberBrand.trim(),
  latitude: dmsToCoordinate(values.latitude),
  longitude: dmsToCoordinate(values.longitude),
  scalingMethods: buildScalingMethods(values),
});

// Still needed even though `validateScaleSiteForm` now runs the BC check client-side: the server
// is authoritative, and `britishColumbiaBounds.ts` deliberately treats boundary-edge points as
// inside, so an edge coordinate can pass here and be refused there. String-match coupling is
// brittle -- a backend wording change falls through to the banner -- so the matched substring is
// kept short, and `OUTSIDE_BRITISH_COLUMBIA_MESSAGE` holds the server's exact wording
// (`ScaleSiteService.java`, which in turn matches legacy
// `errors.scale_site_coordinates_not_within_bc`).
export const mapServerErrorToFormErrors = (
  message: string,
): { fieldErrors: ScaleSiteFormErrors; formError: string | null } => {
  if (/boundaries of bc/i.test(message)) {
    return {
      fieldErrors: { latitude: message, longitude: message },
      formError: null,
    };
  }
  return { fieldErrors: {}, formError: message };
};

export const buildUpdateRequest = (values: ScaleSiteFormValues): ScaleSiteUpdateRequest => ({
  siteName: values.scaleSiteName.trim(),
  ownerClientNumber: values.ownerClient.trim(),
  ownerClientLocnCode: values.ownerLoc.trim(),
  orgUnitNo: Number(values.regDist),
  siteLocation: values.siteLocationDescription.trim(),
  timberBrand: values.timberBrand.trim() === '' ? null : values.timberBrand.trim(),
  latitude: dmsToCoordinate(values.latitude),
  longitude: dmsToCoordinate(values.longitude),
  scalingMethods: buildScalingMethods(values),
});
