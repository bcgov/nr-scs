import type { ScalerPerformanceRemarkDetail } from '@/services/scalerPerformanceRemarks.types';

/**
 * Legacy "Issue Type": the action description immediately followed by the outcome description
 * (a remark carries one or the other, never both). Falls back to the raw code when a description
 * has not been resolved server-side. Shared by the summary table column and the read-only detail
 * panel so both render the value identically.
 */
export const issueTypeLabel = (remark: ScalerPerformanceRemarkDetail): string => {
  const action =
    remark.scalerPerformanceActnDescription ?? remark.scalerPerformanceActnCode ?? '';
  const outcome =
    remark.scalerPerformanceOutcmDescription ?? remark.scalerPerformanceOutcmCode ?? '';
  return [action, outcome].map((part) => part.trim()).filter(Boolean).join(' ');
};

/** Route to the check-scale view page (legacy `checkScaleView.do`). */
export const checkScaleViewPath = (checkScaleId: number): string =>
  `/check-scales/view/${encodeURIComponent(String(checkScaleId))}`;
