import axios from 'axios';
import { notify } from '@/context/notification/notificationBridge';
import { CheckScalesService } from '@/services/checkScales.service';
import { SummaryCheckScalesService } from '@/services/summaryCheckScales.service';
import { ClientsService } from '@/services/clients.service';
import { HaulMarkAuthorizationsService } from '@/services/haulMarkAuthorizations.service';
import { TimberMarksService } from '@/services/timberMarks.service';
import { LovService } from '@/services/lov.service';
import { MarkSiteDesignationService } from '@/services/markSiteDesignation.service';
import { ReportsService } from '@/services/reports.service';
import { ScaleAuthTemplatesService } from '@/services/scaleAuthTemplates.service';
import { ScalerAppointmentsService } from '@/services/scalerAppointments.service';
import { ScalerExamsService } from '@/services/scalerExams.service';
import { ScalerPerformanceRemarksService } from '@/services/scalerPerformanceRemarks.service';
import { ScalerAuthorizationsService } from '@/services/scalerAuthorizations.service';
import { ScalersService } from '@/services/scalers.service';
import { ScaleSiteAuthorizationsService } from '@/services/scaleSiteAuthorizations.service';
import { ScaleSiteAuthorizedScalersService } from '@/services/scaleSiteAuthorizedScalers.service';
import { ScaleSiteInspectionsService } from '@/services/scaleSiteInspections.service';
import { ScaleSiteMarkSiteDesignationsService } from '@/services/scaleSiteMarkSiteDesignations.service';
import { ScaleSiteRiskAssessmentsService } from '@/services/scaleSiteRiskAssessments.service';
import { ScaleSiteSoftwareService } from '@/services/scaleSiteSoftware.service';
import { ScaleSitesService } from '@/services/scaleSites.service';
import { ScalerRiskAssessmentsService } from '@/services/scalerRiskAssessments.service';
import { SignatureBlocksService } from '@/services/signatureBlocks.service';
import { WelcomeService } from '@/services/welcome.service';
import { clearLocalSession, ensureFreshUser } from '@/services/keycloak';
import { getApiBasePath } from '@/utils/appBasePath';

import type { APIConfig } from '@/config/api/types';
import { ConditionsService } from './conditions.service';
import { ExamUpgradesService } from './examUpgrades.service';
import { AuthorizationClausesService } from './authorizationClauses.service';
import { InspectionQuestionsService } from './inspectionQuestions.service';
import { SystemSettingsService } from './systemSettings.service';
import { SystemStatusService } from './systemStatus.service';
import { ScaleSiteContactsService } from './scaleSiteContacts.service';
import { ScaleSiteActivityService } from './scaleSiteActivity.service';
import { ValidLicenceAttributesService } from './validLicenceAttributes.service';
import { AppointmentTypesService } from './appointmentTypes.service';

export const BackendApiConfig: APIConfig = {
  BASE: getApiBasePath(),
  VERSION: '0',
  WITH_CREDENTIALS: true,
  CREDENTIALS: 'include',
  // The Keycloak ACCESS token (renewed first if near expiry): the API validates its issuer and
  // that it was issued to this integration (azp), and reads the roles from it.
  TOKEN: async () => {
    try {
      const current = await ensureFreshUser();
      return current?.access_token ?? '';
    } catch {
      return '';
    }
  },
  USERNAME: undefined,
  PASSWORD: undefined,
  HEADERS: undefined,
  ENCODE_PATH: undefined,
};

let isSigningOut = false;

// Sign out and redirect to the landing page on any 401 response so
// expired or revoked tokens don't leave the user on a broken screen.
// We only trigger this when the request was authenticated (contains Authorization header)
// and we are not already on the landing page, to prevent infinite reload loops.
// This is protected against SSR/non-browser contexts and concurrent request storms.
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const headers = error.config?.headers;
      const hasAuthHeader = !!(
        headers?.['Authorization'] ||
        headers?.['authorization'] ||
        headers?.Authorization ||
        headers?.authorization
      );

      const isWindowAvailable = typeof window !== 'undefined';
      const isAlreadyOnWelcome =
        isWindowAvailable &&
        (window.location.pathname === '/welcome' ||
          window.location.pathname.startsWith('/welcome/'));

      if (hasAuthHeader && !isAlreadyOnWelcome && !isSigningOut) {
        isSigningOut = true;
        try {
          await clearLocalSession();
        } finally {
          if (isWindowAvailable) {
            window.location.replace('/welcome');
          }
          isSigningOut = false;
        }
      }
    }

    // Surface server-side (5xx) errors consistently via a global toast, rather than relying on each
    // page to handle them individually.
    if (axios.isAxiosError(error) && (error.response?.status ?? 0) >= 500) {
      notify({
        kind: 'error',
        title: 'Something went wrong',
        subtitle: 'The server encountered an error. Please try again shortly.',
        timeout: 8000,
      });
    }
    return Promise.reject(error);
  },
);

// Register all services here
const serviceConstructors = {
  client: new ClientsService(),
  haulMarkAuthorization: new HaulMarkAuthorizationsService(),
  timberMarks: new TimberMarksService(),
  lov: new LovService(),
  checkScale: new CheckScalesService(),
  summaryCheckScale: new SummaryCheckScalesService(),
  scalers: new ScalersService(),
  scaleSiteInspections: new ScaleSiteInspectionsService(),
  scaleSiteRiskAssessments: new ScaleSiteRiskAssessmentsService(),
  scaleSites: new ScaleSitesService(),
  scalerRiskAssessments: new ScalerRiskAssessmentsService(),
  scalerAppointments: new ScalerAppointmentsService(),
  scalerExams: new ScalerExamsService(),
  scalerPerformanceRemarks: new ScalerPerformanceRemarksService(),
  scalerAuthorizations: new ScalerAuthorizationsService(),
  scaleSiteAuthorizations: new ScaleSiteAuthorizationsService(),
  scaleSiteAuthorizedScalers: new ScaleSiteAuthorizedScalersService(),
  scaleSiteMarkSiteDesignations: new ScaleSiteMarkSiteDesignationsService(),
  scaleSiteSoftware: new ScaleSiteSoftwareService(),
  scaleAuthTemplates: new ScaleAuthTemplatesService(),
  reports: new ReportsService(),
  welcome: new WelcomeService(),
  markSiteDesignation: new MarkSiteDesignationService(),
  inspectionQuestions: new InspectionQuestionsService(),
  conditions: new ConditionsService(),
  authorizationClauses: new AuthorizationClausesService(),
  systemSettings: new SystemSettingsService(),
  systemStatus: new SystemStatusService(),
  signatureBlocks: new SignatureBlocksService(),
  validLicenceAttributes: new ValidLicenceAttributesService(),
  examUpgrades: new ExamUpgradesService(),
  appointmentTypes: new AppointmentTypesService(),
  scaleSiteContacts: new ScaleSiteContactsService(),
  scaleSiteActivity: new ScaleSiteActivityService(),
} as const;

type ExternalApiType = {
  [K in keyof typeof serviceConstructors]: (typeof serviceConstructors)[K];
};

const API: ExternalApiType = serviceConstructors;

export default API;
