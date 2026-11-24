import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import SummaryCheckScaleUpdatePage from './index';

const mockNavigate = vi.fn();
const mockGetStaticLov = vi.fn();
const mockGetXref = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockAddSpgRow = vi.fn();
const mockDeleteSpgRow = vi.fn();
const mockDeleteRecord = vi.fn();

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
      getSummaryCheckScale: (...args: unknown[]) => mockGet(...args),
      updateSummaryCheckScale: (...args: unknown[]) => mockUpdate(...args),
      addSpgRow: (...args: unknown[]) => mockAddSpgRow(...args),
      deleteSpgRow: (...args: unknown[]) => mockDeleteSpgRow(...args),
      deleteSummaryCheckScale: (...args: unknown[]) => mockDeleteRecord(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

const lovFor = (tableKey: string) => {
  switch (tableKey) {
    case 'CHECK_SCALE_TYPE_CODE':
      return [{ tableKey, code: 'FCS', description: 'First Check Scale' }];
    case 'SCALE_SPECIES_CODE':
      return [
        { tableKey, code: 'FIR', description: 'Fir' },
        { tableKey, code: 'PINE', description: 'Pine' },
      ];
    case 'SCALE_PRODUCT_CODE':
      return [
        { tableKey, code: 'XM', description: 'Christmas Trees' },
        { tableKey, code: 'BG', description: 'Boughs' },
        { tableKey, code: 'ZZ', description: 'Other' },
      ];
    case 'SCALE_GRADE_CODE':
      return [
        { tableKey, code: '1', description: 'Grade 1' },
        { tableKey, code: '2', description: 'Grade 2' },
        { tableKey, code: '9', description: 'Grade 9' },
      ];
    default:
      return [];
  }
};

const XREF = [
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'XM', scaleGradeCode: '1' },
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'XM', scaleGradeCode: '2' },
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'BG', scaleGradeCode: ' ' },
];

const loadedRecord = {
  checkScaleId: 7,
  ckscType: 'SFPSCS',
  checkScaleTypeCode: 'FCS',
  checkScalerLicenceNo: 'L200',
  originalScalerLicenceNo: 'L100',
  loadArrivalNumber: 'LA1',
  weighSlipNumber: null,
  timberMark: 'TM1',
  scaleSiteIdNmbr: 'SITE1',
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'N',
  checkReplacesOriginalInd: 'N',
  partialInd: 'Y',
  originalScaleDate: '2024-01-01',
  chkScaleDate: '2024-01-02',
  originalScaleReturnNo: 10,
  chkScaleReturnNo: 11,
  chkScalerCommentTxt: 'persisted comment',
  speciesSummary: [
    { speciesCode: 'FIR', productCode: 'XM', speciesGrade: '1', orgPieces: 1, orgNetVolume: 2, orgNetValue: 10, chkPieces: 1, chkNetVolume: 2, chkNetValue: 9 },
    { speciesCode: 'PINE', productCode: 'XM', speciesGrade: '3', orgPieces: 1, orgNetVolume: 2, orgNetValue: 20, chkPieces: 1, chkNetVolume: 2, chkNetValue: 19 },
  ],
};

// A legacy partial-save artifact: header persisted (ckscType set) but no SPG rows.
const zeroRowRecord = { ...loadedRecord, ckscType: 'LTSCS', speciesSummary: [] };

