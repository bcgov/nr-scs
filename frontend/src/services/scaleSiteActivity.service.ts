import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface ScaleSiteActivitySummary {
  scaleSiteIdNmbr?: string | null;
  lastScaleDate?: string | null;
  numberOfSamples?: number | null;
  sampleVolume?: number | null;
  scaledVolume?: number | null;
}

export class ScaleSiteActivityService {
  async getScaleSiteActivitySummary(
    scaleSiteIdNmbr: string,
    token?: string,
  ): Promise<ScaleSiteActivitySummary> {
    const response = await axios.get<ScaleSiteActivitySummary>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/activity-summary`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }
}
