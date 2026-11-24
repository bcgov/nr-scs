import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface TimberMarkExistsResponse {
  timberMark: string;
  exists: boolean;
}

export class TimberMarksService {
  /**
   * Calls GET /api/timber-marks/exists — whether HAULING_AUTHORITY holds the mark (exact match, folded to
   * upper case server-side). The legacy timber-mark existence rule the Mark Site Designation and Designated
   * Marks Exception report screens apply before submitting; a real mark needs no designation to exist.
   */
  async timberMarkExists(timberMark: string, token?: string): Promise<boolean> {
    const response = await axios.get<TimberMarkExistsResponse>(
      `${BackendApiConfig.BASE}/timber-marks/exists`,
      {
        params: { timberMark },
        headers: jsonHeaders(token),
      },
    );
    return response.data.exists;
  }
}
