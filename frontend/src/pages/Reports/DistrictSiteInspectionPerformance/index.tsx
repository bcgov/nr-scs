import { type FC } from 'react';

import API from '@/services/APIs';

import RegDistDateRangeReport, { type ReportDateRules } from '../RegDistDateRangeReport';

// Module-scoped so RegDistDateRangeReport's handleSend memo is not invalidated on every render.
const submit: Parameters<typeof RegDistDateRangeReport>[0]['submit'] = (payload, token) =>
  API.reports.submitDistrictSiteInspectionPerformanceReport(payload, token);

// Required From/To and the one-year cap are this report family's rules; the ordering rule is shared
// with every other report screen and lives in utils/reportDateRange. Module scope so it stays a
// stable reference for the shared page's effect.
const DATE_RULES: ReportDateRules = { required: true, maxYears: 1 };

const DistrictSiteInspectionPerformancePage: FC = () => (
  <RegDistDateRangeReport
    title="District Site Inspection Performance"
    subtitle="Reports: District Site Inspection Performance"
    formClassName="district-site-inspection-performance-form"
    downloadBaseName="District-Site-Inspection-Performance"
    dateRules={DATE_RULES}
    submit={submit}
  />
);

export default DistrictSiteInspectionPerformancePage;
