import { Navigate, type RouteObject } from 'react-router-dom';

import { PERMISSIONS } from '@/context/auth/permissions';
import GlobalErrorPage from '@/pages/GlobalError';
import LandingPage from '@/pages/Landing';
import NotFoundPage from '@/pages/NotFound';
import ScaleSiteInspectionEditPage from '@/pages/Edit/ScaleSiteInspection';
import ScalerAuthorizationEditPage from '@/pages/Edit/ScalerAuthorization';
import ScaleSiteAuthorizationEditPage from '@/pages/Edit/ScaleSiteAuthorization';
import MarkSiteDesignationEditPage from '@/pages/Edit/MarkSiteDesignation';
import ScalerRiskAssessmentEditPage from '@/pages/Edit/ScalerRiskAssessment';
import ScalerRiskAssessmentViewPage from '@/pages/View/ScalerRiskAssessment';
import ClientSearchPage from '@/pages/Queries/Client';
import MarkSiteDesignationsSearchPage from '@/pages/Queries/MarkSiteDesignations';
import ScaleSiteRiskAssessmentsSearch from '@/pages/Queries/ScaleSiteRiskAssessments';
import ScalerRiskAssessmentsSearch from '@/pages/Queries/ScalerRiskAssessments';
import ScalersSearchPage from '@/pages/Queries/Scalers';
import RoleErrorPage from '@/pages/RoleError';
import ScaleSitesSearchPage from '@/pages/Queries/ScaleSites';
import CheckScaleEditPage from '@/pages/Edit/CheckScale';
import ScaleSiteRiskAssessmentEditPage from '@/pages/Edit/ScaleSiteRiskAssessment';
import ScaleSiteRiskAssessmentViewPage from '@/pages/View/ScaleSiteRiskAssessment';
import ScalerRiskAssessmentCreatePage from '@/pages/Create/ScalerRiskAssessment';
import ScaleSiteRiskAssessmentCreatePage from '@/pages/Create/ScaleSiteRiskAssessment';
import CheckScaleViewPage from '@/pages/View/CheckScale/index';
import MarkSiteDesignationViewPage from '@/pages/View/MarkSiteDesignation';
import ScaleSiteViewPage from '@/pages/View/ScaleSite';
import ScaleSiteInspectionViewPage from '@/pages/View/ScaleSiteInspection';
import ScalerViewPage from '@/pages/View/Scaler/index';
import ScalerSummaryViewPage from '@/pages/View/ScalerSummary';

import DesignatedMarkExceptionPage from '@/pages/Reports/DesignatedMarkException';
import DistrictCheckScalePerformancePage from '@/pages/Reports/DistrictCheckScalePerformance';
import DistrictSiteInspectionPerformancePage from '@/pages/Reports/DistrictSiteInspectionPerformance';
import MarkSiteDesignationPage from '@/pages/Reports/MarkSiteDesignation';
import ScalerRegisterPage from '@/pages/Reports/ScalerRegister';
import ScaleSiteCompliancePage from '@/pages/Reports/ScaleSiteCompliance';
import ScaleSiteRegisterPage from '@/pages/Reports/ScaleSiteRegister';
import ScalingAdministrationPage from '@/pages/Reports/ScalingAdministration';
import ScalingExceptionPage from '@/pages/Reports/ScalingException';


import SignatureBlocksAdminPage from '@/pages/Administration/Maintenance/SignatureBlocks';
import TemplatesAdminPage from '@/pages/Administration/Maintenance/Templates';
import WorkBenchAdminPage from '@/pages/Administration/WorkBench';

