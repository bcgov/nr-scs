import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export type SystemSetting = AuditDetails & {
  settingKey?: string | null;
  description?: string | null;
  systemSettingValue?: string | null;
};

export type SystemSettingUpdateRequest = {
  systemSettingValue?: string | null;
};

export class SystemSettingsService {
  async getSystemSetting(settingKey: string, token?: string): Promise<SystemSetting> {
    const response = await axios.get<SystemSetting>(
      `${BackendApiConfig.BASE}/system-settings/${encodeURIComponent(settingKey)}`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async updateSystemSetting(
    settingKey: string,
    payload: SystemSettingUpdateRequest,
    token?: string,
  ): Promise<SystemSetting> {
    const response = await axios.put<SystemSetting>(
      `${BackendApiConfig.BASE}/system-settings/${encodeURIComponent(settingKey)}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }
}
