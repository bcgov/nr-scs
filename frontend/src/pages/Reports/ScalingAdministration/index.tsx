import { type FC } from 'react';

import API from '@/services/APIs';

import RegDistDateRangeReport from '../RegDistDateRangeReport';

// Module-scoped so RegDistDateRangeReport's handleSend memo is not invalidated on every render.
const submit: Parameters<typeof RegDistDateRangeReport>[0]['submit'] = (payload, token) =>
  API.reports.submitScalingAdministrationReport(payload, token);

const REPORT_SUBTITLE =
  "Description: This report shows the number of authorizations, appointments and MSD's in an Org unit.";

// No dateRules: this report's window is optional and uncapped, so only the shared ordering rule
// applies and From/To are not marked required.
const ScalingAdministrationPage: FC = () => (
  <RegDistDateRangeReport
    title="Scaling Administration Report"
    subtitle={REPORT_SUBTITLE}
    formClassName="scaling-administration-form"
    downloadBaseName="Scaling-Administration"
    submit={submit}
  />
);

export default ScalingAdministrationPage;
