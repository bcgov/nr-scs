import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';

import SummaryCheckScaleCreatePage from './index';

const mockNavigate = vi.fn();
const mockGetStaticLov = vi.fn();
const mockGetXref = vi.fn();
const mockCreate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return Object.assign({}, actual, { useNavigate: () => mockNavigate });
});

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
      getSpeciesProductGradeXref: (...args: unknown[]) => mockGetXref(...args),
    },
    summaryCheckScale: {
      createSummaryCheckScale: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

// Carbon's DatePicker doesn't emit onChange from a raw input change; mock it to a plain input so the
// test can set the ISO date value directly. The page only needs a non-empty date string to validate.
vi.mock('@/components/core/DateInput', () => ({
  default: ({ id, value = '', onChange }: { id: string; value?: string; onChange?: (v: string) => void }) => (
    <input id={id} value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

const lovFor = (tableKey: string) => {
  switch (tableKey) {
    case 'CHECK_SCALE_TYPE_CODE':
      return [{ tableKey, code: 'FCS', description: 'First Check Scale' }];
    case 'SCALE_SPECIES_CODE':
      return [{ tableKey, code: 'CE', description: 'Cedar' }];
    case 'SCALE_PRODUCT_CODE':
      return [{ tableKey, code: 'L', description: 'Logs' }];
    case 'SCALE_GRADE_CODE':
      return [{ tableKey, code: 'J', description: 'Sawlog' }];
    default:
      return [];
  }
};

const XREF = [{ scaleSpeciesCode: 'CE', scaleProductCode: 'L', scaleGradeCode: 'J' }];

const setValue = (id: string, value: string) => {
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } });
};

describe('SummaryCheckScaleCreatePage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const authContextValue = (): AuthContextType => ({
    user: undefined,
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const renderPage = (queryClient = new QueryClient()) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SummaryCheckScaleCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  beforeEach(() => {
    [mockNavigate, mockGetStaticLov, mockGetXref, mockCreate].forEach((m) => m.mockReset());
    mockGetStaticLov.mockImplementation((params: { tableKey: string }) => Promise.resolve(lovFor(params.tableKey)));
    mockGetXref.mockResolvedValue(XREF);
    mockUseAuth.mockReturnValue(authContextValue());
  });

  // Fills a valid Log Tally record (no partial-load; product blanked, grade required).
  const fillValidLogTally = () => {
    fireEvent.click(document.getElementById('return-type-log-tally') as HTMLElement);

    setValue('check-scale-type', 'FCS');
    setValue('check-scaler-licence', 'L100');
    setValue('original-scaler-licence', 'L200');
    setValue('timber-mark', 'TM1');
    setValue('scale-site-number', 'SS1');
    setValue('load-arrival-number', 'LA1');
    setValue('followed-good-practices', 'Yes');
    setValue('original-within-standard', 'No');
    setValue('check-replaces-original', 'No');
    setValue('original-date-of-scale', '2024-01-01');
    setValue('check-date-of-scale', '2024-01-02');
    setValue('original-scale-return', '100');
    setValue('check-scale-return', '101');

    setValue('species', 'CE');
    setValue('grade', 'J');
    setValue('original-pieces', '10');
    setValue('check-pieces', '9');
    setValue('original-net-volume', '12.5');
    setValue('check-net-volume', '11.5');
    setValue('original-net-value', '100.50');
    setValue('check-net-value', '95.00');
  };

  it('creates the record and navigates to its edit page on success', async () => {
    mockCreate.mockResolvedValue({ checkScaleId: 42 });

    renderPage();
    await waitFor(() => expect(document.getElementById('check-scale-type')).toBeTruthy());

    fillValidLogTally();
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/summary-check-scales/42/edit'));
  });

  it('clears the scaler Summary Check Scales tab cache on successful create', async () => {
    mockCreate.mockResolvedValue({ checkScaleId: 42 });
    const queryClient = new QueryClient();
    const removeSpy = vi.spyOn(queryClient, 'removeQueries');

    renderPage(queryClient);
    await waitFor(() => expect(document.getElementById('check-scale-type')).toBeTruthy());

    fillValidLogTally();
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['scaler-summary-check-scales'] });
  });

  it('pre-fills Original Scaler Licence # from the scaler tombstone route state', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/summary-check-scales/create',
              state: { scalerName: 'L300', originalScalerLicenceNo: 'L300' },
            },
          ]}
        >
          <SummaryCheckScaleCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(document.getElementById('check-scale-type')).toBeTruthy());

    expect((document.getElementById('original-scaler-licence') as HTMLInputElement).value).toBe(
      'L300',
    );
  });

  it('does not create or navigate when required fields are missing', async () => {
    renderPage();
    await waitFor(() => expect(document.getElementById('check-scale-type')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(screen.getByText('Check Scale Type is required.')).toBeInTheDocument());
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
