import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface ScaleMethodAuthClauseDetail extends AuditDetails {
  scaleMethodAuthClauseId?: number | null;
  scaleMethodTypeCode?: string | null;
  scalerAuthorizationClause?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export interface ScaleMethodAuthClauseCreateRequest {
  scaleMethodTypeCode: string;
  scalerAuthorizationClause: string;
  effectiveDate: string;
  expiryDate?: string | null;
}

export interface ScaleMethodAuthClauseUpdateRequest {
  scaleMethodTypeCode: string;
  scalerAuthorizationClause: string;
  effectiveDate: string;
  expiryDate?: string | null;
}

export class AuthorizationClausesService {
  async searchAuthorizationClauses(
    params?: { scaleMethodTypeCode?: string },
    token?: string,
  ): Promise<ScaleMethodAuthClauseDetail[]> {
    const response = await axios.get<ScaleMethodAuthClauseDetail[]>(
      `${BackendApiConfig.BASE}/auth-clauses`,
      {
        params,
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async getAuthorizationClause(
    scaleMethodTypeCode: string,
    scaleMethodAuthClauseId: number,
    token?: string,
  ): Promise<ScaleMethodAuthClauseDetail> {
    const response = await axios.get<ScaleMethodAuthClauseDetail>(
      `${BackendApiConfig.BASE}/auth-clauses/${encodeURIComponent(scaleMethodTypeCode)}/${encodeURIComponent(String(scaleMethodAuthClauseId))}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async createAuthorizationClause(
    payload: ScaleMethodAuthClauseCreateRequest,
    token?: string,
  ): Promise<ScaleMethodAuthClauseDetail> {
    const response = await axios.post<ScaleMethodAuthClauseDetail>(
      `${BackendApiConfig.BASE}/auth-clauses`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateAuthorizationClause(
    scaleMethodTypeCode: string,
    scaleMethodAuthClauseId: number,
    payload: ScaleMethodAuthClauseUpdateRequest,
    token?: string,
  ): Promise<ScaleMethodAuthClauseDetail> {
    const response = await axios.put<ScaleMethodAuthClauseDetail>(
      `${BackendApiConfig.BASE}/auth-clauses/${encodeURIComponent(scaleMethodTypeCode)}/${encodeURIComponent(String(scaleMethodAuthClauseId))}`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async deleteAuthorizationClause(
    scaleMethodTypeCode: string,
    scaleMethodAuthClauseId: number,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/auth-clauses/${encodeURIComponent(scaleMethodTypeCode)}/${encodeURIComponent(String(scaleMethodAuthClauseId))}`,
      { headers: jsonHeaders(token) },
    );
  }
}
