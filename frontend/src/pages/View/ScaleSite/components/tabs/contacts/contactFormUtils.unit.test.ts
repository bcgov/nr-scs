import { describe, expect, it } from 'vitest';

import type { ScaleSiteContact } from '@/services/scaleSiteContacts.types';
import {
  buildCreateRequest,
  buildUpdateRequest,
  createEmptyContactFormValues,
  toContactFormValues,
  validateContactForm,
  type ContactFormValues,
} from './contactFormUtils';

const valid = (overrides: Partial<ContactFormValues> = {}): ContactFormValues => ({
  clientContactId: '1234',
  contactRoleDescription: 'Site manager',
  primaryContactInd: 'Y',
  siteInformationAccessInd: 'Y',
  effectiveDate: '2026-01-01',
  expiryDate: '',
  ...overrides,
});

describe('createEmptyContactFormValues', () => {
  it('starts every field blank', () => {
    expect(createEmptyContactFormValues()).toEqual({
      clientContactId: '',
      contactRoleDescription: '',
      primaryContactInd: '',
      siteInformationAccessInd: '',
      effectiveDate: '',
      expiryDate: '',
    });
  });

  it('returns a fresh object each time, not a shared one', () => {
    const first = createEmptyContactFormValues();
    first.clientContactId = '1';

    expect(createEmptyContactFormValues().clientContactId).toBe('');
  });
});

describe('toContactFormValues', () => {
  it('maps a contact onto the form shape', () => {
    const contact = {
      clientContactId: 1234,
      contactRoleDescription: 'Site manager',
      primaryContactInd: 'Y',
      siteInformationAccessInd: 'N',
      effectiveDate: '2026-01-01',
      expiryDate: '2026-12-31',
    } as ScaleSiteContact;

    expect(toContactFormValues(contact)).toEqual({
      clientContactId: '1234',
      contactRoleDescription: 'Site manager',
      primaryContactInd: 'Y',
      siteInformationAccessInd: 'N',
      effectiveDate: '2026-01-01',
      expiryDate: '2026-12-31',
    });
  });

  it('renders a numeric id as a string for the text input', () => {
    expect(toContactFormValues({ clientContactId: 7 } as ScaleSiteContact).clientContactId).toBe('7');
  });

  it('turns a null id into an empty string, never the text "null"', () => {
    expect(
      toContactFormValues({ clientContactId: null } as unknown as ScaleSiteContact).clientContactId,
    ).toBe('');
  });

  it('blanks an indicator that is neither Y nor N', () => {
    const contact = {
      primaryContactInd: 'X',
      siteInformationAccessInd: null,
    } as unknown as ScaleSiteContact;

    expect(toContactFormValues(contact).primaryContactInd).toBe('');
    expect(toContactFormValues(contact).siteInformationAccessInd).toBe('');
  });

  it('blanks absent dates', () => {
    const values = toContactFormValues({} as ScaleSiteContact);

    expect(values.effectiveDate).toBe('');
    expect(values.expiryDate).toBe('');
  });
});

