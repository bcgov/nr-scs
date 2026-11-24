import axios from 'axios';
import type { AuditDetails } from './audit.types';
import { BackendApiConfig } from './APIs';
import { extractFilename } from './utils/contentDisposition';
import { blobHeaders, jsonHeaders } from './utils/headers';

export type CheckScaleAdvisoryLetterReportRequest = {
  regDist: string;
  ccField?: string;
  scaleSignatoryBlockId?: number;
  outputFormat: 'PDF';
  emailRecipient?: string;
  preview: boolean;
};

export type FieldErrorField =
  | 'returnType'
  | 'checkScaleDdn'
  | 'checkScaleDdv'
  | 'originalScaleDdn'
  | 'originalScaleDdv';

export interface FieldError {
  field: FieldErrorField;
  message: string;
}

export interface CheckScaleApiModel extends AuditDetails {
  checkScaleId: number;
  checkScaleTypeCode?: string | null;
  ckscType?: string | null;
  partialInd?: string | null;
  followedGoodPracticeInd?: string | null;
  originalWithinStandardInd?: string | null;
  originalScaleNetValue?: number | null;
  checkScaleNetValue?: number | null;
  chkScalerCommentTxt?: string | null;
  orgLogTallyDocNo?: string | null;
  orgLogTallyVer?: number | null;
  chkLogTallyDocNo?: string | null;
  chkLogTallyVer?: number | null;
  orgSampleLogTallyVer?: number | null;
  orgSampleLogTallyDocNo?: string | null;
  chkSampleLogTallyVer?: number | null;
  chkSampleLogTallyDocNo?: string | null;
  originalScalerLicenceNo?: string | null;
  checkScalerLicenceNo?: string | null;
  secondScalerLicenceNo?: string | null;
  scaleSiteIdNmbr?: string | null;
  timberMark?: string | null;
  loadArrivalNumber?: string | null;
  weighSlipNumber?: number | null;
  checkReplacesOriginalInd?: string | null;
  population?: string | null;
  stratum?: string | null;
  samplingYear?: number | null;
  originalScaleDate?: string | null;
  originalScaleReturnNo?: number | null;
  originalScaleTotalTops?: number | null;
  originalScaleTotalButts?: number | null;
  originalScaleTotalLength?: number | null;
  chkScaleDate?: string | null;
  chkScaleReturnNo?: number | null;
  chkScaleTotalTops?: number | null;
  chkScaleTotalButts?: number | null;
  chkScaleTotalLength?: number | null;
  originalScaleTotalVolume?: number | null;
  originalScaleTotalPieces?: number | null;
  chkScaleTotalVolume?: number | null;
  chkScaleTotalPieces?: number | null;
  speciesSummary?: Array<{
    speciesCode?: string | null;
    speciesGrade?: string | null;
    productCode?: string | null;
    orgPieces?: number | null;
    orgNetVolume?: number | null;
    orgNetValue?: number | null;
    chkPieces?: number | null;
    chkNetVolume?: number | null;
    chkNetValue?: number | null;
  }> | null;
}

export interface CheckScaleValidationRequest {
  chkLogTallyDocNo?: string | null;
  chkLogTallyVer?: number | null;
  chkSampleLogTallyDocNo?: string | null;
  chkSampleLogTallyVer?: number | null;
  orgLogTallyDocNo?: string | null;
  orgLogTallyVer?: number | null;
  orgSampleLogTallyDocNo?: string | null;
  orgSampleLogTallyVer?: number | null;
}

export interface CheckScaleValidationResponse {
  ok: boolean;
  errors?: FieldError[];
  checkScale?: CheckScaleApiModel;
}

export interface CheckScaleCreateRequest {
  chkLogTallyDocNo?: string | null;
  chkLogTallyVer?: number | null;
  chkSampleLogTallyDocNo?: string | null;
  chkSampleLogTallyVer?: number | null;
  orgLogTallyDocNo?: string | null;
  orgLogTallyVer?: number | null;
  orgSampleLogTallyDocNo?: string | null;
  orgSampleLogTallyVer?: number | null;
  checkScaleTypeCode: string;
  followedGoodPracticeInd: 'Y' | 'N';
  originalWithinStandardInd: 'Y' | 'N';
  chkScalerCommentTxt?: string | null;
  originalScaleNetValue: number;
  checkScaleNetValue: number;
}

export interface CheckScaleCreateResponse {
  checkScaleId: number;
}

export interface CheckScaleUpdateRequest {
  checkScaleTypeCode: string;
  followedGoodPracticeInd: 'Y' | 'N';
  originalWithinStandardInd: 'Y' | 'N';
  chkScalerCommentTxt?: string | null;
  originalScaleNetValue: number;
  checkScaleNetValue: number;
}

/** One row of the Check Scales tab table (scaler and scale-site views share this shape). */
export interface CheckScaleSummaryRow {
  checkScaleId?: number | null;
  scaleSiteIdNmbr?: string | null;
  primCheckLicenceNo?: string | null;
  secCheckLicenceNo?: string | null;
  primOrigLicenceNo?: string | null;
  secOrigLicenceNo?: string | null;
  origScaleDate?: string | null;
  checkScaleDate?: string | null;
  pieceDiff?: number | null;
  volumeVariance?: number | null;
  valueVariance?: number | null;
  replacedInd?: string | null;
  checkScaleTypeCode?: string | null;
  followedGoodPracticeInd?: string | null;
  originalWithinStandardInd?: string | null;
}

/** Check Scale Statistics block on the scaler tab; all fields null when there are no rows. */
export interface CheckScaleStats {
  last10Volume?: number | null;
  last10Value?: number | null;
  past12Volume?: number | null;
  past12Value?: number | null;
  allVolume?: number | null;
  allValue?: number | null;
}

