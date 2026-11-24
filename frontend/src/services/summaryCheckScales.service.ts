import axios from 'axios';
import { BackendApiConfig } from './APIs';
import type { CheckScaleApiModel } from './checkScales.service';
import { jsonHeaders } from './utils/headers';

export type SummaryCheckScaleReturnType = 'LOG_TALLY' | 'SAMPLE_LOG_TALLY' | 'SPECIAL_FOREST_PRODUCT';
export type YesNoInd = 'Y' | 'N';

export interface SummaryCheckScaleSpgRowRequest {
  scaleSpeciesCode: string;
  scaleProductCode?: string | null;
  scaleGradeCode?: string | null;
  originalScalePieceCnt: number;
  originalScaleNetVolume: number;
  originalScaleNetValue: number;
  checkScalePieceCnt: number;
  checkScaleNetVolume: number;
  checkScaleNetValue: number;
}

export interface SummaryCheckScaleCreateRequest {
  returnType: SummaryCheckScaleReturnType;
  checkScaleTypeCode: string;
  originalScalerLicenceNo: string;
  checkScalerLicenceNo: string;
  loadArrivalNumber?: string | null;
  weighSlipNumber?: number | null;
  timberMark: string;
  scaleSiteIdNmbr: string;
  followedGoodPracticeInd: YesNoInd;
  originalWithinStandardInd: YesNoInd;
  checkReplacesOriginalInd: YesNoInd;
  partialInd?: YesNoInd | null;
  originalScaleDate: string;
  originalScaleReturnNo: number;
  chkScaleDate: string;
  chkScaleReturnNo: number;
  chkScalerCommentTxt?: string | null;
  spgRows: SummaryCheckScaleSpgRowRequest[];
}

export interface SummaryCheckScaleCreateResponse {
  checkScaleId: number;
}

/** Header update payload — the create request minus the SPG rows (rows are managed separately). */
export type SummaryCheckScaleUpdateRequest = Omit<SummaryCheckScaleCreateRequest, 'spgRows'>;

/** Composite key identifying one SPG roll-up row for deletion. */
export interface SummaryCheckScaleSpgRowKey {
  scaleSpeciesCode: string;
  scaleProductCode: string;
  scaleGradeCode: string;
}

/** One row of the Scaler Summary Check Scales tab list (legacy P132 summaryCheckScaleList.jsp). */
export interface SummaryCheckScaleRow {
  checkScaleId?: number | null;
  /** Summary Type code — the column unique to the summary list (vs the detail Check Scales tab). */
  ckscType?: string | null;
  primCheckLicenceNo?: string | null;
  primOrigLicenceNo?: string | null;
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

/** Scaler Summary Check Scales tab payload — list only (no statistics, no filter). */
export interface ScalerSummaryCheckScaleTabResult {
  summaryCheckScales?: SummaryCheckScaleRow[] | null;
}

export class SummaryCheckScalesService {
  /**
   * GET /api/scalers/{scalerLicenceNo}/summary-check-scales — Scaler Summary Check Scales tab.
   * List only (no statistics, no filter), matching the legacy summary list.
   */
  async getScalerSummaryCheckScales(
    scalerLicenceNo: string,
    token?: string,
  ): Promise<ScalerSummaryCheckScaleTabResult> {
    const response = await axios.get<ScalerSummaryCheckScaleTabResult>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/summary-check-scales`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  /**
   * POST /api/summary-check-scales/create — single-step summary check scale create.
   * Returns the new check scale's id; non-201 responses bubble up.
   */
  async createSummaryCheckScale(
    payload: SummaryCheckScaleCreateRequest,
    token?: string,
  ): Promise<SummaryCheckScaleCreateResponse> {
    const response = await axios.post<SummaryCheckScaleCreateResponse>(
      `${BackendApiConfig.BASE}/summary-check-scales/create`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  /**
   * GET /api/check-scales/search?checkScaleId= — loads a summary check scale (header + SPG overlay).
   * Summaries live in the shared check_scale table, so this reuses the check-scales search endpoint.
   * Throws if no record matches the id.
   */
  async getSummaryCheckScale(checkScaleId: string | number, token?: string): Promise<CheckScaleApiModel> {
    const response = await axios.get<CheckScaleApiModel[]>(
      `${BackendApiConfig.BASE}/check-scales/search?checkScaleId=${encodeURIComponent(String(checkScaleId))}`,
      { headers: jsonHeaders(token) },
    );
    const match = response.data?.[0];
    if (!match) {
      throw new Error(`Summary check scale ${checkScaleId} not found`);
    }
    return match;
  }

  /** PUT /api/summary-check-scales/{checkScaleId} — header-only update; returns the reloaded record. */
  async updateSummaryCheckScale(
    checkScaleId: string | number,
    payload: SummaryCheckScaleUpdateRequest,
    token?: string,
  ): Promise<CheckScaleApiModel> {
    const response = await axios.put<CheckScaleApiModel>(
      `${BackendApiConfig.BASE}/summary-check-scales/${encodeURIComponent(String(checkScaleId))}`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  /** POST /api/summary-check-scales/{checkScaleId}/spg-rows — adds one SPG row; returns the reloaded record. */
  async addSpgRow(
    checkScaleId: string | number,
    row: SummaryCheckScaleSpgRowRequest,
    token?: string,
  ): Promise<CheckScaleApiModel> {
    const response = await axios.post<CheckScaleApiModel>(
      `${BackendApiConfig.BASE}/summary-check-scales/${encodeURIComponent(String(checkScaleId))}/spg-rows`,
      row,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  /**
   * DELETE /api/summary-check-scales/{checkScaleId}/spg-rows — deletes one SPG row by its composite
   * key (species/product/grade); returns the reloaded record.
   *
   * The key goes in the BODY, not in query params. Product and grade are stored as a single space for
   * the non-applicable cases, and the backend trims whitespace-only query parameters to null
   * (`RequestParamTrimmingAdvice`), which made every blanked-key delete fail before reaching the
   * handler. Request bodies bypass that binder. Do not move this back to `params`.
   */
  async deleteSpgRow(
    checkScaleId: string | number,
    key: SummaryCheckScaleSpgRowKey,
    token?: string,
  ): Promise<CheckScaleApiModel> {
    const response = await axios.delete<CheckScaleApiModel>(
      `${BackendApiConfig.BASE}/summary-check-scales/${encodeURIComponent(String(checkScaleId))}/spg-rows`,
      {
        headers: jsonHeaders(token),
        data: {
          scaleSpeciesCode: key.scaleSpeciesCode,
          scaleProductCode: key.scaleProductCode,
          scaleGradeCode: key.scaleGradeCode,
        },
      },
    );
    return response.data;
  }

  /** DELETE /api/summary-check-scales/{checkScaleId} — deletes the whole record (SPG rows cascade). */
  async deleteSummaryCheckScale(checkScaleId: string | number, token?: string): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/summary-check-scales/${encodeURIComponent(String(checkScaleId))}`,
      { headers: jsonHeaders(token) },
    );
  }
}
