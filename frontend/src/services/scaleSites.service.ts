import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface ScaleSiteSearchResult {
  scaleSiteIdNmbr?: string | null;
  siteName?: string | null;
  region?: string | null;
  district?: string | null;
  methodTypeCodeName?: string | null;
  ownerClientNumber?: string | null;
  ownerClientLocnCode?: string | null;
}

export interface ScaleSiteTombstone {
  scaleSiteIdNmbr?: string | null;
  siteName?: string | null;
  regionName?: string | null;
  districtName?: string | null;
}

export interface ScaleSiteSummarySiteType {
  priorityCode?: string | null;
  scaleMethodTypeCode?: string | null;
}

export interface ScaleSiteSummary extends AuditDetails {
  scaleSiteIdNmbr?: string | null;
  siteName?: string | null;
  ownerClientNumber?: string | null;
  ownerClientLocnCode?: string | null;
  orgUnitNo?: number | null;
  regDistDisplay?: string | null;
  timberBrand?: string | null;
  siteLocation?: string | null;
  latitudeDegrees?: number | null;
  latitudeMinutes?: number | null;
  latitudeSeconds?: number | null;
  longitudeDegrees?: number | null;
  longitudeMinutes?: number | null;
  longitudeSeconds?: number | null;
  siteTypes?: ScaleSiteSummarySiteType[];
}

export interface Coordinate {
  degrees: number;
  minutes: number;
  seconds: number;
}

import type { ScaleSitePriorityCode } from './scaleSites.constants';

export { SCALE_SITE_PRIORITY_CODE, type ScaleSitePriorityCode } from './scaleSites.constants';

export interface SiteScalingMethodInput {
  scaleMethodTypeCode: string;
  scaleSitePriorityCode: ScaleSitePriorityCode;
}

export interface ScaleSiteCreateRequest {
  siteName: string;
  ownerClientNumber: string;
  ownerClientLocnCode: string;
  orgUnitNo: number;
  siteLocation: string;
  timberBrand?: string | null;
  latitude?: Coordinate | null;
  longitude?: Coordinate | null;
  scalingMethods: SiteScalingMethodInput[];
}

export interface ScaleSiteUpdateRequest {
  siteName: string;
  ownerClientNumber: string;
  ownerClientLocnCode: string;
  orgUnitNo: number;
  siteLocation: string;
  timberBrand?: string | null;
  latitude?: Coordinate | null;
  longitude?: Coordinate | null;
  scalingMethods: SiteScalingMethodInput[];
}

export type ScaleSiteSearchParams = {
  scaleSiteIdNmbr?: string;
  orgUnitNo?: number;
  siteName?: string;
  ownerClientNumber?: string;
  ownerClientLocnCode?: string;
  methodTypes?: string[];
  primarySort?: number;
  secondarySort?: number;
};

const serializeScaleSiteSearchParams = (params: ScaleSiteSearchParams): string => {
  const query = new URLSearchParams();

  const append = (key: string, value?: string | number) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.append(key, String(value));
  };

  append('scaleSiteIdNmbr', params.scaleSiteIdNmbr);
  append('orgUnitNo', params.orgUnitNo);
  append('siteName', params.siteName);
  append('ownerClientNumber', params.ownerClientNumber);
  append('ownerClientLocnCode', params.ownerClientLocnCode);
  for (const methodType of params.methodTypes ?? []) {
    append('methodTypes', methodType);
  }
  append('primarySort', params.primarySort);
  append('secondarySort', params.secondarySort);

  return query.toString();
};

export class ScaleSitesService {
  async searchScaleSites(params: ScaleSiteSearchParams, token?: string): Promise<ScaleSiteSearchResult[]> {
    const response = await axios.get<ScaleSiteSearchResult[]>(`${BackendApiConfig.BASE}/scale-sites/search`, {
      params,
      paramsSerializer: {
        serialize: serializeScaleSiteSearchParams,
      },
      headers: jsonHeaders(token),
    });

    return response.data;
  }

  async getScaleSiteTombstone(scaleSiteIdNmbr: string, token?: string): Promise<ScaleSiteTombstone> {
    const response = await axios.get<ScaleSiteTombstone>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/tombstone`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async getScaleSiteSummary(scaleSiteIdNmbr: string, token?: string): Promise<ScaleSiteSummary> {
    const response = await axios.get<ScaleSiteSummary>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/summary`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async createScaleSite(payload: ScaleSiteCreateRequest, token?: string): Promise<ScaleSiteSummary> {
    const response = await axios.post<ScaleSiteSummary>(
      `${BackendApiConfig.BASE}/scale-sites`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async updateScaleSite(
    scaleSiteIdNmbr: string,
    payload: ScaleSiteUpdateRequest,
    token?: string,
  ): Promise<ScaleSiteSummary> {
    const response = await axios.put<ScaleSiteSummary>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }
}

export { serializeScaleSiteSearchParams };


