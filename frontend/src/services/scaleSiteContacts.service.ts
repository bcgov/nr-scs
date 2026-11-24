import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';
import type {
  ClientContactSearchResult,
  ScaleSiteContact,
  ScaleSiteContactCreateRequest,
  ScaleSiteContactUpdateRequest,
  ScaleSiteOwner,
} from './scaleSiteContacts.types';

const CONTACT_ARRAY_KEYS = ['contacts', 'items', 'content', 'data', 'records', 'results', 'rows', 'list'] as const;

const firstArrayValue = (candidate: Record<string, unknown>): ScaleSiteContact[] | null => {
  for (const key of CONTACT_ARRAY_KEYS) {
    const value = candidate[key];
    if (Array.isArray(value)) {
      return value as ScaleSiteContact[];
    }
  }

  for (const value of Object.values(candidate)) {
    if (Array.isArray(value)) {
      return value as ScaleSiteContact[];
    }
  }

  return null;
};

const findArrayPayload = (payload: unknown, seen: Set<object> = new Set<object>()): ScaleSiteContact[] | null => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (seen.has(payload)) {
    return null;
  }
  seen.add(payload);

  const candidate = payload as Record<string, unknown>;
  const direct = firstArrayValue(candidate);
  if (direct != null) {
    return direct;
  }

  for (const value of Object.values(candidate)) {
    if (value && typeof value === 'object') {
      const nested = findArrayPayload(value, seen);
      if (nested != null) {
        return nested;
      }
    }
  }

  return null;
};

const normalizeContacts = (payload: unknown): ScaleSiteContact[] => {
  const contacts = findArrayPayload(payload);
  if (contacts != null) {
    return contacts;
  }

  throw new Error('Unexpected contacts response shape.');
};

export class ScaleSiteContactsService {
  async getScaleSiteContacts(scaleSiteIdNmbr: string, token?: string): Promise<ScaleSiteContact[]> {
    const response = await axios.get<ScaleSiteContact[]>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/contacts`,
      {
        headers: jsonHeaders(token),
      },
    );

    return normalizeContacts(response.data);
  }

  async getScaleSiteContact(
    scaleSiteIdNmbr: string,
    clientContactId: number,
    token?: string,
  ): Promise<ScaleSiteContact> {
    const response = await axios.get<ScaleSiteContact>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/contacts/${clientContactId}`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async createScaleSiteContact(
    scaleSiteIdNmbr: string,
    payload: ScaleSiteContactCreateRequest,
    token?: string,
  ): Promise<ScaleSiteContact> {
    const response = await axios.post<ScaleSiteContact>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/contacts`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async updateScaleSiteContact(
    scaleSiteIdNmbr: string,
    clientContactId: number,
    payload: ScaleSiteContactUpdateRequest,
    token?: string,
  ): Promise<ScaleSiteContact> {
    const response = await axios.put<ScaleSiteContact>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/contacts/${clientContactId}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async deleteScaleSiteContact(
    scaleSiteIdNmbr: string,
    clientContactId: number,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/contacts/${clientContactId}`,
      {
        headers: jsonHeaders(token),
      },
    );
  }

  async getScaleSiteOwner(scaleSiteIdNmbr: string, token?: string): Promise<ScaleSiteOwner> {
    const response = await axios.get<ScaleSiteOwner>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/owner`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async searchClientContacts(
    params: { clientContactId?: number; clientNumber?: string; clientLocnCode?: string; contactName?: string },
    token?: string,
  ): Promise<ClientContactSearchResult[]> {
    const searchParams = new URLSearchParams();
    if (params.contactName !== undefined) {
      searchParams.set('contactName', params.contactName);
    }
    if (params.clientContactId !== undefined) {
      searchParams.set('clientContactId', String(params.clientContactId));
    }
    if (params.clientNumber !== undefined) {
      searchParams.set('clientNumber', params.clientNumber);
    }
    if (params.clientLocnCode !== undefined) {
      searchParams.set('clientLocnCode', params.clientLocnCode);
    }
    const response = await axios.get<ClientContactSearchResult[]>(
      `${BackendApiConfig.BASE}/client-contacts/search?${searchParams.toString()}`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }
}