export interface ScalerCheckScaleTabResult {
  stats?: CheckScaleStats | null;
  checkScales?: CheckScaleSummaryRow[] | null;
}

export interface ScaleSiteCheckScaleTabResult {
  checkScales?: CheckScaleSummaryRow[] | null;
}

/** Legacy scaler tab filter values; the backend treats anything else as 'All'. */
export type ScalerCheckScaleFilterValue =
  | 'All'
  | 'Primary'
  | 'Secondary'
  | 'Primary/Secondary'
  | 'Check';

export class CheckScalesService {
  /**
   * GET /api/check-scales/search?checkScaleId={id}
   * Returns the first matching row, or `null` when no check scale has that id — so a caller can tell
   * "not found" apart from a failed request, which still rejects.
   */
  async findCheckScale(id: string, token?: string): Promise<CheckScaleApiModel | null> {
    const response = await axios.get<CheckScaleApiModel[]>(
      `${BackendApiConfig.BASE}/check-scales/search?checkScaleId=${encodeURIComponent(id)}`,
      { headers: jsonHeaders(token) },
    );
    return response.data?.[0] ?? null;
  }

  /**
   * GET /api/check-scales/search?checkScaleId={id}
   * Returns the first matching row (the search returns a list); throws when there is none.
   */
  async getCheckScale(id: string, token?: string): Promise<CheckScaleApiModel> {
    const match = await this.findCheckScale(id, token);
    if (!match) {
      throw new Error(`CheckScale ${id} not found`);
    }
    return match;
  }

  /**
   * POST /api/check-scales/validate — step 1 of the create flow.
   * Returns 200 with the enriched preview when valid, 400 with the same body shape
   * (ok=false + field-level errors) on validation failure. Both cases come back
   * as a {@link CheckScaleValidationResponse}.
   */
  async validateCheckScale(
    payload: CheckScaleValidationRequest,
    token?: string,
  ): Promise<CheckScaleValidationResponse> {
    try {
      const response = await axios.post<CheckScaleValidationResponse>(
        `${BackendApiConfig.BASE}/check-scales/validate`,
        payload,
        { headers: jsonHeaders(token) },
      );
      return response.data;
    } catch (err: unknown) {
      const body = (err as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      if (body && typeof body === 'object' && 'ok' in body) {
        return body as CheckScaleValidationResponse;
      }
      throw err;
    }
  }

  /**
   * POST /api/check-scales/create — step 2 of the create flow.
   * Returns the new check scale's id; non-201 responses bubble up.
   */
  async createCheckScale(
    payload: CheckScaleCreateRequest,
    token?: string,
  ): Promise<CheckScaleCreateResponse> {
    const response = await axios.post<CheckScaleCreateResponse>(
      `${BackendApiConfig.BASE}/check-scales/create`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  /**
   * PUT /api/check-scales/{id} — updates the editable fields of an existing check scale.
   * Returns the updated record; non-200 responses bubble up.
   */
  async updateCheckScale(
    id: string,
    payload: CheckScaleUpdateRequest,
    token?: string,
  ): Promise<CheckScaleApiModel> {
    const response = await axios.put<CheckScaleApiModel>(
      `${BackendApiConfig.BASE}/check-scales/${encodeURIComponent(id)}`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  /**
   * DELETE /api/check-scales/{id} — deletes a detail check scale and its SPG-summary children
   * (legacy CheckScaleAction.delete → scs_check_scale_pkg.delete_rec). Resolves on 204; non-2xx
   * responses bubble up.
   */
  async deleteCheckScale(id: string, token?: string): Promise<void> {
    await axios.delete(`${BackendApiConfig.BASE}/check-scales/${encodeURIComponent(id)}`, {
      headers: jsonHeaders(token),
    });
  }

  /**
   * GET /api/scalers/{scalerLicenceNo}/check-scales?filter= — Scaler Check Scales tab,
   * statistics + summary rows in one round-trip like the legacy screen.
   */
  async getScalerCheckScales(
    scalerLicenceNo: string,
    filter: ScalerCheckScaleFilterValue,
    token?: string,
  ): Promise<ScalerCheckScaleTabResult> {
    const response = await axios.get<ScalerCheckScaleTabResult>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/check-scales?filter=${encodeURIComponent(filter)}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  /**
   * GET /api/scale-sites/{scaleSiteIdNmbr}/check-scales — Scale Site Check Scales tab.
   * Omitting the type code returns all check scales for the site.
   */
  async getScaleSiteCheckScales(
    scaleSiteIdNmbr: string,
    checkScaleTypeCode?: string,
    token?: string,
  ): Promise<ScaleSiteCheckScaleTabResult> {
    const query = checkScaleTypeCode
      ? `?checkScaleTypeCode=${encodeURIComponent(checkScaleTypeCode)}`
      : '';
    const response = await axios.get<ScaleSiteCheckScaleTabResult>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/check-scales${query}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  /**
   * POST /api/check-scales/{checkScaleId}/advisory-letter — generate the R004 advisory letter.
   */
  async createCheckScaleAdvisoryLetter(
    checkScaleId: number,
    payload: CheckScaleAdvisoryLetterReportRequest,
    token?: string,
  ): Promise<{ blob: Blob; filename?: string | null }> {
    const response = await axios.post(
      `${BackendApiConfig.BASE}/check-scales/${encodeURIComponent(String(checkScaleId))}/advisory-letter`,
      payload,
      {
        responseType: 'blob',
        headers: blobHeaders(token),
      },
    );

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }
}
