// @vitest-environment happy-dom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../config/tests/setup-env';
import { ActiveClientContext } from '@/context/activeClient/ActiveClientContext';
import type { AuthContextType } from '../../../context/auth/AuthContext';
import * as authModule from '../../../context/auth/useAuth';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import { clearAllPersistentState } from '../../../hooks/usePersistentState';
import * as lovOptionsModule from '../../../hooks/useLovOptions';

import ScalersSearchPage from './index';

const mockNavigate = vi.fn();
const mockSearchScalers = vi.fn();

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
    scalers: {
      searchScalers: (...args: unknown[]) => mockSearchScalers(...args),
    },
    lov: {
      getAppointmentTypeLov: vi.fn(),
      getScalerTrainingTypeLov: vi.fn(),
      getStaticLov: vi.fn(),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/DistrictSelect', () => ({
  default: () => <div>District Select</div>,
}));

// Renders the client value it is given so the tests can assert what the page seeded the filter with.
vi.mock('@/components/core/ClientLocSearch', () => ({
  default: ({ client, clientReadOnly }: { client: string; clientReadOnly?: boolean }) => (
    <div data-testid="client-loc-search" data-readonly={String(Boolean(clientReadOnly))}>
      {client}
    </div>
  ),
}));

/**
 * Focused on the permission gating of this page's two entry points, which are separate matrix rows:
 * the parameter search (Queries – Scalers), the Create Scaler button (Scaler – Create), and the
 * "OR enter check scale #" search, which legacy gated on the `checkScaleView` action.
 */
