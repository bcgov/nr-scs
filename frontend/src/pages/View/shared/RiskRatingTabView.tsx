import { InlineNotification, SkeletonText } from "@carbon/react";
import { useQuery } from "@tanstack/react-query";
import { type FC } from "react";
import { useNavigate } from "react-router-dom";

import PermissionGate from '@/components/PermissionGate';
import Button from "@/components/core/Button";
import RiskRatingTable from "@/components/core/RiskRatingTable";
import { useAuth } from "@/context/auth/useAuth";

import type { RiskRatingSummary } from "@/services/riskAssessment.types";
import { type PERMISSION_TYPE } from '@/context/auth/permissions';

interface Props {
  isActive: boolean;
  /** Raw entity id (scaler licence no / scale site id); trimmed before use. */
  entityId: string;
  /** react-query key prefix that scopes this tab's cache. */
  queryKeyPrefix: string;
  /** Loads the summaries for the (trimmed) entity id. */
  loadRatings: (
    entityId: string,
    token?: string,
  ) => Promise<RiskRatingSummary[]>;
  /** Builds the assessment view href from an assessment id. */
  assessmentViewPath: (riskQuestionnaireId: number) => string;
  /** Permission the assessment view route requires; passed through to RiskRatingTable. */
  viewPermission: PERMISSION_TYPE;
  /** Permission required to create an assessment for this subject. */
  createPermission: PERMISSION_TYPE;
  /** Shown when there are no assessments (e.g. "No risk assessments found for this scaler."). */
  emptyMessage: string;
  /** Domain-specific wrapper class for the error notification. */
  notificationClassName?: string;
  /**
   * When provided, the "Add Risk Assessment" action is enabled and navigates to this route (the
   * shared routed create page). When omitted, the action stays a disabled "coming later" placeholder.
   */
  createPath?: string;
}

/**
 * The read-only "Risk Rating" record tab shared by the Scaler and Scale Site view pages. Both fetch
 * the same summary shape and render the same shell ("Add Risk Assessment" action, section heading,
 * loading skeleton, empty state, then {@link RiskRatingTable}); only the query, view route, empty
 * message and notification styling differ, so those are injected by the thin per-domain wrappers.
 */
const RiskRatingTabView: FC<Props> = ({
  isActive,
  entityId,
  queryKeyPrefix,
  loadRatings,
  assessmentViewPath,
  viewPermission,
  createPermission,
  emptyMessage,
  notificationClassName,
  createPath,
}) => {
  const { userToken } = useAuth();
  const navigate = useNavigate();
  const normalizedEntityId = entityId.trim();

  const ratingsQuery = useQuery({
    queryKey: [queryKeyPrefix, normalizedEntityId],
    queryFn: async () => {
      const token = await userToken();
      return loadRatings(normalizedEntityId, token);
    },
    enabled: isActive && normalizedEntityId.length > 0,
  });

  const ratings = ratingsQuery.data ?? [];
  const loading = ratingsQuery.isLoading && !ratingsQuery.data;
  const loadError = ratingsQuery.error?.message ?? null;

  const canCreate = Boolean(createPath);

  return (
    <div className="scs__tab-view__panel">
      {loadError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Risk assessments unavailable."
          subtitle={loadError}
          className={notificationClassName}
        />
      ) : null}

      <div className="scs__view-tab-actions scs__view-tab-actions--top">
        <PermissionGate permission={createPermission}>
          <Button
            kind="primary"
            size="sm"
            type="button"
            disabled={!canCreate}
            title={canCreate ? undefined : 'Coming in a later release'}
            onClick={canCreate && createPath ? () => navigate(createPath) : undefined}
          >
            Add Risk Assessment
          </Button>
        </PermissionGate>
      </div>

      {/* Section heading below the tab action, matching the other record tabs (Check Scales,
          Scale Site Summary). */}
      <h4 className="scs__tab-view__section-title">Risk Assessments</h4>

      {loading ? <SkeletonText paragraph lineCount={6} /> : null}

      {!loading && !loadError && ratings.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : null}

      {!loading && !loadError && ratings.length > 0 ? (
        <RiskRatingTable
          rows={ratings}
          assessmentViewPath={assessmentViewPath}
          viewPermission={viewPermission}
        />
      ) : null}
    </div>
  );
};

export default RiskRatingTabView;
