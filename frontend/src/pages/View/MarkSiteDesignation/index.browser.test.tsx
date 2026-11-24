// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../config/tests/setup-env';
import type { AuthContextType } from '../../../context/auth/AuthContext';
import * as authModule from '../../../context/auth/useAuth';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';

import MarkSiteDesignationViewPage from './index';

const mockGetMarkSiteDesignation = vi.fn();
const mockRemoveMarkSiteDesignationFromWorkbench = vi.fn();
const mockGetStaticLov = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('virtual:pwa-register', () => ({
  registerSW: () => vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    markSiteDesignation: {
      getMarkSiteDesignation: (...args: unknown[]) => mockGetMarkSiteDesignation(...args),
      removeMarkSiteDesignationFromWorkbench: (...args: unknown[]) => mockRemoveMarkSiteDesignationFromWorkbench(...args),
    },
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
  },
}));

describe('MarkSiteDesignationViewPage', () => {
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

  beforeEach(() => {
    mockUseAuth.mockReturnValue(createAuthContextValue());
    mockGetMarkSiteDesignation.mockReset();
    mockRemoveMarkSiteDesignationFromWorkbench.mockReset();
    mockGetStaticLov.mockReset();
    mockGetStaticLov.mockResolvedValue([]);
    mockNavigate.mockReset();
    mockGetMarkSiteDesignation.mockResolvedValue({
      haulingMarkAuthorizationId: 12345,
      timberMark: 'TM123',
      markHolderClient: '00012345',
      markHolderLoc: '00',
      markHolderName: 'ACME FOREST PRODUCTS LTD',
      markStatus: 'A',
      geographicLocation: 'CENTRAL INTERIOR',
      population: 1200,
      effectiveDate: '2025-01-01',
      expiryDate: '2025-12-31',
      estimatedVolume: 42,
      estimatedTruckLoads: 8,
      timberDescription: 'PINE AND SPRUCE',
      transportationDateDesc: 'AS NEEDED',
      otherRequirements: 'CONTACT OFFICE',
      scaleSites: [{ scaleSiteIdNmbr: 'A12345', siteName: 'MAIN YARD' }],
      speciesContent: [{ scaleSpeciesCode: 'HEM', contentPercent: 65 }],
      conditions: [
        {
          scaleAuthConditionId: 789,
          scaleAuthConditionTitle: 'CONDITION TITLE',
          scaleAuthConditionDesc: 'CONDITION DESC',
          ministryStandardInd: 'Y',
        },
      ],
    });
  });

  it('loads the detail payload and renders key fields and tables', async () => {
    render(
      <MemoryRouter initialEntries={['/mark-site-designations/view?haulingMarkAuthorizationId=12345']}>
        <Routes>
          <Route path="/mark-site-designations/view" element={<MarkSiteDesignationViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockGetMarkSiteDesignation).toHaveBeenCalledWith(12345, 'token');
    });

    expect(await screen.findByDisplayValue('TM123')).toBeTruthy();
    expect(screen.getByDisplayValue('00012345/00')).toBeTruthy();
    expect(screen.getByText('MAIN YARD')).toBeTruthy();
    expect(screen.getByText('HEM')).toBeTruthy();
    expect(screen.getByText('65%')).toBeTruthy();
    expect(screen.getByText('CONDITION TITLE')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
  });

  it('renders the Exceptions section with the saved exempt-mark-method selections', async () => {
    mockGetStaticLov.mockImplementation((params: { tableKey?: string }) =>
      Promise.resolve(
        params?.tableKey === 'EXEMPT_MARK_METHOD_CODE'
          ? [{ code: '21', description: 'HARVEST FROM CROWN LAND' }]
          : [],
      ));
    mockGetMarkSiteDesignation.mockResolvedValue({
      haulingMarkAuthorizationId: 12345,
      timberMark: 'TM123',
      scaleSites: [],
      speciesContent: [],
      conditions: [],
      exceptions: ['21'],
    });

    render(
      <MemoryRouter initialEntries={['/mark-site-designations/view?haulingMarkAuthorizationId=12345']}>
        <Routes>
          <Route path="/mark-site-designations/view" element={<MarkSiteDesignationViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // The section header is present (it was previously skipped entirely)...
    expect(await screen.findByText('Exemptions')).toBeTruthy();
    // ...and the saved code renders resolved to its LOV description.
    expect(await screen.findByText('HARVEST FROM CROWN LAND')).toBeTruthy();
  });

  it('shows the legacy action row and deletes from workbench when confirmed', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/mark-site-designations/view?haulingMarkAuthorizationId=12345']}>
        <Routes>
          <Route path="/mark-site-designations/view" element={<MarkSiteDesignationViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit Record' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Create Letter' })).toBeTruthy();
    });

    // Carbon's danger button prepends a visually-hidden "danger" label for
    // screen readers, so the accessible name is "danger Delete" — match loosely.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete/ })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockRemoveMarkSiteDesignationFromWorkbench).toHaveBeenCalledWith(12345, 'token');
      expect(mockNavigate).toHaveBeenCalledWith('/welcome');
    });

    confirmSpy.mockRestore();
  });

  it('does not remove from workbench when the delete confirm is cancelled', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/mark-site-designations/view?haulingMarkAuthorizationId=12345']}>
        <Routes>
          <Route path="/mark-site-designations/view" element={<MarkSiteDesignationViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete/ })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(mockRemoveMarkSiteDesignationFromWorkbench).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/welcome');

    confirmSpy.mockRestore();
  });

  it('navigates to the letter route when Create Letter is clicked (letterless record)', async () => {
    render(
      <MemoryRouter initialEntries={['/mark-site-designations/view?haulingMarkAuthorizationId=12345']}>
        <Routes>
          <Route path="/mark-site-designations/view" element={<MarkSiteDesignationViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const createLetter = await screen.findByRole('button', { name: 'Create Letter' });
    fireEvent.click(createLetter);

    expect(mockNavigate).toHaveBeenCalledWith('/mark-site-designations/12345/letter');
  });

  /**
   * An Industry Scaler holds MSD_READ (matrix row "Mark Site Designation" = R), so this page is
   * legitimately reachable by a role that can change nothing — the whole action row must be absent.
   */
  it('hides the whole action row from a read-only role', async () => {
    mockUseAuth.mockReturnValue({
      ...createAuthContextValue(),
      user: { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00001074'] },
    });

    render(
      <MemoryRouter initialEntries={['/mark-site-designations/view?haulingMarkAuthorizationId=12345']}>
        <Routes>
          <Route path="/mark-site-designations/view" element={<MarkSiteDesignationViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Wait for the record to render before asserting absence, so this cannot pass vacuously.
    await waitFor(() => expect(screen.getByText('Yes')).toBeTruthy());

    expect(screen.queryByRole('button', { name: 'Edit Record' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create Letter' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'View Letter' })).toBeNull();
  });
});