describe('ScalersSearchPage — permission gating', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);
  const mockUseLovOptions = vi.mocked(lovOptionsModule.useLovOptions);

  const createAuthContextValue = (): AuthContextType => ({
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const signInAs = (roles: string[]) =>
    mockUseAuth.mockReturnValue({
      ...createAuthContextValue(),
      user: { roles, privileges: {}, clientNumbers: ['00001074'] },
    });

  beforeEach(() => {
    clearAllPersistentState();
    mockNavigate.mockReset();
    mockSearchScalers.mockReset();
    mockSearchScalers.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(createAuthContextValue());
    mockUseLovOptions.mockReturnValue({
      data: [{ code: 'A', description: 'Acting' }],
      isLoading: false,
      error: null,
    });
  });

  const renderPage = (activeClient?: string, clientNumbers: string[] = []) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <ActiveClientContext.Provider
          value={{
            clientNumbers,
            activeClient,
            setActiveClient: vi.fn(),
            canSwitch: clientNumbers.length > 1,
          }}
        >
          <MemoryRouter>
            <ScalersSearchPage />
          </MemoryRouter>
        </ActiveClientContext.Provider>
      </QueryClientProvider>,
    );
  };

  it('offers an administrator both the parameter search and the check scale # search', () => {
    renderPage();

    expect(screen.getByLabelText('Check Scale #')).toBeInTheDocument();
  });

  /**
   * Legacy parity: `scalerSearch.jsp:85-105` wraps the Check Scale # field in
   * `webade:ifUserCanPerformAction action="checkScaleView"`, and matrix §I is `-` on every Check
   * Scale row for this role. It matters beyond tidiness — the check-scale branch of legacy's search
   * carried no client override, so hiding the field is what kept a client-restricted user from
   * reaching another client's check scale by number.
   */
  it('hides the check scale # search from an Industry Scaler', () => {
    signInAs(['SCS_INDUSTRY_SCALER']);

    renderPage();

    // The parameter search is still there — this role holds SCALER_QUERY.
    expect(screen.getByText('Queries - Scalers')).toBeInTheDocument();
    expect(screen.queryByLabelText('Check Scale #')).not.toBeInTheDocument();
  });

  it('hides the Create Scaler entry point from an Industry Scaler', () => {
    signInAs(['SCS_INDUSTRY_SCALER']);

    renderPage();

    expect(screen.queryByRole('button', { name: /create scaler/i })).not.toBeInTheDocument();
  });

  /**
   * The client filter has to follow the client switcher, not simply the first client the user holds —
   * otherwise a multi-client user's search would be seeded with one client while the API scoped the
   * same request to another, and the results would silently contradict the form.
   */
  describe('client filter follows the active client', () => {
    const restrictedUser = (clientNumbers: string[]) =>
      mockUseAuth.mockReturnValue({
        ...createAuthContextValue(),
        user: {
          roles: ['SCS_INDUSTRY_SCALER'],
          privileges: {},
          clientNumbers,
          isClientRestricted: true,
        },
      });

    it('seeds and locks the filter to the switched-to client, not the first one held', () => {
      restrictedUser(['00001074', '00002000', '00003111']);

      renderPage('00002000', ['00001074', '00002000', '00003111']);

      const clientField = screen.getByTestId('client-loc-search');
      expect(clientField).toHaveTextContent('00002000');
      expect(clientField).toHaveAttribute('data-readonly', 'true');
    });

    it('seeds a single-client user with their only client', () => {
      restrictedUser(['00001074']);

      renderPage('00001074', ['00001074']);

      expect(screen.getByTestId('client-loc-search')).toHaveTextContent('00001074');
    });

    it('leaves the filter free for an internal user', () => {
      renderPage();

      const clientField = screen.getByTestId('client-loc-search');
      expect(clientField).toHaveTextContent('');
      expect(clientField).toHaveAttribute('data-readonly', 'false');
    });

    /**
     * The Scale Site Owner is seeded and locked exactly like the Industry Scaler, matching legacy
     * (`scalerSearch.jsp:37` keyed the field's `readonly` on `isRestrictUserToClient()`, which was
     * `isOwner() || isIndustryScaler()`).
     *
     * <p>The role's scaler *records* are narrower than this list: since 2026-08-20 it opens only scalers
     * authorized at a site its client owns, so some listed rows answer 403. Those dead links are accepted
     * deliberately — the client number is the criterion this field states, and the list is the correct
     * answer to it. Do not unlock the field to "fix" them; that was tried and reverted.
     */
    it('seeds and locks the filter for a Scale Site Owner too', () => {
      mockUseAuth.mockReturnValue({
        ...createAuthContextValue(),
        user: {
          roles: ['SCS_OWNER'],
          privileges: {},
          clientNumbers: ['00001074'],
          isClientRestricted: true,
        },
      });

      renderPage('00001074', ['00001074']);

      const clientField = screen.getByTestId('client-loc-search');
      expect(clientField).toHaveTextContent('00001074');
      expect(clientField).toHaveAttribute('data-readonly', 'true');
    });
  });

  /**
   * `scalarTrainingType` is a SCALER_TRAINING_TYPE LOV code, not a number: legacy `scalerSearch.jsp`
   * renders this field from that LOV, and the package's `p_scalar_training_type` is a VARCHAR2. The
   * page previously hardcoded Exam/Upgrade as "E"/"U" and sent `Number(value)`, so every selection
   * put `NaN` on the wire and the search came back 500.
   */
  describe('Exam / Upgrade filter', () => {
    it('offers the training-type LOV rather than a hardcoded Exam/Upgrade pair', () => {
      renderPage();

      const select = screen.getByLabelText('Exam / Upgrade');
      expect(select).toContainHTML('Acting');
      expect(select).not.toContainHTML('>Upgrade<');
    });

    it('sends the selected training type as a code, not a number', async () => {
      renderPage();

      await userEvent.selectOptions(screen.getByLabelText('Exam / Upgrade'), 'A');
      await userEvent.click(screen.getAllByRole('button', { name: /^search$/i })[0]);

      expect(mockSearchScalers).toHaveBeenCalledWith(
        expect.objectContaining({ scalarTrainingType: 'A' }),
        expect.anything(),
      );
    });
  });

  /**
   * Regression: an invalid search submitted after a valid one used to leave the prior results on
   * screen with no error shown. TableResource only surfaces its error state when it has no content
   * to fall back to, so the previous run's rows kept displaying. The page now derives a `serverError`
   * from the failed mutation and renders an error banner with the backend's description.
   */
  describe('invalid search after a valid one', () => {
    it('replaces stale results with an error banner when the follow-up search fails', async () => {
      mockSearchScalers.mockReset();
      mockSearchScalers.mockResolvedValueOnce([
        { scalerLicenceNo: '12345', clientName: 'Smith', legalFirstName: 'John' },
      ]);

      renderPage();

      await userEvent.click(screen.getAllByRole('button', { name: /^search$/i })[0]);

      // Valid search: rows show, no error banner.
      await waitFor(() => expect(screen.getByText('12345')).toBeInTheDocument());
      expect(screen.queryByText('Search failed')).not.toBeInTheDocument();

      // Follow-up search rejects with the backend's { message } error shape.
      mockSearchScalers.mockRejectedValueOnce({
        response: { data: { message: 'Licence number must be numeric.' } },
      });

      await userEvent.click(screen.getAllByRole('button', { name: /^search$/i })[0]);

      // The error banner appears with the backend description — the stale-results-instead-of-error fix.
      await waitFor(() => expect(screen.getByText('Search failed')).toBeInTheDocument());
      expect(screen.getByText('Licence number must be numeric.')).toBeInTheDocument();

      // The prior run's rows are cleared so they can't be read as the failed query's results.
      expect(screen.queryByText('12345')).not.toBeInTheDocument();
    });
  });
});
