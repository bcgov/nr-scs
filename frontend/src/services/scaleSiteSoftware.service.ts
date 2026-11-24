import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface ScaleSiteSoftwareSummary {
  scalingProgram?: string | null;
  version?: string | null;
  revision?: string | null;
  returnType?: string | null;
  returnCount?: number | null;
  lastUsedDate?: string | null;
}

export class ScaleSiteSoftwareService {
  /**
   * Calls GET /api/scale-sites/{scaleSiteIdNmbr}/software
   * Lists the scaling software used to submit returns at a scale site, backing the Software tab.
   */
  async getScaleSiteSoftware(
    scaleSiteIdNmbr: string,
    token?: string,
  ): Promise<ScaleSiteSoftwareSummary[]> {
    const response = await axios.get<ScaleSiteSoftwareSummary[]>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/software`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }
}
