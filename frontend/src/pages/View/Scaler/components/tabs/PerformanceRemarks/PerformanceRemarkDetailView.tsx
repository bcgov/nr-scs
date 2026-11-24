import type { FC } from 'react';
import { useMemo } from 'react';

import PermissionGate from '@/components/PermissionGate';
import Button from '@/components/core/Button';
import { PERMISSIONS } from '@/context/auth/permissions';

import type { ScalerPerformanceRemarkDetail } from '@/services/scalerPerformanceRemarks.types';
import PerformanceRemarksForm from './PerformanceRemarksForm';
import { issueTypeLabel } from './performanceRemarkDisplay';
import { mapDetailToFormValues } from './performanceRemarkFormUtils';

interface Props {
  remark: ScalerPerformanceRemarkDetail;
  onBack: () => void;
  onEdit: () => void;
}

/**
 * Read-only detail for a single performance remark — the modern equivalent of the legacy
 * `scalerPerformanceRemark.jsp` view screen reached by clicking an "Issue #" on the summary tab.
 * Reuses the create/edit field grid (`PerformanceRemarksForm`) in read-only mode so the three
 * screens stay in lock-step, showing only the data the tab already loaded (no extra fetch). Back
 * returns to the list; Edit Record opens the shared edit form and appears only for a caller holding
 * `SCALER_PERFORMANCE_REMARK_UPDATE` — this screen is reachable by clicking an Issue #, so gating the
 * Edit button on the list alone would still leave the edit form one click away for a read-only role.
 */
const PerformanceRemarkDetailView: FC<Props> = ({ remark, onBack, onEdit }) => {
  const values = useMemo(() => mapDetailToFormValues(remark), [remark]);
  const issueNumber =
    remark.scalerPerformanceRemarkId != null ? String(remark.scalerPerformanceRemarkId) : '';

  return (
    <div className="scs__tab-view__panel">
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Scaler Performance Remark</h4>

        <PerformanceRemarksForm
          readOnly
          values={values}
          issueNumber={issueNumber}
          issueTypeDisplay={issueTypeLabel(remark)}
        />

        <div className="scs__form__divider scs__form__divider--actions" />

        <div className="form-actions">
          <Button kind="secondary" type="button" className="action-btn" onClick={onBack}>
            Back
          </Button>
          <PermissionGate permission={PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE}>
            <Button kind="primary" type="button" className="action-btn" onClick={onEdit}>
              Edit Record
            </Button>
          </PermissionGate>
        </div>
      </section>
    </div>
  );
};

export default PerformanceRemarkDetailView;
