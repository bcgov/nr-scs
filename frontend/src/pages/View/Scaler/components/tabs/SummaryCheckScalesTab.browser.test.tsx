// @vitest-environment happy-dom

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import SummaryCheckScalesTab from './SummaryCheckScalesTab';

const mockGetScalerSummaryCheckScales = vi.fn();
const mockGetStaticLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    summaryCheckScale: {
      getScalerSummaryCheckScales: (...args: unknown[]) => mockGetScalerSummaryCheckScales(...args),
    },
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
  },
  BackendApiConfig: { BASE: '/api', TOKEN: async () => null },
}));

/** Surfaces the router location so navigation (path + state) can be asserted after a click. */
const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="loc">{`${loc.pathname}::${JSON.stringify(loc.state)}`}</div>;
};

const TAB_URL = '/scalers/view/1234?tab=summary-check-scales';

const sampleRow = {
  checkScaleId: 146943,
  ckscType: 'SFPSCS',
  primCheckLicenceNo: '1234',
  primOrigLicenceNo: '5678',
  origScaleDate: '2026-05-01',
  checkScaleDate: '2026-05-03',
  pieceDiff: 2,
  volumeVariance: 1.5,
  valueVariance: 0.8,
  replacedInd: 'N',
  checkScaleTypeCode: 'FRST',
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'Y',
};

describe('SummaryCheckScalesTab', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createAuthContextValue = (): AuthContextType => ({
    // An administrator, so permission-gated controls render: these tests are about the
    // component behaviour, not authorization (see permissions.unit.test.ts for that).
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const renderTab = (isActive = true, scalerLicenceNo = '1234') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[TAB_URL]}>
          <SummaryCheckScalesTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockGetScalerSummaryCheckScales.mockReset();
    mockGetStaticLov.mockReset();
    mockGetStaticLov.mockResolvedValue([{ code: 'FRST', description: 'First' }]);
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders the legacy columns and links — but no statistics table and no filter', async () => {
    mockGetScalerSummaryCheckScales.mockResolvedValue({ summaryCheckScales: [sampleRow] });

    renderTab();

    const table = within(await screen.findByRole('table'));
    // Check Scale # drills down to the summary update page.
    expect(table.getByRole('link', { name: '146943' })).toHaveAttribute(
      'href',
      '/summary-check-scales/146943/edit',
    );
    // Summary Type is the column unique to the summary list.
    expect(table.getByText('SFPSCS')).toBeInTheDocument();
    // Check Scale Type renders via the LOV description.
    expect(table.getByText('First')).toBeInTheDocument();
    // Licence columns link to the scaler view.
    expect(table.getByRole('link', { name: '5678' })).toHaveAttribute('href', '/scalers/view/5678');

    // AC #5: no statistics table (only the list table) and no filter dropdown.
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.queryByLabelText('Filter')).not.toBeInTheDocument();
  });

  it('shows a loading skeleton with the Add action while the request is pending', () => {
    mockGetScalerSummaryCheckScales.mockReturnValue(new Promise(() => {}));

    renderTab();

    expect(screen.getByRole('button', { name: 'Add Summary Check Scale' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the empty state when the scaler has no summary check scales', async () => {
    mockGetScalerSummaryCheckScales.mockResolvedValue({ summaryCheckScales: [] });

    renderTab();

    expect(
      await screen.findByText('This scaler does not have any summary check scales.'),
    ).toBeInTheDocument();
  });

  it('shows an error empty state when the request fails', async () => {
    mockGetScalerSummaryCheckScales.mockRejectedValue(new Error('Boom'));

    renderTab();

    expect(await screen.findByText('Could not load summary check scales')).toBeInTheDocument();
  });

  it('shows a no-licence empty state and does not call the API when no licence is in context', () => {
    renderTab(true, '   ');

    expect(
      screen.getByText('No scaler licence number is available for this record.'),
    ).toBeInTheDocument();
    expect(mockGetScalerSummaryCheckScales).not.toHaveBeenCalled();
  });

  it('does not call the API when the tab is inactive', () => {
    renderTab(false);

    expect(mockGetScalerSummaryCheckScales).not.toHaveBeenCalled();
  });

  it('navigates to the create page with backTo + scalerName state when Add is clicked', async () => {
    mockGetScalerSummaryCheckScales.mockResolvedValue({ summaryCheckScales: [] });

    renderTab();

    await userEvent.click(await screen.findByRole('button', { name: 'Add Summary Check Scale' }));

    await waitFor(() => {
      const loc = screen.getByTestId('loc').textContent ?? '';
      expect(loc).toContain('/summary-check-scales/create');
      expect(loc).toContain(`"backTo":"${TAB_URL}"`);
      expect(loc).toContain('"scalerName":"1234"');
      // Pre-fills the create form's Original Scaler Licence # (legacy tombstone seed).
      expect(loc).toContain('"originalScalerLicenceNo":"1234"');
    });
  });
});
