import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';

import CheckScaleEditPage from './index';

const mockNavigate = vi.fn();
const mockGetStaticLov = vi.fn();
const mockGetCheckScale = vi.fn();
const mockUpdate = vi.fn();

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
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
    checkScale: {
      getCheckScale: (...args: unknown[]) => mockGetCheckScale(...args),
      updateCheckScale: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const lovFor = (tableKey: string) => {
  switch (tableKey) {
    case 'CHECK_SCALE_TYPE_CODE':
      return [
        { tableKey, code: 'FCS', description: 'First Check Scale' },
        { tableKey, code: 'SCS', description: 'Second Check Scale' },
      ];
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

const loadedRecord = {
  checkScaleId: 5,
  checkScaleTypeCode: 'FCS',
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'N',
  checkReplacesOriginalInd: 'N',
  chkScalerCommentTxt: 'original comment',
  originalScaleNetValue: 100,
  checkScaleNetValue: 99,
  chkLogTallyDocNo: 'CHK-1',
  chkLogTallyVer: 1,
  orgLogTallyDocNo: 'ORG-1',
  orgLogTallyVer: 1,
  originalScalerLicenceNo: 'L100',
  checkScalerLicenceNo: 'L200',
};

describe('CheckScaleEditPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const authContextValue = (): AuthContextType => ({
    user: undefined,
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const renderPage = (initialEntry = '/check-scales/edit/5') => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/check-scales/edit/:checkScaleId" element={<CheckScaleEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetStaticLov.mockReset();
    mockGetCheckScale.mockReset();
    mockUpdate.mockReset();
    mockGetStaticLov.mockImplementation((params: { tableKey: string }) =>
      Promise.resolve(lovFor(params.tableKey)),
    );
    mockGetCheckScale.mockResolvedValue(loadedRecord);
    mockUpdate.mockResolvedValue(loadedRecord);
    mockUseAuth.mockReturnValue(authContextValue());
  });

  it('loads the record into the editable form', async () => {
    renderPage();

    await waitFor(() => expect(mockGetCheckScale).toHaveBeenCalledWith('5', 'token'));
    expect(await screen.findByDisplayValue('original comment')).toBeInTheDocument();
  });

  it('saves edits via PUT and navigates to the view page', async () => {
    renderPage();

    const comment = await screen.findByDisplayValue('original comment');
    fireEvent.change(comment, { target: { value: 'updated comment' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toBe('5');
    expect(mockUpdate.mock.calls[0][1]).toEqual({
      checkScaleTypeCode: 'FCS',
      followedGoodPracticeInd: 'Y',
      originalWithinStandardInd: 'N',
      chkScalerCommentTxt: 'updated comment',
      originalScaleNetValue: 100,
      checkScaleNetValue: 99,
    });
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/check-scales/view/5'),
    );
  });

  it('shows the not-found error when the record cannot be loaded', async () => {
    // Regression for UC-CHK-002 Divergence #1: a missing record (getCheckScale throws) must surface the
    // not-found error, not leave the page on a perpetual loading skeleton. The bug was the loading guard
    // (`isLoading || !values`) running before the error guard, so on a failed load `values` stayed null
    // and the error branch was unreachable.
    mockGetCheckScale.mockRejectedValue(new Error('CheckScale 5 not found'));
    renderPage();

    expect(
      await screen.findByText('Could not retrieve check scale data.'),
    ).toBeInTheDocument();
  });
});
