import {
  Column,
  Form,
  Grid,
  InlineNotification,
  TextArea,
} from '@carbon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type FC, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/core/Button';
import { WELCOME_SUMMARY_QUERY_KEY } from '@/config/react-query/queryKeys';
import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { SystemSetting, SystemSettingUpdateRequest } from '@/services/systemSettings.service';

import { extractApiError } from '@/utils/extractApiError';

const SYSTEM_SETTING_KEY = 'WMSG';
const NEWS_LABEL = 'Current News';
const NEWS_MAX_LENGTH = 4000;

/**
 * Client-side validation for the welcome message, mirroring the backend
 * `SystemSettingService.validateValue` rules so the administrator gets an immediate, meaningful
 * message without a round-trip. The backend still enforces both (bean-validation `@Size` +
 * service check) as a backstop. Returns null when the value is valid.
 */
function validateNews(value: string): string | null {
  if (!value.trim()) {
    return `${NEWS_LABEL} is required.`;
  }
  if (value.length > NEWS_MAX_LENGTH) {
    return `${NEWS_LABEL} can not be greater than ${NEWS_MAX_LENGTH} characters.`;
  }
  return null;
}

const SystemAdminPage: FC = () => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentNews, setCurrentNews] = useState('');
  const [initialNews, setInitialNews] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const settingQuery = useQuery<SystemSetting, Error>({
    queryKey: ['system-setting', SYSTEM_SETTING_KEY],
    queryFn: async () => {
      const token = await userToken();
      return API.systemSettings.getSystemSetting(SYSTEM_SETTING_KEY, token);
    },
  });

  useEffect(() => {
    if (!settingQuery.data) {
      return;
    }
    const value = settingQuery.data.systemSettingValue ?? '';
    setCurrentNews(value);
    setInitialNews(value);
  }, [settingQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      const payload: SystemSettingUpdateRequest = { systemSettingValue: currentNews };
      return API.systemSettings.updateSystemSetting(SYSTEM_SETTING_KEY, payload, token);
    },
    onSuccess: async (data) => {
      const value = data.systemSettingValue ?? '';
      setInitialNews(value);
      setCurrentNews(value);
      setSuccess('System setting saved.');
      await queryClient.invalidateQueries({ queryKey: ['system-setting', SYSTEM_SETTING_KEY] });
      // The Home/welcome screen renders this same setting as "Current News" through its own
      // ['welcome-summary'] query. Drop it, or navigating Home after a save shows the pre-save
      // value until the user reloads the browser. `removeQueries`, not `invalidateQueries`: the
      // Landing page is unmounted while we are on this screen, so its query is inactive and the
      // global `refetchOnMount: false` means an invalidated-but-cached entry would still be served
      // when it remounts. Removing the entry leaves nothing to serve, which forces the refetch.
      queryClient.removeQueries({ queryKey: WELCOME_SUMMARY_QUERY_KEY });
    },
    onError: () => {
      setSuccess(null);
    },
  });

  const handleSave = () => {
    const error = validateNews(currentNews);
    if (error) {
      setValidationError(error);
      setSuccess(null);
      return;
    }
    setValidationError(null);
    saveMutation.mutate();
  };

  const errorMessage = useMemo(() => {
    if (settingQuery.isError) {
      return extractApiError(settingQuery.error, 'Unable to load system setting.');
    }
    if (saveMutation.isError) {
      return extractApiError(saveMutation.error, 'Unable to save system setting.');
    }
    return null;
  }, [saveMutation.error, saveMutation.isError, settingQuery.error, settingQuery.isError]);

  const isLoading = settingQuery.isLoading || saveMutation.isPending;
  const isSaveDisabled = isLoading || currentNews === initialNews;

  const handleReset = () => {
    setCurrentNews(initialNews);
    setSuccess(null);
    setValidationError(null);
    saveMutation.reset();
  };

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Maintain - System" />

        {settingQuery.isLoading ? (
          <InlineNotification kind="info" title="Loading system settings..." lowContrast className="mt-4" />
        ) : null}

        {success ? (
          <InlineNotification kind="success" title={success} lowContrast className="mt-4" />
        ) : null}

        {validationError ? (
          <InlineNotification kind="error" title={validationError} lowContrast className="mt-4" />
        ) : null}

        {errorMessage ? (
          <InlineNotification kind="error" title="Unable to load system settings" subtitle={errorMessage} lowContrast className="mt-4" />
        ) : null}

        <Form onSubmit={(e) => e.preventDefault()} className={`report-form system-settings-form scs__form${isLoading ? ' is-loading' : ''}`}>
          <Grid className="scs__form__grid">
            <Column lg={16} md={8} sm={4}>
              <TextArea
                id="current-news"
                labelText="Current News"
                value={currentNews}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  setCurrentNews(e.target.value);
                  setSuccess(null);
                  setValidationError(null);
                }}
                rows={10}
                disabled={isLoading}
              />
            </Column>

            <Column lg={16} md={8} sm={4}>
              <div className="form-actions">
                <Button kind="secondary" type="button" onClick={() => navigate('/welcome')}>
                  Back
                </Button>
                <Button kind="secondary" onClick={handleReset} disabled={isLoading || currentNews === initialNews}>
                  Reset
                </Button>
                <Button kind="primary" onClick={handleSave} disabled={isSaveDisabled}>
                  Save Record
                </Button>
              </div>
            </Column>
          </Grid>
        </Form>
      </Column>
    </Grid>
  );
};

export default SystemAdminPage;
