// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../config/tests/setup-env';
import type { AuthContextType } from '../../../context/auth/AuthContext';
import * as authModule from '../../../context/auth/useAuth';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import { clearAllPersistentState } from '../../../hooks/usePersistentState';
import * as lovOptionsModule from '../../../hooks/useLovOptions';

import ScaleSitesSearchPage from './index';

const mockNavigate = vi.fn();
const mockSearchScaleSites = vi.fn();
const mockSearchScaleSiteInspection = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return Object.assign({}, actual, {
    useNavigate: () => mockNavigate,
  });
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useLovOptions', () => ({
  useLovOptions: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scaleSites: {
      searchScaleSites: (...args: unknown[]) => mockSearchScaleSites(...args),
    },
    scaleSiteInspections: {
      searchScaleSiteInspection: (...args: unknown[]) => mockSearchScaleSiteInspection(...args),
    },
    lov: {
      getScaleMethodTypeLov: vi.fn(),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/pages/Queries/Client', () => ({
  default: () => <div>Client Search</div>,
}));

describe('ScaleSitesSearchPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);
  const mockUseLovOptions = vi.mocked(lovOptionsModule.useLovOptions);

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
    // The persistent-state store is module-level and survives between tests; clear it so each
    // test starts with no prior search (as a fresh SPA session / post-logout would).
    clearAllPersistentState();
    mockNavigate.mockReset();
    mockSearchScaleSites.mockReset();
    mockSearchScaleSiteInspection.mockReset();
    mockSearchScaleSites.mockResolvedValue([
      {
        scaleSiteIdNmbr: 'SITE001',
        siteName: 'MAIN YARD',
        region: 'South Coast Natural Resource Region',
        district: 'South Island District',
        methodTypeCodeName: 'Weight Scale',
        ownerClientNumber: '00123456',
        ownerClientLocnCode: '00',
      },
    ]);
    mockSearchScaleSiteInspection.mockResolvedValue({
      inspectionId: 12345,
      scaleSiteIdNmbr: 'SITE001',
    });

    mockUseAuth.mockReturnValue(createAuthContextValue());
    mockUseLovOptions.mockReturnValue({
      data: [
        { code: 'W', description: 'Weight Scale' },
        { code: 'S', description: 'Special Forest Product' },
      ],
      isLoading: false,
      error: null,
    });
  });

  const renderPage = (modalMode = false) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ScaleSitesSearchPage modalMode={modalMode} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  const getMainSearchButton = (): HTMLButtonElement => {
    const buttons = screen.getAllByRole('button', { name: 'Search' });
    return buttons[buttons.length - 1] as HTMLButtonElement;
  };

  it('submits the main scale-site search and renders results', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Scale Site #'), {
      target: { value: 'SITE001' },
    });
    fireEvent.change(screen.getByLabelText('Scale Site Name'), {
      target: { value: '%MAIN%' },
    });
    fireEvent.change(document.getElementById('ownerClientNumber') as HTMLInputElement, {
      target: { value: '123456' },
    });
    fireEvent.change(document.getElementById('ownerClientLocnCode') as HTMLInputElement, {
      target: { value: '00' },
    });
    fireEvent.click(getMainSearchButton());

    await waitFor(() => {
      expect(mockSearchScaleSites).toHaveBeenCalledWith(
        {
          scaleSiteIdNmbr: 'SITE001',
          siteName: '%MAIN%',
          ownerClientNumber: '123456',
          ownerClientLocnCode: '00',
          primarySort: 1,
          secondarySort: 0,
        },
        'token',
      );
    });

    await waitFor(() => {
      expect(screen.getByText('MAIN YARD')).toBeTruthy();
    });
    const scaleSiteLink = screen.getByRole('link', { name: 'SITE001' });
    expect(scaleSiteLink).toBeTruthy();
    expect(scaleSiteLink.getAttribute('href')).toBe('/scale-sites/view/SITE001');
    expect(screen.getByText('00123456/00')).toBeTruthy();
  });

  it('caps the search inputs at the legacy lengths', () => {
    renderPage();

    expect(screen.getByLabelText('Scale Site #')).toHaveAttribute('maxlength', '8');
    expect(screen.getByPlaceholderText('Client')).toHaveAttribute('maxlength', '8');
    expect(screen.getByPlaceholderText('Loc')).toHaveAttribute('maxlength', '2');
    expect(screen.getByLabelText('Scale Site Name')).toHaveAttribute('maxlength', '40');

    fireEvent.click(screen.getByText('OR enter inspection #'));
    expect(screen.getByLabelText('Inspection #')).toHaveAttribute('maxlength', '10');
  });

  it('caps the modal lookup inputs at the same legacy lengths', () => {
    renderPage(true);

    expect(screen.getByLabelText('Scale Site #')).toHaveAttribute('maxlength', '8');
    expect(screen.getByLabelText('Scale Site Name')).toHaveAttribute('maxlength', '40');
  });

  it('submits inspection search as a separate mode and navigates to the inspection view route', async () => {
    renderPage();

    fireEvent.click(screen.getByText('OR enter inspection #'));
    fireEvent.change(screen.getByLabelText('Inspection #'), {
      target: { value: '12345' },
    });

    fireEvent.click(getMainSearchButton());

    await waitFor(() => {
      expect(mockSearchScaleSiteInspection).toHaveBeenCalledWith(12345, 'token');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/SITE001/inspections/view/12345');
    });
    expect(mockSearchScaleSites).not.toHaveBeenCalled();
  });

  it('validates inspection id before calling the lookup endpoint', async () => {
    renderPage();

    fireEvent.click(screen.getByText('OR enter inspection #'));
    fireEvent.change(screen.getByLabelText('Inspection #'), {
      target: { value: 'abc' },
    });

    fireEvent.click(getMainSearchButton());

    await waitFor(() => {
      expect(screen.getByText('Inspection id must be a positive whole number.')).toBeTruthy();
    });
    expect(mockSearchScaleSiteInspection).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

