import { Column, Grid, InlineNotification, Modal, SkeletonText } from "@carbon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ScaleSiteInspectionDetails from "@/components/Form/ScaleSiteInspectionDetails";
import ScaleSiteInspectionQuestions from "@/components/Form/ScaleSiteInspectionQuestions";
import Button from "@/components/core/Button";
import EmptySection from "@/components/core/EmptySection";
import PageTitle from "@/components/core/PageTitle";
import PermissionGate from "@/components/PermissionGate";
import { PERMISSIONS } from "@/context/auth/permissions";
import { useAuth } from "@/context/auth/useAuth";
import API from "@/services/APIs";
import type { ScaleSiteInspectionDetail } from "@/services/scaleSiteInspections.service";
import { extractApiError } from "@/utils/extractApiError";

import "./index.scss";

type DisplayFieldValue = string | number | null;

const textValue = (value?: DisplayFieldValue): string => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const ScaleSiteInspectionViewPage: React.FC = () => {
  const { scaleSiteIdNmbr, inspectionId } = useParams<{
    scaleSiteIdNmbr: string;
    inspectionId: string;
  }>();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const returnToScaleSitePath = scaleSiteIdNmbr
    ? `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections`
    : '/scale-sites';

  const numericInspectionId = inspectionId ? Number(inspectionId) : Number.NaN;
  const isValidInspectionId =
    Number.isInteger(numericInspectionId) && numericInspectionId > 0;

  const inspectionQuery = useQuery<ScaleSiteInspectionDetail, Error>({
    queryKey: ["scale-site-inspection-detail", numericInspectionId],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSiteInspections.getScaleSiteInspectionDetail(
        numericInspectionId,
        token,
      );
    },
    enabled: isValidInspectionId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      await API.scaleSiteInspections.deleteScaleSiteInspection(
        numericInspectionId,
        token,
      );
    },
    onSuccess: async () => {
      if (scaleSiteIdNmbr) {
        queryClient.removeQueries({
          queryKey: ['scale-site-inspections', scaleSiteIdNmbr],
        });
      }
      setDeleteConfirmOpen(false);
      setBannerError(null);
      navigate(returnToScaleSitePath);
    },
    onError: (error: unknown) => {
      setBannerError(extractApiError(error, 'Could not delete inspection.'));
      setDeleteConfirmOpen(false);
    },
  });

  const questionResponses = inspectionQuery.data?.questionResponses ?? [];

  const inspectionTypeName =
      inspectionQuery.data?.inspectionTypeDescription ?? "";

  if (!inspectionId || !isValidInspectionId) {
    return (
      <Grid className="scale-site-inspection-view">
        <PageTitle
          title="Site Inspection"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            ...(scaleSiteIdNmbr ? [{ name: `Scale Site ${scaleSiteIdNmbr}`, path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections` }] : []),
            { name: "Site Inspection" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-view__content scs__view">
            <EmptySection
              icon="WarningFilled"
              title="Inspection not available"
              description="A valid inspection id was not provided in the route."
              whiteLayer
            />
          </div>
        </Column>
      </Grid>
    );
  }

  if (inspectionQuery.isPending) {
    return (
      <Grid className="scale-site-inspection-view">
        <PageTitle
          title="Site Inspection"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            ...(scaleSiteIdNmbr ? [{ name: `Scale Site ${scaleSiteIdNmbr}`, path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections` }] : []),
            { name: "Site Inspection" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-view__content scs__view">
            <div className="scale-site-inspection-view__panel">
              <SkeletonText paragraph lineCount={8} />
            </div>
          </div>
        </Column>
      </Grid>
    );
  }

  if (inspectionQuery.isError) {
    return (
      <Grid className="scale-site-inspection-view">
        <PageTitle
          title="Site Inspection"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            ...(scaleSiteIdNmbr ? [{ name: `Scale Site ${scaleSiteIdNmbr}`, path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections` }] : []),
            { name: "Site Inspection" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-view__content scs__view">
            <EmptySection
              icon="WarningFilled"
              title="Could not load inspection"
              description={
                inspectionQuery.error?.message ??
                "The inspection detail could not be retrieved."
              }
              whiteLayer
            />
          </div>
        </Column>
      </Grid>
    );
  }

  if (!inspectionQuery.data) {
    return (
      <Grid className="scale-site-inspection-view">
        <PageTitle
          title="Site Inspection"
          breadCrumbs={[
            { name: "Scale Sites", path: "/scale-sites" },
            ...(scaleSiteIdNmbr ? [{ name: `Scale Site ${scaleSiteIdNmbr}`, path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections` }] : []),
            { name: "Site Inspection" },
          ]}
        />
        <Column lg={16} md={8} sm={4}>
          <div className="scale-site-inspection-view__content scs__view">
            <EmptySection
              icon="WarningFilled"
              title="Could not load inspection"
              description="The inspection detail could not be retrieved."
              whiteLayer
            />
          </div>
        </Column>
      </Grid>
    );
  }

  return (
    <Grid className="scale-site-inspection-view">
      <PageTitle
        title={`Site Inspection${inspectionTypeName ? ` - ${inspectionTypeName}` : ''}`}
        breadCrumbs={[
          { name: "Scale Sites", path: "/scale-sites" },
          {
            name: `Scale Site ${scaleSiteIdNmbr}`,
            path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr ?? '')}?tab=inspections`,
          },
          { name: `Inspection ${inspectionId}` },
        ]}
      />
      <Column lg={16} md={8} sm={4}>
        <div className="scale-site-inspection-view__content scs__view">
          {bannerError && (
            <InlineNotification
              kind="error"
              title="Delete failed"
              subtitle={bannerError}
              onCloseButtonClick={() => setBannerError(null)}
            />
          )}
          <ScaleSiteInspectionDetails
            mode="view"
            displayValues={{
              scaleSiteIdNmbr: inspectionQuery.data.scaleSiteIdNmbr,
              siteName: inspectionQuery.data.siteName,
              siteLocation: inspectionQuery.data.siteLocation,
              siteOwnerName: inspectionQuery.data.siteOwnerName,
              inspectionTypeDescription:
                inspectionQuery.data.inspectionTypeDescription,
              siteTypeDisplay: inspectionQuery.data.siteTypeDisplay,
              previousInspectionId: inspectionQuery.data.previousInspectionId,
              recipient: inspectionQuery.data.recipient,
              siteOperatorPresentDescription:
                inspectionQuery.data.siteOperatorPresentDescription,
              inspector: inspectionQuery.data.inspector,
              inspectionDate: inspectionQuery.data.inspectionDate,
              comments: inspectionQuery.data.comments,
              inspectionId: inspectionQuery.data.inspectionId,
            }}
            formValues={{
              previousInspectionId: textValue(
                inspectionQuery.data.previousInspectionId,
              ),
              recipient: textValue(inspectionQuery.data.recipient),
              siteOperatorPresentInd: textValue(
                inspectionQuery.data.siteOperatorPresentInd,
              ),
              inspector: textValue(inspectionQuery.data.inspector),
              inspectionDate: textValue(inspectionQuery.data.inspectionDate),
              comments: textValue(inspectionQuery.data.comments),
            }}
            requiredIndicatorClassName="scale-site-inspection-edit__required"
            onFieldChange={() => undefined}
          />

          <div className="scs__form__divider" />

          <ScaleSiteInspectionQuestions
            mode="view"
            questions={questionResponses}
            emptyStateDescription="This inspection does not have any recorded question responses."
            headingClassName="scs__view__section-title"
          />

          <div className="scale-site-inspection-view__actions form-actions">
            <Button
              kind="secondary"
              onClick={() => navigate(returnToScaleSitePath)}
            >
              Back
            </Button>
            <PermissionGate permission={PERMISSIONS.SCALE_SITE_INSPECTION_UPDATE}>
              <Button
                kind="primary"
                onClick={() =>
                  navigate(
                    `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr ?? '')}/inspections/edit/${encodeURIComponent(String(numericInspectionId))}`,
                  )
                }
              >
                Edit Record
              </Button>
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.REPORT_READ}>
              <Button
                kind="tertiary"
                onClick={() =>
                  navigate(
                    `/reports/scale-site-compliance/${encodeURIComponent(String(numericInspectionId))}`,
                  )
                }
              >
                Send / View Report
              </Button>
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.SCALE_SITE_INSPECTION_DELETE}>
              <Button kind="danger" onClick={() => setDeleteConfirmOpen(true)}>
                Delete
              </Button>
            </PermissionGate>
          </div>
        </div>
      </Column>
      <Modal
        open={deleteConfirmOpen}
        onRequestClose={() => setDeleteConfirmOpen(false)}
        onSecondarySubmit={() => setDeleteConfirmOpen(false)}
        onRequestSubmit={() => deleteMutation.mutate()}
        modalHeading="Are you sure you want to delete this record?"
        primaryButtonText="Confirm Delete"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={deleteMutation.isPending}
        danger
      />
    </Grid>
  );
};

export default ScaleSiteInspectionViewPage;
