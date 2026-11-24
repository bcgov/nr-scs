import { describe, expect, it } from 'vitest';

import { OUTSIDE_BRITISH_COLUMBIA_MESSAGE } from '@/utils/britishColumbiaBounds';

import { type ScaleSiteFormValues } from './index';
import { buildCreateRequest, buildUpdateRequest, createEmptyScaleSiteFormValues, mapServerErrorToFormErrors, toScaleSiteFormValues, validateScaleSiteForm } from './logic';

const dms = (degrees = '', minutes = '', seconds = '') => ({ degrees, minutes, seconds });

const values = (overrides: Partial<ScaleSiteFormValues> = {}): ScaleSiteFormValues => ({
  ...createEmptyScaleSiteFormValues(),
  scaleSiteName: 'North Yard',
  ownerClient: '00012345',
  ownerLoc: '00',
  regDist: '43',
  siteLocationDescription: 'North of the bridge',
  primarySiteType: 'WT',
  ...overrides,
});

const errorsOf = (v: ScaleSiteFormValues) => validateScaleSiteForm(v).errors;

describe('toScaleSiteFormValues', () => {
  it('reads a full record, placing each site type by its priority', () => {
    const v = toScaleSiteFormValues({
      siteName: 'North Yard',
      ownerClientNumber: '00012345',
      ownerClientLocnCode: '01',
      orgUnitNo: 43,
      timberBrand: 'ABC123',
      latitudeDegrees: 49,
      latitudeMinutes: 10,
      latitudeSeconds: 5,
      longitudeDegrees: -123,
      longitudeMinutes: 0,
      longitudeSeconds: 59,
      siteLocation: 'North of the bridge',
      siteTypes: [
        { scaleMethodTypeCode: 'WT', priorityCode: 'P' },
        { scaleMethodTypeCode: 'PC', priorityCode: 'S' },
        { scaleMethodTypeCode: 'SM', priorityCode: 'T' },
        { scaleMethodTypeCode: 'XX', priorityCode: 'Q' },
        { priorityCode: 'P' },
      ],
    } as never);

    expect(v).toMatchObject({
      scaleSiteName: 'North Yard',
      ownerClient: '00012345',
      ownerLoc: '01',
      regDist: '43',
      timberBrand: 'ABC123',
      latitude: dms('49', '10', '5'),
      longitude: dms('-123', '0', '59'),
      siteLocationDescription: 'North of the bridge',
      primarySiteType: '',
      secondarySiteType: 'PC',
      tertiarySiteType: 'SM',
    });
  });

  it('defaults a sparse record, with loc 00 and empty coordinates', () => {
    const v = toScaleSiteFormValues({} as never);

    expect(v).toMatchObject({ scaleSiteName: '', ownerClient: '', ownerLoc: '00', regDist: '', timberBrand: '', latitude: dms(), longitude: dms(), primarySiteType: '' });
  });

  it('keeps partial coordinates partial', () => {
    expect(toScaleSiteFormValues({ latitudeDegrees: 49 } as never).latitude).toEqual(dms('49', '', ''));
  });
});

