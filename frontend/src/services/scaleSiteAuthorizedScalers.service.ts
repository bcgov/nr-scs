import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface AuthorizedScalerSummary {
  scalerAuthorizationId?: number | null;
  scalerLicenceNo?: string | null;
  clientName?: string | null;
  status?: string | null;
  scalerAppointmentTypes?: string | null;
  authorizationEffectiveDate?: string | null;
  authorizationExpiryDate?: string | null;
  districtWideInd?: string | null;
}

export class ScaleSiteAuthorizedScalersService {
  /**
   * Calls GET /api/scale-sites/{scaleSiteIdNmbr}/authorized-scalers
   * Lists every scaler authorized at a scale site, backing the Authorized Scalers tab.
   */
  async getScaleSiteAuthorizedScalers(
    scaleSiteIdNmbr: string,
    token?: string,
  ): Promise<AuthorizedScalerSummary[]> {
    const response = await axios.get<AuthorizedScalerSummary[]>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/authorized-scalers`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }
}
