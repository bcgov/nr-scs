import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface ScaleSignatoryBlock extends AuditDetails {
  scaleSignatoryBlockId?: number | null;
  orgUnitNo?: number | null;
  orgUnitDescription?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  signatureTitle?: string | null;
  fullName?: string | null;
}

export type ScaleSignatoryBlockSearchParams = {
  scaleSignatoryBlockId?: number;
  orgUnitNo?: number;
  rollupRegionNo?: number;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  signatureTitle?: string;
};

export interface ScaleSignatoryBlockCreateRequest {
  orgUnitNo: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  signatureTitle: string;
}

export interface ScaleSignatoryBlockUpdateRequest {
  orgUnitNo: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  signatureTitle: string;
}

export class SignatureBlocksService {
  async searchSignatureBlocks(params?: ScaleSignatoryBlockSearchParams, token?: string): Promise<ScaleSignatoryBlock[]> {
    const response = await axios.get<ScaleSignatoryBlock[]>(`${BackendApiConfig.BASE}/signature-blocks`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  /**
   * The letter pages' signatory picker (`GET /letter-signature-blocks`). Same rows as
   * `searchSignatureBlocks`, but gated on `LETTER_SIGNATORY_QUERY` — held by every role that can
   * compose a letter — rather than on the Maintenance screen's `MAINTAIN_SIGNATORIES_QUERY`, which
   * letter authors such as the Check Scaler do not hold.
   */
  async searchLetterSignatureBlocks(
    params?: Pick<ScaleSignatoryBlockSearchParams, 'orgUnitNo' | 'rollupRegionNo'>,
    token?: string,
  ): Promise<ScaleSignatoryBlock[]> {
    const response = await axios.get<ScaleSignatoryBlock[]>(`${BackendApiConfig.BASE}/letter-signature-blocks`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getSignatureBlock(scaleSignatoryBlockId: number, token?: string): Promise<ScaleSignatoryBlock> {
    const response = await axios.get<ScaleSignatoryBlock>(
      `${BackendApiConfig.BASE}/signature-blocks/${encodeURIComponent(String(scaleSignatoryBlockId))}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async createSignatureBlock(payload: ScaleSignatoryBlockCreateRequest, token?: string): Promise<ScaleSignatoryBlock> {
    const response = await axios.post<ScaleSignatoryBlock>(
      `${BackendApiConfig.BASE}/signature-blocks`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateSignatureBlock(
    scaleSignatoryBlockId: number,
    payload: ScaleSignatoryBlockUpdateRequest,
    token?: string,
  ): Promise<ScaleSignatoryBlock> {
    const response = await axios.put<ScaleSignatoryBlock>(
      `${BackendApiConfig.BASE}/signature-blocks/${encodeURIComponent(String(scaleSignatoryBlockId))}`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async deleteSignatureBlock(scaleSignatoryBlockId: number, token?: string): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/signature-blocks/${encodeURIComponent(String(scaleSignatoryBlockId))}`,
      { headers: jsonHeaders(token) },
    );
  }
}
