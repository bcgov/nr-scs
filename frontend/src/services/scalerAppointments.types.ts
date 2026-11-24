import type { AuditDetails } from './audit.types';

export type ProvinceWideIndicator = 'Y' | 'N';

export interface ScalerAppointmentDetail extends AuditDetails {
  scalerLicenceAttributeId?: number | null;
  scalerLicenceNo?: string | null;
  scalerAppointmentType?: string | null;
  scaleGradingSystemCode?: string | null;
  orgUnitNo?: number | null;
  provinceWideInd?: ProvinceWideIndicator | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  cancellationDate?: string | null;
  cancellationReasonTxt?: string | null;
}

export interface ScalerAppointmentCreateRequest {
  scalerAppointmentType: string;
  scaleGradingSystemCode: string;
  orgUnitNo?: number | null;
  provinceWideInd: ProvinceWideIndicator;
  issuedDate: string;
  expiryDate?: string | null;
}

export interface ScalerAppointmentUpdateRequest extends ScalerAppointmentCreateRequest {
  cancellationDate?: string | null;
  cancellationReasonTxt?: string | null;
}

