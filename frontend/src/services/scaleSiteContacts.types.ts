import type { AuditDetails } from './audit.types';

export interface ScaleSiteContact extends AuditDetails {
  clientContactId?: number | null;
  scaleSiteIdNmbr?: string | null;
  primaryContactInd?: 'Y' | 'N' | null;
  contactName?: string | null;
  contactRoleDescription?: string | null;
  businessPhone?: string | null;
  cellPhone?: string | null;
  faxNumber?: string | null;
  emailAddress?: string | null;
  siteInformationAccessInd?: 'Y' | 'N' | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export interface ClientContactSearchResult {
  clientContactId?: number | null;
  contactName?: string | null;
  clientNumber?: string | null;
  clientLocnCode?: string | null;
  businessPhone?: string | null;
  emailAddress?: string | null;
}

export interface ScaleSiteContactCreateRequest {
  clientContactId: number;
  contactRoleDescription: string;
  primaryContactInd: 'Y' | 'N';
  siteInformationAccessInd: 'Y' | 'N';
  effectiveDate: string;
  expiryDate?: string | null;
}

export interface ScaleSiteContactUpdateRequest {
  contactRoleDescription: string;
  primaryContactInd: 'Y' | 'N';
  siteInformationAccessInd: 'Y' | 'N';
  effectiveDate: string;
  expiryDate?: string | null;
}

export interface ScaleSiteOwner {
  scaleSiteIdNmbr?: string | null;
  clientNumber?: string | null;
  clientLocnCode?: string | null;
  companyName?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  businessPhone?: string | null;
  residentPhone?: string | null;
  cellPhone?: string | null;
  fax?: string | null;
  email?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  postalCode?: string | null;
}
