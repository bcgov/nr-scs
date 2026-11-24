import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';
import { WELCOME_SUMMARY_QUERY_KEY } from '@/config/react-query/queryKeys';

import MaintainSystem from './index';

beforeEach(() => {
  resetApiMock();
  apiMock.systemSettings.getSystemSetting.mockResolvedValue({ systemSettingValue: 'All systems normal.' });
});

const renderPage = () => renderWithProviders(<MaintainSystem />);

describe('Maintain — System', () => {
  it('renders the heading and the news field', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(screen.getAllByText('Maintain - System').length).toBeGreaterThan(0));
    expect(controlById(container, 'current-news')).toBeInTheDocument();
  });

  it('offers Back, Reset and Save Record', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it('loads the current settings', async () => {
    renderPage();

    await waitFor(() => expect(apiMock.systemSettings.getSystemSetting).toHaveBeenCalled());
  });

  it('keeps edited news text', async () => {
    const { container } = renderPage();

    // Wait for the load to land first: it sets the field, and would overwrite an earlier edit.
    await waitFor(() =>
      expect(controlById(container, 'current-news')).toHaveValue('All systems normal.'),
    );
    const news = controlById<HTMLTextAreaElement>(container, 'current-news');
    fireEvent.change(news, { target: { value: 'Planned outage Saturday.' } });

    expect(news).toHaveValue('Planned outage Saturday.');
  });

  it('saves the edited news', async () => {
    const { container } = renderPage();

    await waitFor(() =>
      expect(controlById(container, 'current-news')).toHaveValue('All systems normal.'),
    );
    fireEvent.change(controlById(container, 'current-news'), {
      target: { value: 'Planned outage Saturday.' },
    });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.systemSettings.updateSystemSetting).toHaveBeenCalled());
  });

  it('surfaces a failed save', async () => {
    apiMock.systemSettings.updateSystemSetting.mockRejectedValue(new Error('Save refused.'));
    const { container } = renderPage();

    await waitFor(() =>
      expect(controlById(container, 'current-news')).toHaveValue('All systems normal.'),
    );
    // Save stays disabled until the value actually changes.
    fireEvent.change(controlById(container, 'current-news'), { target: { value: 'Changed' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(await screen.findByText(/Save refused\./i)).toBeInTheDocument();
  });

  it('restores the loaded value on reset', async () => {
    const { container } = renderPage();

    await waitFor(() =>
      expect(controlById(container, 'current-news')).toHaveValue('All systems normal.'),
    );
    fireEvent.change(controlById(container, 'current-news'), { target: { value: 'Changed' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() =>
      expect(controlById(container, 'current-news')).toHaveValue('All systems normal.'),
    );
  });

  it('surfaces a failed load', async () => {
    apiMock.systemSettings.getSystemSetting.mockRejectedValue(new Error('Settings unavailable.'));
    renderPage();

    await waitFor(() => expect(apiMock.systemSettings.getSystemSetting).toHaveBeenCalled());
    expect(screen.getAllByText('Maintain - System').length).toBeGreaterThan(0);
  });
});

/**
 * Regression: the Home screen kept showing the pre-save Current News until a manual browser
 * refresh. Home renders this same WMSG setting through its own ['welcome-summary'] query; saving
 * here has to drop that entry. `removeQueries`, not `invalidateQueries` — the Landing page is
 * unmounted while this screen is up, so its query is inactive, and the app's global
 * `refetchOnMount: false` would still serve an invalidated-but-cached entry on remount.
 */
describe('Maintain — System, Home freshness', () => {
  const seededClient = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
    });
    queryClient.setQueryData(WELCOME_SUMMARY_QUERY_KEY, { currentNews: 'All systems normal.' });
    return queryClient;
  };

  const editAndSave = async (container: HTMLElement) => {
    await waitFor(() =>
      expect(controlById(container, 'current-news')).toHaveValue('All systems normal.'),
    );
    fireEvent.change(controlById(container, 'current-news'), {
      target: { value: 'Planned outage Saturday.' },
    });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
  };

  it('drops the cached welcome summary after a successful save', async () => {
    apiMock.systemSettings.updateSystemSetting.mockResolvedValue({
      systemSettingValue: 'Planned outage Saturday.',
    });
    const queryClient = seededClient();
    const { container } = renderWithProviders(<MaintainSystem />, { queryClient });

    await editAndSave(container);

    await waitFor(() => expect(apiMock.systemSettings.updateSystemSetting).toHaveBeenCalled());
    await waitFor(() =>
      expect(queryClient.getQueryData(WELCOME_SUMMARY_QUERY_KEY)).toBeUndefined(),
    );
    // Nothing left in the cache at all, so a remounting Landing page must fetch.
    expect(
      queryClient.getQueryCache().find({ queryKey: WELCOME_SUMMARY_QUERY_KEY }),
    ).toBeUndefined();
  });

  it('leaves the cached welcome summary alone when the save fails', async () => {
    apiMock.systemSettings.updateSystemSetting.mockRejectedValue(new Error('Save refused.'));
    const queryClient = seededClient();
    const { container } = renderWithProviders(<MaintainSystem />, { queryClient });

    await editAndSave(container);

    await waitFor(() => expect(screen.getByText('Save refused.')).toBeInTheDocument());
    expect(queryClient.getQueryData(WELCOME_SUMMARY_QUERY_KEY)).toEqual({
      currentNews: 'All systems normal.',
    });
  });
});
