// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import ScaleSiteViewPage from './index';

const mockNavigate = vi.fn();
const mockGetScaleSiteSummary = vi.fn();
const mockGetScaleSiteTombstone = vi.fn();
const mockGetScaleSiteInspectionSummaries = vi.fn();
const mockGetStaticLov = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return Object.assign({}, actual, {
    useNavigate: () => mockNavigate,
  });
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scaleSites: {
      getScaleSiteSummary: (...args: unknown[]) => mockGetScaleSiteSummary(...args),
      getScaleSiteTombstone: (...args: unknown[]) => mockGetScaleSiteTombstone(...args),
    },
    scaleSiteInspections: {
      getScaleSiteInspectionSummaries: (...args: unknown[]) => mockGetScaleSiteInspectionSummaries(...args),
    },
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
  },
  BackendApiConfig: { BASE: '/api', TOKEN: async () => null },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe('ScaleSiteViewPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createDeferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };

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

  const renderPage = (initialEntry = '/scale-sites/view/SITE001') => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/scale-sites/view/:scaleSiteIdNmbr" element={<ScaleSiteViewPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetScaleSiteSummary.mockReset();
    mockGetScaleSiteTombstone.mockReset();
    mockGetScaleSiteInspectionSummaries.mockReset();
    mockGetStaticLov.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());

    mockGetStaticLov.mockImplementation(({ tableKey }: { tableKey?: string }) => {
      if (tableKey === 'SCALE_SITE_PRIORITY_CODE') {
        return Promise.resolve([
          { code: 'P', description: 'Primary' },
          { code: 'S', description: 'Secondary' },
          { code: 'T', description: 'Tertiary' },
        ]);
      }

      if (tableKey === 'SCALE_METHOD_TYPE_CODE') {
        return Promise.resolve([
          { code: 'P', description: 'Piece Scale' },
          { code: 'W', description: 'Weight Scale' },
        ]);
      }

      return Promise.resolve([]);
    });

    mockGetScaleSiteSummary.mockResolvedValue({
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      ownerClientNumber: '12345678',
      ownerClientLocnCode: '00',
      orgUnitNo: 100,
      regDistDisplay: 'RKB - Selkirk Natural Resource District',
      timberBrand: 'TB-123',
      siteLocation: 'Nanaimo',
      latitudeDegrees: 49,
      latitudeMinutes: 10,
      latitudeSeconds: 22,
      longitudeDegrees: 123,
      longitudeMinutes: 56,
      longitudeSeconds: 31,
      siteTypes: [{ priorityCode: 'P', scaleMethodTypeCode: 'P' }],
    });

    mockGetScaleSiteTombstone.mockResolvedValue({
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      regionName: 'South Coast Natural Resource Region',
      districtName: 'South Island District',
    });

    mockGetScaleSiteInspectionSummaries.mockResolvedValue([
      {
        inspectionId: 12345,
        inspectionTypeDescription: 'Compliance',
        siteTypeDisplay: 'Weight Scale',
        inspectionDate: '2026-03-10',
        inspector: 'Jordan Smith',
        followUpInspectionIndicator: 'Y',
      },
    ]);
  });

  it('loads and renders the scale site header, summary tab, and placeholder tabs', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockGetScaleSiteSummary).toHaveBeenCalledWith('SITE001', 'token');
      expect(mockGetScaleSiteTombstone).toHaveBeenCalledWith('SITE001', 'token');
      expect(mockGetStaticLov).toHaveBeenCalledWith({ tableKey: 'SCALE_SITE_PRIORITY_CODE' }, 'token');
      expect(mockGetStaticLov).toHaveBeenCalledWith({ tableKey: 'SCALE_METHOD_TYPE_CODE' }, 'token');
    });

    expect(await screen.findByText('South Coast Natural Resource Region')).toBeTruthy();
    expect(screen.getAllByText('MAIN YARD').length).toBeGreaterThan(0);
    expect(screen.getByText('12345678 / 00')).toBeTruthy();
    expect(screen.getByText('RKB - Selkirk Natural Resource District')).toBeTruthy();
    expect(screen.getByText('49° 10′ 22″')).toBeTruthy();
    expect(screen.getByText('123° 56′ 31″')).toBeTruthy();
    expect(screen.getByText('TB-123')).toBeTruthy();
    const siteLocationField = screen.getByRole('textbox', { name: 'Description of Site Location' }) as HTMLTextAreaElement;
    expect(siteLocationField.value).toBe('Nanaimo');
    expect(siteLocationField.readOnly).toBe(true);
    expect(screen.getByText('Contacts')).toBeTruthy();
    expect(screen.getByText('Risk Rating')).toBeTruthy();

    const siteTypesTable = screen.getByRole('table', { name: 'Scale site types' });
    expect(within(siteTypesTable).getAllByRole('row')).toHaveLength(4);
    expect(within(siteTypesTable).getByText('Primary')).toBeTruthy();
    expect(within(siteTypesTable).getByText('Secondary')).toBeTruthy();
    expect(within(siteTypesTable).getByText('Tertiary')).toBeTruthy();
    expect(within(siteTypesTable).getByText('Piece Scale')).toBeTruthy();
    expect(within(siteTypesTable).queryByText('No site types')).toBeNull();
    expect(mockGetScaleSiteInspectionSummaries).not.toHaveBeenCalled();
  });

  it('loads and renders inspections when the Inspections tab is selected', async () => {
    renderPage();

    const inspectionsTab = await screen.findByRole('tab', { name: 'Inspections' });
    fireEvent.click(inspectionsTab);

    await waitFor(() => {
      expect(mockGetScaleSiteInspectionSummaries).toHaveBeenCalledWith('SITE001', 'token');
    });

    const inspectionsTable = await screen.findByRole('table', { name: 'Scale site inspections' });
    const addInspectionButton = screen.getByRole('button', { name: 'Add Inspection' });

    expect(inspectionsTable).toBeTruthy();
    expect(screen.getByRole('link', { name: '12345' }).getAttribute('href')).toBe('/scale-sites/SITE001/inspections/view/12345');
    expect(screen.getByText('Compliance')).toBeTruthy();
    expect(screen.getByText('Weight Scale')).toBeTruthy();
    expect(screen.getByText('Jordan Smith')).toBeTruthy();
    expect(addInspectionButton.closest('.scs__view-tab-actions--top')).toBeTruthy();
    // Add action sits above the table (top-right), matching the other view tabs.
    expect(
      (inspectionsTable.compareDocumentPosition(addInspectionButton) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
    ).toBe(true);
  });

  it('navigates to the scale site inspection create route from the inspections tab', async () => {
    renderPage();

    const inspectionsTab = await screen.findByRole('tab', { name: 'Inspections' });
    fireEvent.click(inspectionsTab);

    const addInspectionButton = await screen.findByRole('button', { name: 'Add Inspection' });
    fireEvent.click(addInspectionButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/SITE001/inspections/create');
  });

  it('restores the inspections tab from the query string', async () => {
    renderPage('/scale-sites/view/SITE001?tab=inspections');

    await waitFor(() => {
      expect(mockGetScaleSiteInspectionSummaries).toHaveBeenCalledWith('SITE001', 'token');
    });

    expect(await screen.findByRole('table', { name: 'Scale site inspections' })).toBeTruthy();
  });

  it('shows an empty state when the inspections tab returns no rows', async () => {
    mockGetScaleSiteInspectionSummaries.mockResolvedValueOnce([]);

    renderPage();

    const inspectionsTab = await screen.findByRole('tab', { name: 'Inspections' });
    fireEvent.click(inspectionsTab);

    expect(await screen.findByText('No inspections found')).toBeTruthy();
    expect(screen.getByText('This scale site does not have any recorded inspections.')).toBeTruthy();
  });

  it('shows an error state when the inspections tab request fails', async () => {
    mockGetScaleSiteInspectionSummaries.mockRejectedValueOnce(new Error('Inspection backend unavailable'));

    renderPage();

    const inspectionsTab = await screen.findByRole('tab', { name: 'Inspections' });
    fireEvent.click(inspectionsTab);

    expect(await screen.findByText('Could not load inspections')).toBeTruthy();
    expect(screen.getByText('Inspection backend unavailable')).toBeTruthy();
  });

  it('keeps the page in a loading state while the summary and tombstone requests are pending', async () => {
    const deferredSummary = createDeferred<{
      scaleSiteIdNmbr: string;
      siteName: string;
      ownerClientNumber: string;
      ownerClientLocnCode: string;
      orgUnitNo: number;
      timberBrand: string;
      siteLocation: string;
      latitudeDegrees: number;
      latitudeMinutes: number;
      latitudeSeconds: number;
      longitudeDegrees: number;
      longitudeMinutes: number;
      longitudeSeconds: number;
      siteTypes: Array<{ priorityCode: string; scaleMethodTypeCode: string }>;
    }>();
    const deferredTombstone = createDeferred<{
      scaleSiteIdNmbr: string;
      siteName: string;
      regionName: string;
      districtName: string;
    }>();

    mockGetScaleSiteSummary.mockImplementationOnce(() => deferredSummary.promise);
    mockGetScaleSiteTombstone.mockImplementationOnce(() => deferredTombstone.promise);

    renderPage();

    await waitFor(() => {
      expect(mockGetScaleSiteSummary).toHaveBeenCalledWith('SITE001', 'token');
      expect(mockGetScaleSiteTombstone).toHaveBeenCalledWith('SITE001', 'token');
    });

    expect(screen.queryByText('Could not load scale site')).toBeNull();
    expect(screen.queryByText('South Coast Natural Resource Region')).toBeNull();

    deferredSummary.resolve({
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      ownerClientNumber: '12345678',
      ownerClientLocnCode: '00',
      orgUnitNo: 100,
      regDistDisplay: 'RKB - Selkirk Natural Resource District',
      timberBrand: 'TB-123',
      siteLocation: 'Nanaimo',
      latitudeDegrees: 49,
      latitudeMinutes: 10,
      latitudeSeconds: 22,
      longitudeDegrees: 123,
      longitudeMinutes: 56,
      longitudeSeconds: 31,
      siteTypes: [{ priorityCode: 'P', scaleMethodTypeCode: 'P' }],
    });
    deferredTombstone.resolve({
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      regionName: 'South Coast Natural Resource Region',
      districtName: 'South Island District',
    });

    expect(await screen.findByText('South Coast Natural Resource Region')).toBeTruthy();
  });

  it('shows an empty-state message when the scale site route param is blank after trimming', async () => {
    renderPage('/scale-sites/view/%20%20');

    expect(await screen.findByText('Scale site not available')).toBeTruthy();
    expect(screen.getByText('A valid scale site number was not provided in the route.')).toBeTruthy();
    expect(mockGetScaleSiteSummary).not.toHaveBeenCalled();
    expect(mockGetScaleSiteTombstone).not.toHaveBeenCalled();
  });

  it('shows an error empty state when the summary request fails', async () => {
    mockGetScaleSiteSummary.mockRejectedValueOnce(new Error('Backend unavailable'));

    renderPage();

    expect(await screen.findByText('Could not load scale site')).toBeTruthy();
    expect(screen.getByText('Backend unavailable')).toBeTruthy();
  });

  it('navigates back to the scale sites query page from the Search button', async () => {
    renderPage();

    const searchButton = await screen.findByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scale-sites');
  });

  describe('permission-filtered tabs', () => {
    const asIndustryScaler = () =>
      mockUseAuth.mockReturnValue({
        ...createAuthContextValue(),
        user: { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00001074'] },
      });

    /**
     * Matrix row "Scale Site Record – Summary" is `-` for this role, so the record opens on the first
     * tab they can see. The landing tab is not hardcoded: it falls out of feeding the filtered slugs
     * to useTabRouting, so it stays correct as other roles are enabled.
     */
    it('opens an Industry Scaler on Check Scales, with only their three tabs', async () => {
      asIndustryScaler();

      renderPage();

      expect(await screen.findByRole('tab', { name: 'Check Scales' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Check Scales',
        'Software',
      ]);
    });

    /**
     * The tab is hidden *and* the payload is never requested: `SCALE_SITE_SUMMARY_READ` gates the
     * summary endpoint too, so the fields the matrix denies do not reach the client at all. The record
     * still opens, because its header comes from the tombstone.
     */
    it('never requests the summary payload for a role denied the section', async () => {
      asIndustryScaler();

      renderPage();

      expect(await screen.findByRole('tab', { name: 'Check Scales' })).toBeTruthy();
      expect(screen.getByText('South Coast Natural Resource Region')).toBeTruthy();
      expect(mockGetScaleSiteTombstone).toHaveBeenCalledWith('SITE001', 'token');
      expect(mockGetScaleSiteSummary).not.toHaveBeenCalled();
      // The Summary tab's own code lists go with it. Other tabs still load theirs.
      const requestedLovKeys = mockGetStaticLov.mock.calls.map(([params]) => params?.tableKey);
      expect(requestedLovKeys).not.toContain('SCALE_SITE_PRIORITY_CODE');
      expect(requestedLovKeys).not.toContain('SCALE_METHOD_TYPE_CODE');
    });

    it('opens the record on the tombstone alone when the summary is denied', async () => {
      asIndustryScaler();
      mockGetScaleSiteSummary.mockRejectedValue(new Error('should not be called'));

      renderPage();

      expect(await screen.findByRole('tab', { name: 'Check Scales' })).toBeTruthy();
      expect(screen.queryByText('Could not load scale site')).toBeNull();
    });

    it('resolves a deep link to a denied tab onto the first visible one', async () => {
      asIndustryScaler();

      renderPage('/scale-sites/view/SITE001?tab=summary');

      expect(await screen.findByRole('tab', { name: 'Check Scales' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('still opens an administrator on Summary, with every tab', async () => {
      renderPage();

      expect(await screen.findByRole('tab', { name: 'Summary' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getAllByRole('tab').length).toBe(10);
    });
  });
});


