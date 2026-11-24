import { Column, Grid, InlineNotification } from '@carbon/react';
import { type FC, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import PageTitle from '@/components/core/PageTitle';
import ReportPage from '@/components/core/ReportPage';
import { useReportSubmission } from '@/components/core/ReportPage/useReportSubmission';
import API from '@/services/APIs';
import type { ScaleSiteComplianceReportRequest } from '@/services/reports.service';

const TITLE = 'Scale Site Compliance Report';
const SUBTITLE =
  'Description: This report shows the assessment of the compliance of the scale site to the '
  + 'terms and conditions of the authorization.';

const ScaleSiteCompliancePage: FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  // The report is launched in-context from a site inspection; a valid numeric id is required.
  const numericInspectionId = inspectionId && /^\d+$/.test(inspectionId) ? Number(inspectionId) : null;

  const { isLoading, error, success, outputParams, outputOptions, resetOutput, clearMessages, submit } =
    useReportSubmission({ downloadBaseName: 'Scale-Site-Compliance' });

  // Reset clears the editable fields; the inspection context is carried by the route and preserved.
  const onReset = () => {
    resetOutput();
  };

  const payload: ScaleSiteComplianceReportRequest | null = useMemo(() => {
    if (numericInspectionId === null) {
      return null;
    }
    return {
      inspectionId: numericInspectionId,
      ...outputParams,
    };
  }, [numericInspectionId, outputParams]);

  const handleSend = useCallback(async () => {
    if (!payload) {
      return;
    }
    clearMessages();
    await submit((token) => API.reports.submitScaleSiteComplianceReport(payload, token));
  }, [clearMessages, payload, submit]);

  if (numericInspectionId === null) {
    return (
      <Grid className="report-grid">
        <Column lg={16} md={8} sm={4}>
          <PageTitle title={TITLE} />
          <InlineNotification
            kind="error"
            title="Invalid inspection"
            subtitle="A valid site inspection is required to generate this report."
            lowContrast
            hideCloseButton
            className="mt-4"
          />
        </Column>
      </Grid>
    );
  }

  return (
    <ReportPage
      title={TITLE}
      subtitle={SUBTITLE}
      formClassName="scale-site-compliance-form"
      isLoading={isLoading}
      success={success}
      error={error}
      showParametersHeading={false}
      outputOptions={{
        ...outputOptions,
        onReset,
        onSend: handleSend,
        layout: 'form',
        showHeading: true,
      }}
    >
      <></>
    </ReportPage>
  );
};

export default ScaleSiteCompliancePage;
