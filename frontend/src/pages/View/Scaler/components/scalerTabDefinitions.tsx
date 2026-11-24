import type { ReactNode } from 'react';
import { PERMISSIONS, type PERMISSION_TYPE } from '@/context/auth/permissions';
import type { ScalerSummary } from '@/services/scalers.service';
import AddressTab from './tabs/AddressTab';
import AppointmentsTab from './tabs/AppointmentsTab';
import AuthorizationsTab from './tabs/AuthorizationsTab';
import CheckScalesTab from './tabs/CheckScalesTab';
import ExamUpgradesTab from './tabs/ExamUpgradesTab';
import PerformanceRemarksTab from './tabs/PerformanceRemarks/PerformanceRemarksTab';
import RiskRatingTab from './tabs/RiskRatingTab';
import SummaryCheckScalesTab from './tabs/SummaryCheckScalesTab';
import SummaryTab from './tabs/SummaryTab';

/**
 * One section of the scaler record. Declared so the tab strip, panels and `?tab=` slugs all
 * derive from one list, which keeps them aligned when a section is filtered out.
 */
export type ScalerTabDefinition = {
  /** URL slug for `?tab=`; also the stable identity of the section. */
  slug: string;
  label: string;
  /** The permission that reveals the section. */
  permission: PERMISSION_TYPE;
  /** `isActive` tells the panel to load lazily once its tab is selected. */
  render: (props: { isActive: boolean; scalerLicenceNo: string; summary: ScalerSummary }) => ReactNode;
};

/**
 * Every section of the scaler record, in order, with the permission that reveals it (matrix §C).
 */
export const SCALER_TABS: readonly ScalerTabDefinition[] = [
  {
    slug: 'summary',
    label: 'Summary',
    permission: PERMISSIONS.SCALER_READ,
    render: ({ summary }) => <SummaryTab summary={summary} />,
  },
  {
    slug: 'address',
    label: 'Address',
    permission: PERMISSIONS.SCALER_ADDRESS_READ,
    render: ({ isActive, scalerLicenceNo }) => (
      <AddressTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
    ),
  },
  {
    slug: 'authorizations',
    label: 'Authorizations',
    permission: PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
    render: ({ isActive, scalerLicenceNo }) => (
      <AuthorizationsTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
    ),
  },
  {
    slug: 'check-scales',
    label: 'Check Scales',
    permission: PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
    render: ({ isActive, scalerLicenceNo }) => (
      <CheckScalesTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
    ),
  },
  {
    slug: 'summary-check-scales',
    label: 'Summary Check Scales',
    permission: PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
    render: ({ isActive, scalerLicenceNo }) => (
      <SummaryCheckScalesTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
    ),
  },
  {
    slug: 'exams-upgrades',
    label: 'Exams / Upgrades',
    permission: PERMISSIONS.SCALER_EXAM_QUERY,
    render: ({ isActive, scalerLicenceNo }) => (
      <ExamUpgradesTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
    ),
  },
  {
    slug: 'appointments',
    label: 'Appointments',
    permission: PERMISSIONS.SCALER_APPOINTMENT_QUERY,
    render: ({ isActive, scalerLicenceNo }) => (
      <AppointmentsTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
    ),
  },
  {
    slug: 'performance-remarks',
    label: 'Performance Remarks',
    permission: PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
    render: ({ isActive, scalerLicenceNo, summary }) => (
      <PerformanceRemarksTab
        isActive={isActive}
        scalerLicenceNo={scalerLicenceNo}
        summary={summary}
      />
    ),
  },
  {
    slug: 'risk-rating',
    label: 'Risk Rating',
    permission: PERMISSIONS.SCALER_RISK_RATING_QUERY,
    render: ({ isActive, scalerLicenceNo }) => (
      <RiskRatingTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
    ),
  },
];
