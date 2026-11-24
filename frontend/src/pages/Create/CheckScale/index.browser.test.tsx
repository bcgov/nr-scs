import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import CheckScaleCreatePage from './index';

const mockNavigate = vi.fn();
const mockGetStaticLov = vi.fn();
const mockValidate = vi.fn();
const mockCreate = vi.fn();

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
      validateCheckScale: (...args: unknown[]) => mockValidate(...args),
      createCheckScale: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CheckScaleCreatePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

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

describe('CheckScaleCreatePage', () => {
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
    mockNavigate.mockReset();
    mockGetStaticLov.mockReset();
    mockValidate.mockReset();
    mockCreate.mockReset();
    mockGetStaticLov.mockImplementation((params: { tableKey: string }) =>
      Promise.resolve(lovFor(params.tableKey)),
    );
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('walks step 1 → step 2 → save and navigates to the view page', async () => {
    mockValidate.mockResolvedValue({
      ok: true,
      errors: [],
      checkScale: {
        chkLogTallyDocNo: 'CHK-1',
        chkLogTallyVer: 1,
        orgLogTallyDocNo: 'ORG-1',
        orgLogTallyVer: 1,
        checkScalerLicenceNo: 'L100',
        originalScalerLicenceNo: 'L200',
        secondScalerLicenceNo: 'L300',
        loadArrivalNumber: 'LA-9',
        timberMark: 'TM-A',
        scaleSiteIdNmbr: 'SS-7',
        checkReplacesOriginalInd: 'N',
        originalScaleDate: '2002-07-15',
        chkScaleDate: '2002-07-16',
        originalScaleReturnNo: 1005,
        chkScaleReturnNo: 1006,
        originalScaleTotalTops: 1,
        chkScaleTotalTops: 1,
        originalScaleTotalButts: 2,
        chkScaleTotalButts: 2,
        originalScaleTotalLength: 12.345,
        chkScaleTotalLength: 12.678,
        speciesSummary: [
          {
            speciesCode: 'CE',
            speciesGrade: 'J',
            productCode: 'L',
            orgPieces: 1,
            orgNetVolume: 0.39,
            chkPieces: 1,
            chkNetVolume: 0.125,
          },
        ],
      },
    });
    mockCreate.mockResolvedValue({ checkScaleId: 42 });

    renderPage();

    // Step 1 — Return Type defaults to "Log Tally". Fill the four DDN/DDV inputs.
    fireEvent.change(document.getElementById('ddn-check') as HTMLInputElement, {
      target: { value: 'CHK-1' },
    });
    fireEvent.change(document.getElementById('ddv-check') as HTMLInputElement, {
      target: { value: '1' },
    });
    fireEvent.change(document.getElementById('ddn-orig') as HTMLInputElement, {
      target: { value: 'ORG-1' },
    });
    fireEvent.change(document.getElementById('ddv-orig') as HTMLInputElement, {
      target: { value: '1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // Validate POST fires with the narrow request shape (no `ckscType` on the wire).
    await waitFor(() => expect(mockValidate).toHaveBeenCalledTimes(1));
    expect(mockValidate.mock.calls[0][0]).toEqual({
      chkLogTallyDocNo: 'CHK-1',
      chkLogTallyVer: 1,
      orgLogTallyDocNo: 'ORG-1',
      orgLogTallyVer: 1,
    });

    // Step 2 — preview rendered. Length total is formatted to 1 decimal place per legacy.
    await waitFor(() => expect(screen.getByDisplayValue('12.3')).toBeInTheDocument());
    expect(screen.getByDisplayValue('12.7')).toBeInTheDocument();

    // Fill the editable step-2 fields.
    fireEvent.change(document.getElementById('check-scale-type') as HTMLSelectElement, {
      target: { value: 'FCS' },
    });
    fireEvent.change(document.getElementById('followed-good-practices') as HTMLSelectElement, {
      target: { value: 'Yes' },
    });
    fireEvent.change(document.getElementById('original-within-standard') as HTMLSelectElement, {
      target: { value: 'No' },
    });
    fireEvent.change(document.getElementById('orig-net') as HTMLInputElement, {
      target: { value: '100.5' },
    });
    fireEvent.change(document.getElementById('check-net') as HTMLInputElement, {
      target: { value: '99.5' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      checkScaleTypeCode: 'FCS',
      followedGoodPracticeInd: 'Y',
      originalWithinStandardInd: 'N',
      originalScaleNetValue: 100.5,
      checkScaleNetValue: 99.5,
      chkLogTallyDocNo: 'CHK-1',
      chkLogTallyVer: 1,
      orgLogTallyDocNo: 'ORG-1',
      orgLogTallyVer: 1,
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/check-scales/view/42'));
  });

  it('renders inline field errors when validate returns ok:false', async () => {
    mockValidate.mockResolvedValue({
      ok: false,
      errors: [
        { field: 'checkScaleDdn', message: "Check Scale DDN 'BAD' does not exist in HBS." },
      ],
    });

    renderPage();

    fireEvent.change(document.getElementById('ddn-check') as HTMLInputElement, {
      target: { value: 'BAD' },
    });
    fireEvent.change(document.getElementById('ddv-check') as HTMLInputElement, {
      target: { value: '1' },
    });
    fireEvent.change(document.getElementById('ddn-orig') as HTMLInputElement, {
      target: { value: 'ORG-1' },
    });
    fireEvent.change(document.getElementById('ddv-orig') as HTMLInputElement, {
      target: { value: '1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(mockValidate).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText(/Check Scale DDN 'BAD' does not exist in HBS\./)).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
