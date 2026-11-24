import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface Client {
  client?: string | null;
  companyName?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  city?: string | null;
  businessPhone?: string | null;
  cellPhone?: string | null;
  emailAddress?: string | null;
  clientNumber?: string | null;
  clientLocnCode?: string | null;
}

export type ClientSearchParams = {
  client?: string;
  companyName?: string;
  lastName?: string;
  firstName?: string;
  city?: string;
  businessPhone?: string;
  cellPhone?: string;
  emailAddress?: string;
  clientNumber?: string;
  clientLocnCode?: string;
  primarySort?: number;
  secondarySort?: number;
};

export class ClientsService {
  /**
   * Calls GET /api/clients/search
   */
  async searchClients(params: ClientSearchParams, token?: string): Promise<Client[]> {
    const response = await axios.get<Client[]>(`${BackendApiConfig.BASE}/clients/search`, {
      params,
      headers: jsonHeaders(token),
    });

    return response.data;
  }
}