import CheckScaleCreatePage from '@/pages/Create/CheckScale';
import MarkSiteDesignationCreatePage from '@/pages/Create/MarkSiteDesignation';
import ScaleSiteInspectionCreatePage from '@/pages/Create/ScaleSiteInspection';
import ScalerCreatePage from '@/pages/Create/Scaler';
import ScalerAuthorizationCreatePage from '@/pages/Create/ScalerAuthorization';
import ScaleSiteCreatePage from '@/pages/Create/ScaleSite';
import ScaleSiteAuthorizationCreatePage from '@/pages/Create/ScaleSiteAuthorization';
import ScaleSiteAuthorizationsPage from '@/pages/View/ScaleSiteAuthorizations';
import ScalerAuthorizationViewPage from '@/pages/View/ScalerAuthorization';
import ScaleSiteAuthorizationViewPage from '@/pages/View/ScaleSiteAuthorization';
import ScalerAuthorizationLetterPage from '@/pages/Letters/ScalerAuthorizationLetter';
import CheckScaleAdvisoryLetterPage from '@/pages/Letters/CheckScaleAdvisoryLetter';
import ScaleSiteAuthorizationLetterPage from '@/pages/Letters/ScaleSiteAuthorizationLetter';
import MarkSiteDesignationLetterPage from '@/pages/Letters/MarkSiteDesignationLetter';
import SummaryCheckScaleCreatePage from '@/pages/Create/SummaryCheckScale';
import SummaryCheckScaleUpdatePage from '@/pages/Update/SummaryCheckScale';
import AppointmentTypesAdminPage from '@/pages/Administration/Maintenance/AppointmentTypes';
import AuthorizationClausesAdminPage from '@/pages/Administration/Maintenance/AuthorizationClauses';
import ConditionsAdminPage from '@/pages/Administration/Maintenance/Conditions';
import ExamUpgradesAdminPage from '@/pages/Administration/Maintenance/ExamUpgrades';
import QuestionsAdminPage from '@/pages/Administration/Maintenance/Questions';
import SystemAdminPage from '@/pages/Administration/Maintenance/System';
import ValidLicenceAttributesAdminPage from '@/pages/Administration/Maintenance/ValidLicenceAttributes';
import AuthCallbackPage from '@/pages/AuthCallback';
import ProtectedRoute from './ProtectedRoute';

/**
 * A simplified type for defining application routes in the template.
 * The complex properties for auth and online status have been removed.
 */
export type AppRoute = {
  id: string;
  path: string;
  element: React.ReactNode;
  errorElement?: React.ReactNode;
  icon?: React.ComponentType;
  children?: AppRoute[];
} & RouteObject;

/**
 * An array of all application routes.
 * In this template, routing is handled declaratively in `App.tsx`.
 * This file can be used to organize route definitions as the app grows.
 * All complex logic for protected routes, roles, and online status has been removed.
 */
