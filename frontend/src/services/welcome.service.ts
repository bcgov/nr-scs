import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export type WelcomeSummary = {
  applicationVersion?: string | null;
  applicationEnvironment?: string | null;
  serverName?: string | null;
  userDisplayName?: string | null;
  userOrganization?: string | null;
  currentNews?: string | null;
};

export class WelcomeService {
  /**
   * Calls GET /api/welcome
   */
  async getWelcomeSummary(token?: string, orgUnitNo?: number): Promise<WelcomeSummary> {
    const response = await axios.get<WelcomeSummary>(`${BackendApiConfig.BASE}/welcome`, {
      params: orgUnitNo ? { orgUnitNo } : undefined,
      headers: jsonHeaders(token),
    });

    return response.data;
  }
}
