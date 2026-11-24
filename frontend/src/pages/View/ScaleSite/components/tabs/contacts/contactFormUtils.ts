import type {
  ScaleSiteContact,
  ScaleSiteContactCreateRequest,
  ScaleSiteContactUpdateRequest,
} from '@/services/scaleSiteContacts.types';
import { compareDateOnly, isValidDateOnly } from '@/utils/dateOnly';

export interface ContactFormValues {
  clientContactId: string;
  contactRoleDescription: string;
  primaryContactInd: 'Y' | 'N' | '';
  siteInformationAccessInd: 'Y' | 'N' | '';
  effectiveDate: string;
  expiryDate: string;
}

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

export function createEmptyContactFormValues(): ContactFormValues {
  return {
    clientContactId: '',
    contactRoleDescription: '',
    primaryContactInd: '',
    siteInformationAccessInd: '',
    effectiveDate: '',
    expiryDate: '',
  };
}

export function toContactFormValues(contact: ScaleSiteContact): ContactFormValues {
  return {
    clientContactId: contact.clientContactId != null ? String(contact.clientContactId) : '',
    contactRoleDescription: contact.contactRoleDescription ?? '',
    primaryContactInd:
      contact.primaryContactInd === 'Y' || contact.primaryContactInd === 'N'
        ? contact.primaryContactInd
        : '',
    siteInformationAccessInd:
      contact.siteInformationAccessInd === 'Y' || contact.siteInformationAccessInd === 'N'
        ? contact.siteInformationAccessInd
        : '',
    effectiveDate: contact.effectiveDate ?? '',
    expiryDate: contact.expiryDate ?? '',
  };
}

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {};

  if (!values.clientContactId.trim()) {
    errors.clientContactId = 'Client Contact ID is required.';
  } else if (Number.isNaN(Number(values.clientContactId.trim()))) {
    errors.clientContactId = 'Client Contact ID must be a valid number.';
  }

  if (!values.contactRoleDescription.trim()) {
    errors.contactRoleDescription = 'Contact Role is required.';
  } else if (values.contactRoleDescription.trim().length > 40) {
    errors.contactRoleDescription = 'Contact Role must be 40 characters or fewer.';
  }


  if (!values.siteInformationAccessInd) {
    errors.siteInformationAccessInd = 'Site Information Access is required.';
  } else if (values.siteInformationAccessInd !== 'Y' && values.siteInformationAccessInd !== 'N') {
    errors.siteInformationAccessInd = 'Site Information Access must be Y or N.';
  }

  if (!values.effectiveDate) {
    errors.effectiveDate = 'Effective Date is required.';
  } else if (!isValidDateOnly(values.effectiveDate)) {
    errors.effectiveDate = 'Effective Date must be a valid date (YYYY-MM-DD).';
  }

  if (values.expiryDate) {
    if (!isValidDateOnly(values.expiryDate)) {
      errors.expiryDate = 'Expiry Date must be a valid date (YYYY-MM-DD).';
    } else if (values.effectiveDate && isValidDateOnly(values.effectiveDate)) {
      if (compareDateOnly(values.expiryDate, values.effectiveDate) < 0) {
        errors.expiryDate = 'Expiry Date must be on or after the Effective Date.';
      }
    }
  }

  return errors;
}

export function buildCreateRequest(values: ContactFormValues): ScaleSiteContactCreateRequest {
  if (!values.primaryContactInd || !values.siteInformationAccessInd) {
    throw new Error('Contact form is incomplete.');
  }

  return {
    clientContactId: Number(values.clientContactId.trim()),
    contactRoleDescription: values.contactRoleDescription.trim(),
    primaryContactInd: values.primaryContactInd as 'Y' | 'N',
    siteInformationAccessInd: values.siteInformationAccessInd as 'Y' | 'N',
    effectiveDate: values.effectiveDate,
    expiryDate: values.expiryDate || null,
  };
}

export function buildUpdateRequest(values: ContactFormValues): ScaleSiteContactUpdateRequest {
  if (!values.primaryContactInd || !values.siteInformationAccessInd) {
    throw new Error('Contact form is incomplete.');
  }

  return {
    contactRoleDescription: values.contactRoleDescription.trim(),
    primaryContactInd: values.primaryContactInd as 'Y' | 'N',
    siteInformationAccessInd: values.siteInformationAccessInd as 'Y' | 'N',
    effectiveDate: values.effectiveDate,
    expiryDate: values.expiryDate || null,
  };
}


