import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface MarkSiteDesignationSummary {
  timberMark?: string | null;
  scaleSiteIdNmbr?: string | null;
  ownerCliNumber?: string | null;
}

export class ScaleSiteMarkSiteDesignationsService {
  /**
   * Calls GET /api/scale-sites/{scaleSiteIdNmbr}/mark-site-designations
   * Lists the timber marks designated to a scale site, backing the MSD tab.
   */
  async getScaleSiteMarkSiteDesignations(
    scaleSiteIdNmbr: string,
    token?: string,
  ): Promise<MarkSiteDesignationSummary[]> {
    const response = await axios.get<MarkSiteDesignationSummary[]>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/mark-site-designations`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }
}
