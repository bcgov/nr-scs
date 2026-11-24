import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface HaulMarkAuthorization {
  haulingMarkAuthorizationId?: number | null;
  timberMark?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  orgUnitName?: string | null;
}

export type HaulMarkAuthorizationSearchParams = {
  haulingMarkAuthorizationId?: number;
  timberMark?: string;
  effectiveDate?: string;
  expiryDate?: string;
  orgUnitName?: string;
  primarySort?: number;
  secondarySort?: number;
};

export class HaulMarkAuthorizationsService {
  /**
   * Calls GET /api/haul-mark-authorizations/search
   */
  async searchHaulMarkAuthorizations(
    params: HaulMarkAuthorizationSearchParams,
    token?: string,
  ): Promise<HaulMarkAuthorization[]> {
    const response = await axios.get<HaulMarkAuthorization[]>(
      `${BackendApiConfig.BASE}/haul-mark-authorizations/search`,
      {
        params,
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }
}