describe('SummaryCheckScaleUpdatePage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  /**
   * An administrator, so the permission-gated Delete Record and Create Letter render: these tests are
   * about the page's behaviour, not authorization. It was `user: undefined` — no permissions at all —
   * which was harmless while those controls were ungated and would silently hide them once they were.
   */
  const authContextValue = (roles: string[] = [SYS_ADMIN_ROLE]): AuthContextType => ({
    user: { roles, privileges: Object.fromEntries(roles.map((role) => [role, null])) },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const renderPage = (state?: { backTo?: string; scalerName?: string }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/summary-check-scales/7/edit', state }]}>
          <Routes>
            <Route path="/summary-check-scales/:checkScaleId/edit" element={<SummaryCheckScaleUpdatePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    [mockNavigate, mockGetStaticLov, mockGetXref, mockGet, mockUpdate, mockAddSpgRow, mockDeleteSpgRow, mockDeleteRecord].forEach(
      (m) => m.mockReset(),
    );
    mockGetStaticLov.mockImplementation((params: { tableKey: string }) => Promise.resolve(lovFor(params.tableKey)));
    mockGetXref.mockResolvedValue(XREF);
    mockGet.mockResolvedValue(loadedRecord);
    mockUpdate.mockResolvedValue(loadedRecord);
    mockAddSpgRow.mockResolvedValue(loadedRecord);
    mockUseAuth.mockReturnValue(authContextValue());
  });

  it('loads and hydrates the record', async () => {
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('7', 'token'));
    expect(await screen.findByDisplayValue('persisted comment')).toBeInTheDocument();
    expect(screen.getByText('Summary Check Scale - Update')).toBeInTheDocument();
    expect(screen.getByText('Check Scale #7')).toBeInTheDocument();
  });

  it('hides Back when there is no scaler context', async () => {
    renderPage();
    await screen.findByDisplayValue('persisted comment');
    expect(screen.queryByRole('button', { name: /Back/ })).not.toBeInTheDocument();
  });

  it('shows Back and navigates to backTo when arriving from a scaler context', async () => {
    renderPage({ backTo: '/scalers/123/check-scales', scalerName: 'JANE DOE' });
    await screen.findByDisplayValue('persisted comment');

    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/scalers/123/check-scales');
  });

  it('navigates to the advisory-letter flow when Create Letter is clicked (UC-RPT-002)', async () => {
    renderPage();
    await screen.findByDisplayValue('persisted comment');

    fireEvent.click(screen.getByRole('button', { name: /Create Letter/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/check-scales/7/advisory-letter');
  });

  it('locks the Return Type when the record has SPG rows', async () => {
    renderPage();
    await screen.findByDisplayValue('persisted comment');
    expect(screen.getByLabelText('Special Forest Product')).toBeDisabled();
    expect(screen.getByLabelText('Log Tally')).toBeDisabled();
  });

  it('leaves the Return Type editable on a zero-row record (legacy parity)', async () => {
    mockGet.mockResolvedValue(zeroRowRecord);
    renderPage();
    await screen.findByDisplayValue('persisted comment');
    expect(screen.getByLabelText('Log Tally')).toBeEnabled();
    expect(screen.getByLabelText('Special Forest Product')).toBeEnabled();
  });

  it('blocks Add until a changed Return Type is saved (zero-row record)', async () => {
    mockGet.mockResolvedValue(zeroRowRecord);
    renderPage();
    await screen.findByDisplayValue('persisted comment');

    // Loaded as LT (non-SFP); crossing to SFP changes the SPG gating -> Add disabled + hint shown.
    fireEvent.click(screen.getByLabelText('Special Forest Product'));

    await waitFor(() =>
      expect(
        screen.getByText('You must save the changed return type before you will be able to add species product grade.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /^Add$/ })).toBeDisabled();
  });

  it('keeps Add enabled when switching between LT and SLT (gating unchanged)', async () => {
    mockGet.mockResolvedValue(zeroRowRecord);
    renderPage();
    await screen.findByDisplayValue('persisted comment');

    fireEvent.click(screen.getByLabelText('Sample Log Tally'));

    // LT -> SLT does not cross the SFP boundary, so Add stays enabled.
    expect(screen.getByRole('button', { name: /^Add$/ })).toBeEnabled();
  });

  it('narrows the add-row Product options once a species is selected', async () => {
    renderPage();
    await screen.findByDisplayValue('persisted comment');

    const species = screen.getByRole('combobox', { name: /Species/ });
    fireEvent.change(species, { target: { value: 'FIR' } });

    const product = screen.getByRole('combobox', { name: /Product/ });
    await waitFor(() =>
      expect(within(product).getAllByRole('option').map((o) => o.getAttribute('value'))).toEqual(['', 'XM', 'BG']),
    );
  });

  it('shows a totals row summing the SPG rows', async () => {
    renderPage();
    await screen.findByDisplayValue('persisted comment');
    expect(screen.getByText('Totals:')).toBeInTheDocument();
    // Two rows: pieces 1+1=2, volume 2+2=4.0, original value 10+20=30.00, check value 9+19=28.00.
    expect(screen.getByText('30.00')).toBeInTheDocument();
    expect(screen.getByText('28.00')).toBeInTheDocument();
  });

  it('shows per-row delete actions when more than one SPG row exists', async () => {
    renderPage();
    await screen.findByDisplayValue('persisted comment');
    const deleteButtons = await screen.findAllByRole('button', { name: /Delete row/ });
    expect(deleteButtons.length).toBe(2);
    deleteButtons.forEach((btn) => expect(btn).toBeEnabled());
  });

  it('blocks Add when the SPG row is empty (validates before calling the API)', async () => {
    renderPage();
    await screen.findByDisplayValue('persisted comment');

    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }));

    await waitFor(() => expect(screen.getByText('Species is required.')).toBeInTheDocument());
    expect(mockAddSpgRow).not.toHaveBeenCalled();
  });

  /**
   * The route requires SUMMARY_CHECK_SCALE_UPDATE, so Back / Reset / Save Record need no second gate —
   * but §I gives the `D` to the administrator alone and the letter is its own capability. A Check
   * Scaler therefore edits the record and issues its letter without being able to delete it.
   */
  describe('Delete Record is gated separately from the edit the route already grants', () => {
    it('hides Delete Record from a Check Scaler while keeping Save and Create Letter', async () => {
      mockUseAuth.mockReturnValue(authContextValue(['SCS_CHECK_SCALER']));

      renderPage();
      await screen.findByDisplayValue('persisted comment');

      expect(screen.queryByRole('button', { name: /Delete Record/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Record/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Letter/ })).toBeInTheDocument();
    });

    it('shows Delete Record to an administrator', async () => {
      renderPage();
      await screen.findByDisplayValue('persisted comment');

      expect(screen.getByRole('button', { name: /Delete Record/ })).toBeInTheDocument();
    });
  });
});
