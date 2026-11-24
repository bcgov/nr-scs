import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface AppointmentTypeLov {
  code?: string | null;
  description?: string | null;
}

export interface RegionDistrictLov {
  code?: string | null;
  description?: string | null;
}

export interface RegionDistrictRollupLov {
  code?: number | null;
  description?: string | null;
  rollupRegionNo?: number | null;
  orgUnitCode?: string | null;
}

export interface GradingCodeAppointmentTypeLov {
  code?: string | null;
  description?: string | null;
  scaleGradingSystemCode?: string | null;
  scalerAppointmentType?: string | null;
}

export interface ScalerTrainingTypeLov {
  code?: string | null;
  description?: string | null;
  scalerTrainingClassCode?: string | null;
  licenceAccreditInd?: string | null;
}

export interface StaticLov {
  tableKey?: string | null;
  code?: string | null;
  description?: string | null;
}

export interface SpeciesProductGradeXref {
  scaleSpeciesCode?: string | null;
  scaleProductCode?: string | null;
  scaleGradeCode?: string | null;
}

export interface ScaleMethodTypeLov {
  code?: string | null;
  description?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export type AppointmentTypeLovParams = {
  code?: string;
  description?: string;
};

export type RegionDistrictLovParams = {
  code?: string;
  description?: string;
};

export type RegionDistrictRollupLovParams = {
  orgUnitNo?: number;
  description?: string;
  rollupRegionNo?: number;
};

export type StaticLovParams = {
  tableKey?: string;
};

export type ScaleMethodTypeLovParams = {
  code?: string;
  description?: string;
};

export class LovService {
  async getAppointmentTypeLov(params?: AppointmentTypeLovParams, token?: string): Promise<AppointmentTypeLov[]> {
    const response = await axios.get<AppointmentTypeLov[]>(`${BackendApiConfig.BASE}/appointment-type-lov`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getRegionDistrictLov(params?: RegionDistrictLovParams, token?: string): Promise<RegionDistrictLov[]> {
    const response = await axios.get<RegionDistrictLov[]>(`${BackendApiConfig.BASE}/region-district-lov`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getRegionDistrictRollupLov(
    params?: RegionDistrictRollupLovParams,
    token?: string,
  ): Promise<RegionDistrictRollupLov[]> {
    const response = await axios.get<RegionDistrictRollupLov[]>(`${BackendApiConfig.BASE}/region-district-rollup-lov`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getGradingCodeAppointmentTypeLov(token?: string): Promise<GradingCodeAppointmentTypeLov[]> {
    const response = await axios.get<GradingCodeAppointmentTypeLov[]>(`${BackendApiConfig.BASE}/grading-code-appointment-type-lov`, {
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getScaleMethodTypeLov(params?: ScaleMethodTypeLovParams, token?: string): Promise<ScaleMethodTypeLov[]> {
    const response = await axios.get<ScaleMethodTypeLov[]>(`${BackendApiConfig.BASE}/scale-method-type-lov`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getScalerTrainingTypeLov(token?: string): Promise<ScalerTrainingTypeLov[]> {
    const response = await axios.get<ScalerTrainingTypeLov[]>(`${BackendApiConfig.BASE}/scaler-training-type-lov`, {
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getStaticLov(params?: StaticLovParams, token?: string): Promise<StaticLov[]> {
    const response = await axios.get<StaticLov[]>(`${BackendApiConfig.BASE}/static-lov`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  /**
   * Calls GET /api/species-product-grade-xref-lov
   * Retrieves every valid species/product/grade combination, used to filter the
   * Product and Grade dropdowns on the check-scale create/update forms.
   */
  async getSpeciesProductGradeXref(token?: string): Promise<SpeciesProductGradeXref[]> {
    const response = await axios.get<SpeciesProductGradeXref[]>(`${BackendApiConfig.BASE}/species-product-grade-xref-lov`, {
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  /**
   * Calls GET /api/templates/{filterField}
   * Retrieves template LOVs by filter field (e.g. SCS_SCALE_AUTH_TMPLT_LV_VW_PKG)
   */
  async getTemplates(filterField: string, token?: string): Promise<StaticLov[]> {
    const response = await axios.get<StaticLov[]>(`${BackendApiConfig.BASE}/templates/${encodeURIComponent(filterField)}`, {
      headers: jsonHeaders(token),
    });
    return response.data;
  }
}

