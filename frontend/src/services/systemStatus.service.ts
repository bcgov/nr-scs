import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export type SystemStatus = {
  enabled: boolean;
};

export class SystemStatusService {
  /**
   * Calls GET /api/system-status (public, no auth).
   * Returns whether the SCS system is currently enabled. Used to decide whether to
   * render the "system temporarily disabled" interstitial for non-administrator users.
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await axios.get<SystemStatus>(
      `${BackendApiConfig.BASE}/system-status`,
      {
        headers: jsonHeaders(),
      },
    );

    return response.data;
  }
}