describe('validateContactForm', () => {
  it('accepts a complete form', () => {
    expect(validateContactForm(valid())).toEqual({});
  });

  it('requires a client contact id', () => {
    expect(validateContactForm(valid({ clientContactId: '  ' })).clientContactId).toBe(
      'Client Contact ID is required.',
    );
  });

  it('requires the client contact id to be numeric', () => {
    expect(validateContactForm(valid({ clientContactId: 'abc' })).clientContactId).toBe(
      'Client Contact ID must be a valid number.',
    );
  });

  it('requires a contact role', () => {
    expect(validateContactForm(valid({ contactRoleDescription: '' })).contactRoleDescription).toBe(
      'Contact Role is required.',
    );
  });

  it('caps the contact role at 40 characters', () => {
    expect(
      validateContactForm(valid({ contactRoleDescription: 'x'.repeat(41) }))
        .contactRoleDescription,
    ).toBe('Contact Role must be 40 characters or fewer.');
  });

  it('accepts a contact role of exactly 40 characters', () => {
    expect(
      validateContactForm(valid({ contactRoleDescription: 'x'.repeat(40) }))
        .contactRoleDescription,
    ).toBeUndefined();
  });

  it('requires the site information access indicator', () => {
    expect(
      validateContactForm(valid({ siteInformationAccessInd: '' })).siteInformationAccessInd,
    ).toBe('Site Information Access is required.');
  });

  it('requires an effective date', () => {
    expect(validateContactForm(valid({ effectiveDate: '' })).effectiveDate).toBe(
      'Effective Date is required.',
    );
  });

  it('rejects an unparseable effective date', () => {
    expect(validateContactForm(valid({ effectiveDate: 'not-a-date' })).effectiveDate).toBe(
      'Effective Date must be a valid date (YYYY-MM-DD).',
    );
  });

  it('treats an absent expiry date as valid — it is optional', () => {
    expect(validateContactForm(valid({ expiryDate: '' })).expiryDate).toBeUndefined();
  });

  it('rejects an unparseable expiry date', () => {
    expect(validateContactForm(valid({ expiryDate: 'not-a-date' })).expiryDate).toBe(
      'Expiry Date must be a valid date (YYYY-MM-DD).',
    );
  });

  it('rejects an expiry date before the effective date', () => {
    expect(
      validateContactForm(valid({ effectiveDate: '2026-06-01', expiryDate: '2026-01-01' }))
        .expiryDate,
    ).toBe('Expiry Date must be on or after the Effective Date.');
  });

  it('accepts an expiry date equal to the effective date — the rule is "on or after"', () => {
    expect(
      validateContactForm(valid({ effectiveDate: '2026-06-01', expiryDate: '2026-06-01' }))
        .expiryDate,
    ).toBeUndefined();
  });

  it('reports every problem at once', () => {
    const errors = validateContactForm(createEmptyContactFormValues());

    expect(Object.keys(errors).sort()).toEqual([
      'clientContactId',
      'contactRoleDescription',
      'effectiveDate',
      'siteInformationAccessInd',
    ]);
  });
});

describe('buildCreateRequest', () => {
  it('builds the request from a complete form', () => {
    expect(buildCreateRequest(valid())).toEqual({
      clientContactId: 1234,
      contactRoleDescription: 'Site manager',
      primaryContactInd: 'Y',
      siteInformationAccessInd: 'Y',
      effectiveDate: '2026-01-01',
      expiryDate: null,
    });
  });

  it('trims the id and role', () => {
    const request = buildCreateRequest(
      valid({ clientContactId: ' 1234 ', contactRoleDescription: '  Site manager  ' }),
    );

    expect(request.clientContactId).toBe(1234);
    expect(request.contactRoleDescription).toBe('Site manager');
  });

  it('sends an absent expiry date as null rather than an empty string', () => {
    expect(buildCreateRequest(valid({ expiryDate: '' })).expiryDate).toBeNull();
  });

  it('keeps a supplied expiry date', () => {
    expect(buildCreateRequest(valid({ expiryDate: '2026-12-31' })).expiryDate).toBe('2026-12-31');
  });

  it('refuses to build from an incomplete form rather than sending a blank indicator', () => {
    expect(() => buildCreateRequest(valid({ primaryContactInd: '' }))).toThrow(
      'Contact form is incomplete.',
    );
    expect(() => buildCreateRequest(valid({ siteInformationAccessInd: '' }))).toThrow(
      'Contact form is incomplete.',
    );
  });
});

describe('buildUpdateRequest', () => {
  it('builds the request without the id, which is not editable', () => {
    const request = buildUpdateRequest(valid());

    expect(request).toEqual({
      contactRoleDescription: 'Site manager',
      primaryContactInd: 'Y',
      siteInformationAccessInd: 'Y',
      effectiveDate: '2026-01-01',
      expiryDate: null,
    });
    expect('clientContactId' in request).toBe(false);
  });

  it('refuses to build from an incomplete form', () => {
    expect(() => buildUpdateRequest(valid({ primaryContactInd: '' }))).toThrow(
      'Contact form is incomplete.',
    );
  });
});