describe('validateScaleSiteForm', () => {
  it('names every required field (the loc defaults to 00 and is required only when blanked)', () => {
    expect(errorsOf(createEmptyScaleSiteFormValues())).toEqual({
      scaleSiteName: 'Scale Site Name is required.',
      ownerClient: 'Owner client is required.',
      regDist: 'Reg / Dist is required.',
      siteLocation: 'Description of Site Location is required.',
      primarySiteType: 'Primary site type is required.',
    });
    expect(errorsOf(values({ ownerLoc: ' ' })).ownerLoc).toBe('Owner loc is required.');
  });

  it('passes a complete form', () => {
    expect(validateScaleSiteForm(values())).toEqual({ ok: true, errors: {} });
  });

  it.each(['AB123', 'ABCDEFGH', '12CDEF'])('rejects timber brand "%s"', (timberBrand) => {
    expect(errorsOf(values({ timberBrand })).timberBrand).toBe("Timber brand format must be 'LLLXXX' or 'LLLXXXX'.");
  });

  it.each(['abc123', 'ABC1234', ' abcxyz '])('accepts timber brand "%s"', (timberBrand) => {
    expect(errorsOf(values({ timberBrand }))).toEqual({});
  });

  it('insists the site types differ', () => {
    expect(errorsOf(values({ secondarySiteType: 'WT' })).siteTypes).toBe('Site type codes must be distinct.');
    expect(errorsOf(values({ secondarySiteType: 'PC', tertiarySiteType: 'SM' }))).toEqual({});
  });

  it('requires a complete coordinate once any part is typed', () => {
    const errors = errorsOf(values({ latitude: dms('49'), longitude: dms('-123', '0', '0') }));
    expect(errors.latitude).toBe('Latitude must include degrees, minutes, and seconds.');
    expect(errors.longitude).toBeUndefined();
  });

  it.each([
    [dms('abc', '0', '0'), 'Latitude degrees must be an integer.'],
    [dms('91', '0', '0'), 'Latitude degrees must be between -90 and 90.'],
    [dms('49', 'x', '0'), 'Latitude minutes must be an integer.'],
    [dms('49', '60', '0'), 'Latitude minutes must be between 0 and 59.'],
    [dms('49', '0', 'y'), 'Latitude seconds must be an integer.'],
    [dms('49', '0', '-1'), 'Latitude seconds must be between 0 and 59.'],
  ])('reports the first latitude problem for %j', (latitude, message) => {
    expect(errorsOf(values({ latitude, longitude: dms('-123', '0', '0') })).latitude).toBe(message);
  });

  it('bounds longitude degrees at 180', () => {
    expect(errorsOf(values({ latitude: dms('49', '0', '0'), longitude: dms('181', '0', '0') })).longitude).toBe(
      'Longitude degrees must be between -180 and 180.',
    );
    // -180 clears the range check, so no range message is reported...
    const extreme = errorsOf(values({ latitude: dms('49', '0', '0'), longitude: dms('-180', '59', '59') }));
    expect(extreme.longitude).not.toMatch(/must be between/);
    // ...but the BC check behind it still refuses a point in the middle of the Pacific.
    expect(extreme.longitude).toBe('The coordinates specified are not within the boundaries of BC.');
  });

  it('wants both coordinates or neither', () => {
    const errors = errorsOf(values({ latitude: dms('49', '0', '0') }));
    expect(errors.latitude).toBe('Latitude and longitude must both be provided or both be omitted.');
    expect(errors.longitude).toBe('Latitude and longitude must both be provided or both be omitted.');

    const partial = errorsOf(values({ longitude: dms('', '5', '') }));
    expect(partial.longitude).toBe('Longitude must include degrees, minutes, and seconds.');
    expect(partial.latitude).toBe('Latitude and longitude must both be provided or both be omitted.');
  });
});

describe('buildCreateRequest / buildUpdateRequest', () => {
  it('trims, nulls the blank brand and coordinates, and orders the scaling methods', () => {
    const request = buildCreateRequest(values({ scaleSiteName: ' North Yard ', secondarySiteType: '', tertiarySiteType: 'SM' }));

    expect(request).toEqual({
      siteName: 'North Yard',
      ownerClientNumber: '00012345',
      ownerClientLocnCode: '00',
      orgUnitNo: 43,
      siteLocation: 'North of the bridge',
      timberBrand: null,
      latitude: null,
      longitude: null,
      scalingMethods: [
        { scaleMethodTypeCode: 'WT', scaleSitePriorityCode: 'P' },
        { scaleMethodTypeCode: 'SM', scaleSitePriorityCode: 'T' },
      ],
    });
  });

  it('sends numeric coordinates and the brand when given', () => {
    const request = buildUpdateRequest(
      values({ timberBrand: ' ABC123 ', latitude: dms(' 49 ', '10', '5'), longitude: dms('-123', '0', '59'), secondarySiteType: 'PC' }),
    );

    expect(request).toMatchObject({
      timberBrand: 'ABC123',
      latitude: { degrees: 49, minutes: 10, seconds: 5 },
      longitude: { degrees: -123, minutes: 0, seconds: 59 },
      scalingMethods: [
        { scaleMethodTypeCode: 'WT', scaleSitePriorityCode: 'P' },
        { scaleMethodTypeCode: 'PC', scaleSitePriorityCode: 'S' },
      ],
    });
  });
});

