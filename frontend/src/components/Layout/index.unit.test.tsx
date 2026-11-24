import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { ThemeProvider } from '@/context/theme/ThemeProvider';

import Layout from './index';

beforeEach(() => resetApiMock());

const renderLayout = (roles?: string[]) =>
  renderWithProviders(
    <PreferenceProvider>
    <ThemeProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>routed page</div>} />
        </Route>
      </Routes>
    </ThemeProvider>
    </PreferenceProvider>,
    roles ? { roles } : {},
  );

describe('Layout', () => {
  it('lets an administrator straight through without probing the system status', async () => {
    renderLayout();

    expect(await screen.findByText('routed page')).toBeInTheDocument();
    expect(apiMock.systemStatus.getSystemStatus).not.toHaveBeenCalled();
  });

  it('shows the disabled interstitial to a non-administrator when the system is off', async () => {
    apiMock.systemStatus.getSystemStatus.mockResolvedValue({ enabled: false } as never);
    renderLayout(['SCS_INDUSTRY_SCALER']);

    await waitFor(() => expect(apiMock.systemStatus.getSystemStatus).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('routed page')).not.toBeInTheDocument());
    expect(document.body.textContent?.toLowerCase()).toMatch(/disabled|unavailable|not available/);
  });

  it('routes a non-administrator normally when the system is on', async () => {
    apiMock.systemStatus.getSystemStatus.mockResolvedValue({ enabled: true } as never);
    renderLayout(['SCS_INDUSTRY_SCALER']);

    expect(await screen.findByText('routed page')).toBeInTheDocument();
  });
});
