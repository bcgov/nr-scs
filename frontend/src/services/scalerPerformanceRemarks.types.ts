import type { AuditDetails } from './audit.types';

export interface ScalerPerformanceRemarkCreateRequest {
  loggedTimestamp: string;
  scalerPerformanceActnCode?: string | null;
  scalerPerformanceOutcmCode?: string | null;
  performanceRemarkDesc: string;
  outcomeDesc?: string | null;
  suspendStartDate?: string | null;
  suspendEndDate?: string | null;
  checkScaleId?: number | null;
}

// The update payload edits the same fields as create (Issue # is read-only, the id is in the path).
export interface ScalerPerformanceRemarkUpdateRequest {
  loggedTimestamp: string;
  scalerPerformanceActnCode?: string | null;
  scalerPerformanceOutcmCode?: string | null;
  performanceRemarkDesc: string;
  outcomeDesc?: string | null;
  suspendStartDate?: string | null;
  suspendEndDate?: string | null;
  checkScaleId?: number | null;
}

export interface ScalerPerformanceRemarkDetail extends AuditDetails {
  scalerPerformanceRemarkId?: number | null;
  scalerLicenceNo?: string | null;
  loggedTimestamp?: string | null;
  loggedUserid?: string | null;
  performanceRemarkDesc?: string | null;
  scalerPerformanceActnCode?: string | null;
  scalerPerformanceActnDescription?: string | null;
  scalerPerformanceOutcmCode?: string | null;
  scalerPerformanceOutcmDescription?: string | null;
  outcomeDesc?: string | null;
  suspendStartDate?: string | null;
  suspendEndDate?: string | null;
  checkScaleId?: number | null;
}