describe('mapServerErrorToFormErrors', () => {
  /**
   * The message asserted here is the one `ScaleSiteService.java` actually throws, character for
   * character (it matches legacy `errors.scale_site_coordinates_not_within_bc`). An earlier version
   * of this test asserted an invented string that happened to contain the matched substring, so it
   * passed without proving the real message maps.
   */
  it("pins the server's own boundaries-of-BC refusal on both coordinates", () => {
    const serverMessage = 'The coordinates specified are not within the boundaries of BC.';

    expect(mapServerErrorToFormErrors(serverMessage)).toEqual({
      fieldErrors: { latitude: serverMessage, longitude: serverMessage },
      formError: null,
    });
  });

  it('uses the same wording the inline client-side check uses', () => {
    expect(OUTSIDE_BRITISH_COLUMBIA_MESSAGE).toBe(
      'The coordinates specified are not within the boundaries of BC.',
    );
    expect(mapServerErrorToFormErrors(OUTSIDE_BRITISH_COLUMBIA_MESSAGE).formError).toBeNull();
  });

  it('banners anything else', () => {
    expect(mapServerErrorToFormErrors('Site name already used.')).toEqual({ fieldErrors: {}, formError: 'Site name already used.' });
  });
});

/**
 * The BC boundary check used to be server-only, so an out-of-BC coordinate cost a save round-trip.
 * The legacy screen validated it in-form; `britishColumbiaBounds.ts` mirrors the server's polygon so
 * it can be inline again. The server still re-checks every save.
 */
describe('validateScaleSiteForm BC boundary check', () => {
  const inBc = { latitude: dms('49', '17', '0'), longitude: dms('-123', '7', '0') };

  it('accepts a coordinate inside BC', () => {
    expect(errorsOf(values(inBc))).toEqual({});
  });

  it('accepts the legacy unsigned-west form of the same point', () => {
    expect(errorsOf(values({ ...inBc, longitude: dms('123', '7', '0') }))).toEqual({});
  });

  it('refuses an in-range coordinate outside BC, on both fields', () => {
    // Toronto, 43°39'N 79°23'W — clears ±90/±180 but is nowhere near the province.
    const errors = errorsOf(values({ latitude: dms('43', '39', '0'), longitude: dms('-79', '23', '0') }));

    expect(errors.latitude).toBe(OUTSIDE_BRITISH_COLUMBIA_MESSAGE);
    expect(errors.longitude).toBe(OUTSIDE_BRITISH_COLUMBIA_MESSAGE);
  });

  it('leaves a coordinate-less record alone', () => {
    expect(errorsOf(values())).toEqual({});
  });

  /** A more specific per-sub-field message must not be replaced by the boundary one. */
  it('defers to a per-sub-field problem rather than reporting the boundary', () => {
    const errors = errorsOf(values({ latitude: dms('49', '60', '0'), longitude: dms('-123', '7', '0') }));

    expect(errors.latitude).toBe('Latitude minutes must be between 0 and 59.');
    expect(errors.longitude).toBeUndefined();
  });

  /** The half-filled case is already a cross-field failure; the boundary check has nothing to say. */
  it('defers to the both-or-neither rule', () => {
    const errors = errorsOf(values({ latitude: dms('43', '39', '0') }));

    expect(errors.latitude).toBe('Latitude and longitude must both be provided or both be omitted.');
    expect(errors.longitude).toBe('Latitude and longitude must both be provided or both be omitted.');
  });
});