export const APP_ROUTES: AppRoute[] = [
  {
    path: '/',
    id: 'RootRedirect',
    element: <Navigate to="/welcome" replace />,
  },

  // OAuth redirect target (Keycloak). Public — the session does not exist until AuthCallbackPage
  // performs the authorization-code exchange — and must stay above the '*' catch-all, which would
  // otherwise render Not Found for /authCallback?code=…&state= before the code could be spent.
  {
    path: '/authCallback',
    id: 'AuthCallback',
    element: <AuthCallbackPage />,
  },

  // Main application pages
  {
    path: '/welcome',
    id: 'Landing',
    element: <LandingPage />,
  },
  {
    path: '/client',
    id: 'Client Search',
    element: (
      <ProtectedRoute permission={PERMISSIONS.CLIENT_QUERY}>
        <ClientSearchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scalers',
    id: 'Scalers',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_QUERY}>
        <ScalersSearchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/check-scales/view/:checkScaleId',
    id: 'Check Scale View',
    element: (
      <ProtectedRoute permission={PERMISSIONS.CHECK_SCALE_QUERY}>
        <CheckScaleViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/check-scales/edit/:checkScaleId',
    id: 'Check Scale Edit',
    element: (
      <ProtectedRoute permission={PERMISSIONS.CHECK_SCALE_UPDATE}>
        <CheckScaleEditPage />
      </ProtectedRoute>
    ),
  },
  {
      path: '/mark-site-designations/view',
      id: 'Mark Site Designation View',
      element: (
          <ProtectedRoute permission={PERMISSIONS.MSD_READ}>
              <MarkSiteDesignationViewPage />
          </ProtectedRoute>
      ),
  },
  {
      path: '/scalers/summary',
      id: 'Scaler Summary View',
      element: (
          <ProtectedRoute permission={PERMISSIONS.SCALER_READ}>
              <ScalerSummaryViewPage />
          </ProtectedRoute>
      ),
  },
  {
    path: '/scalers/view/:scalerLicenceNo',
    id: 'Scaler View',
    element: (
        <ProtectedRoute permission={PERMISSIONS.SCALER_READ}>
          <ScalerViewPage />
        </ProtectedRoute>
    ),
  },
  {
    path: '/scale-sites',
    id: 'Scale Sites',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_QUERY}>
        <ScaleSitesSearchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-sites/view/:scaleSiteIdNmbr',
    id: 'Scale Site View',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_READ}>
        <ScaleSiteViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scaler-authorizations/view/:scalerAuthorizationId',
    id: 'Scaler Authorization View',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_AUTHORIZATION_READ}>
        <ScalerAuthorizationViewPage />
        </ProtectedRoute>
    ),
  },
  {
    path: '/mark-site-designations/edit/:authorizationId',
    id: 'Mark Site Designation Update',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MSD_UPDATE}>
        <MarkSiteDesignationEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scaler-authorizations/edit/:scalerAuthorizationId',
    id: 'Scaler Authorization Update',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_AUTHORIZATION_UPDATE}>
        <ScalerAuthorizationEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scaler-authorizations/:scalerAuthorizationId/letter',
    id: 'Scaler Authorization Letter',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE}>
        <ScalerAuthorizationLetterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/check-scales/:checkScaleId/advisory-letter',
    id: 'Check Scale Advisory Letter',
    element: (
      <ProtectedRoute permission={PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE}>
        <CheckScaleAdvisoryLetterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-site-authorizations/view/:scaleSiteAuthorizationId',
    id: 'Scale Site Authorization View',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ}>
        <ScaleSiteAuthorizationViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-site-authorizations/edit/:scaleSiteAuthorizationId',
    id: 'Scale Site Authorization Edit',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_UPDATE}>
        <ScaleSiteAuthorizationEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-site-authorizations/:scaleSiteAuthorizationId/letter',
    id: 'Scale Site Authorization Letter',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE}>
        <ScaleSiteAuthorizationLetterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/mark-site-designations/:haulingMarkAuthorizationId/letter',
    id: 'Mark Site Designation Letter',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MSD_LETTER_CREATE}>
        <MarkSiteDesignationLetterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-sites/:scaleSiteIdNmbr/inspections/view/:inspectionId',
    id: 'Scale Site Inspection View',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_INSPECTION_READ}>
        <ScaleSiteInspectionViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-sites/:scaleSiteIdNmbr/inspections/edit/:inspectionId',
    id: 'Scale Site Inspection Edit',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_INSPECTION_UPDATE}>
        <ScaleSiteInspectionEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-sites/:scaleSiteIdNmbr/inspections/create',
    id: 'Scale Site Inspection Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_INSPECTION_CREATE}>
        <ScaleSiteInspectionCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/mark-site-designations',
    id: 'Mark Site Designations',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MSD_QUERY}>
        <MarkSiteDesignationsSearchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scaler-risk-assessments',
    id: 'Scaler Risk Assessment',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY}>
        <ScalerRiskAssessmentsSearch />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-site-risk-assessments/view/:riskQuestionnaireId',
    id: 'Scale Site Risk Assessment View',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ}>
        <ScaleSiteRiskAssessmentViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-site-risk-assessments/edit/:riskQuestionnaireId',
    id: 'Scale Site Risk Assessment Edit',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE}>
        <ScaleSiteRiskAssessmentEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scaler-risk-assessments/view/:riskQuestionnaireId',
    id: 'Scaler Risk Assessment View',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ}>
        <ScalerRiskAssessmentViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scaler-risk-assessments/edit/:riskQuestionnaireId',
    id: 'Scaler Risk Assessment Edit',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE}>
        <ScalerRiskAssessmentEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scalers/:scalerLicenceNo/risk-assessments/create',
    id: 'Scaler Risk Assessment Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE}>
        <ScalerRiskAssessmentCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-sites/:scaleSiteIdNmbr/risk-assessments/create',
    id: 'Scale Site Risk Assessment Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE}>
        <ScaleSiteRiskAssessmentCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-site-risk-assessments',
    id: 'Scale Site Risk Assessment',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY}>
        <ScaleSiteRiskAssessmentsSearch />
      </ProtectedRoute>
    ),
  },

  // Reports sub-pages (top-level paths under basename)
  {
    path: '/reports/scaler-register',
    id: 'Scaler Register',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <ScalerRegisterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/scale-site-register',
    id: 'Scale Site Register',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <ScaleSiteRegisterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/mark-site-designation',
    id: 'Mark Site Designation',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <MarkSiteDesignationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/designated-mark-exception',
    id: 'Designated Mark Exemption',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <DesignatedMarkExceptionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/scaling-administration',
    id: 'Scaling Administration',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <ScalingAdministrationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/scaling-exception',
    id: 'Scaling Exception',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <ScalingExceptionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/district-check-scale-performance',
    id: 'District Check Scale Performance',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <DistrictCheckScalePerformancePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/district-site-inspection-performance',
    id: 'District Site Inspection Performance',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <DistrictSiteInspectionPerformancePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/scale-site-compliance/:inspectionId',
    id: 'Scale Site Compliance Report',
    element: (
      <ProtectedRoute permission={PERMISSIONS.REPORT_READ}>
        <ScaleSiteCompliancePage />
      </ProtectedRoute>
    ),
  },
  // Administration pages
  {
    path: '/workbench',
    id: 'Work Bench',
    element: (
      <ProtectedRoute permission={PERMISSIONS.WORKBENCH_QUERY}>
        <WorkBenchAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/templates',
    id: 'Maintenance Templates',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_TEMPLATES_QUERY}>
        <TemplatesAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/conditions',
    id: 'Maintenance Conditions',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_CONDITIONS_QUERY}>
        <ConditionsAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/questions',
    id: 'Maintenance Questions',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_QUESTIONS_QUERY}>
        <QuestionsAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/signature-blocks',
    id: 'Maintenance Signature Blocks',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_SIGNATORIES_QUERY}>
        <SignatureBlocksAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/exam-upgrades',
    id: 'Maintenance Exam / Upgrades',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_EXAM_UPGRADES_QUERY}>
        <ExamUpgradesAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/appointment-types',
    id: 'Maintenance Appointment Types',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_QUERY}>
        <AppointmentTypesAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/valid-licence-attributes',
    id: 'Maintenance Valid Licence Attributes',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY}>
        <ValidLicenceAttributesAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/authorization-clauses',
    id: 'Maintenance Authorization Clauses',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_QUERY}>
        <AuthorizationClausesAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/maintenance/system',
    id: 'Maintenance System',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MAINTAIN_SYSTEM_READ}>
        <SystemAdminPage />
      </ProtectedRoute>
    ),
  },
  // Create sub-pages
  {
    path: '/scalers/create',
    id: 'Scaler Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_CREATE}>
        <ScalerCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-sites/create',
    id: 'Scale Site Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_CREATE}>
        <ScaleSiteCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/check-scales/create',
    id: 'Check Scale Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.CHECK_SCALE_CREATE}>
        <CheckScaleCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/summary-check-scales/create',
    id: 'Summary Check Scale Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE}>
        <SummaryCheckScaleCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/summary-check-scales/:checkScaleId/edit',
    id: 'Summary Check Scale Edit',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE}>
        <SummaryCheckScaleUpdatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/mark-site-designations/create',
    id: 'Mark Site Designation Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.MSD_CREATE}>
        <MarkSiteDesignationCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scaler-authorizations/create',
    id: 'Scaler Authorization Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALER_AUTHORIZATION_CREATE}>
        <ScalerAuthorizationCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-site-authorizations/create',
    id: 'Scale Site Authorization Create',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_CREATE}>
        <ScaleSiteAuthorizationCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/scale-site-authorizations',
    id: 'Scale Site Authorizations',
    element: (
      <ProtectedRoute permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY}>
        <ScaleSiteAuthorizationsPage />
      </ProtectedRoute>
    ),
  },

  // System pages
  {
    path: '/unauthorized',
    id: 'Unauthorized',
    element: <RoleErrorPage />,
  },
  {
    path: '/error',
    id: 'Error',
    element: <GlobalErrorPage />,
  },

  // This should be the last route
  {
    path: '*',
    id: 'Not Found',
    element: <NotFoundPage />,
  },
];
