import type { AuditDetails } from './audit.types';

export interface ScalerExamDetail extends AuditDetails {
  scalerLicenceNo?: string | null;
  scalerTrainingTypeId?: string | null;
  scalerTrainingClassCode?: string | null;
  completionDate?: string | null;
}

export interface ScalerExamRequest {
  scalerTrainingTypeId: string;
  completionDate?: string | null;
}
