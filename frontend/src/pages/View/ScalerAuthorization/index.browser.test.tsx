import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';

import ScalerAuthorizationViewPage from './index';

const mockNavigate = vi.fn();
/** Mutated per test so the route-id guard can be exercised. */
const mockParams: { scalerAuthorizationId?: string } = { scalerAuthorizationId: '4001' };
const mockGetScalerAuthorization = vi.fn();
const mockDeleteScalerAuthorization = vi.fn();
const mockGetScalerAuthorizationLetter = vi.fn();
const mockGetRegionDistrictLov = vi.fn();
const mockGetStaticLov = vi.fn();
const mockGetScalerSummary = vi.fn();
const mockGetScalerTombstone = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return Object.assign({}, actual, {
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  });
});

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    scalerAuthorizations: {
      getScalerAuthorization: (...args: unknown[]) => mockGetScalerAuthorization(...args),
      deleteScalerAuthorization: (...args: unknown[]) => mockDeleteScalerAuthorization(...args),
      getScalerAuthorizationLetter: (...args: unknown[]) => mockGetScalerAuthorizationLetter(...args),
      searchActiveScaleAuthConditions: vi.fn(),
      getScaleAuthTemplateConditions: vi.fn(),
    },
    lov: {
      getRegionDistrictLov: (...args: unknown[]) => mockGetRegionDistrictLov(...args),
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
    scalers: {
      getScalerSummary: (...args: unknown[]) => mockGetScalerSummary(...args),
      getScalerTombstone: (...args: unknown[]) => mockGetScalerTombstone(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/WhoDidIt', () => ({
  default: () => <div>Who Did It</div>,
}));

vi.mock('@/components/Form/AuthorizationConditionsSection', () => ({
  default: () => <div>Authorization Conditions</div>,
}));

// Rendered as a real table so the resolved LOV labels and scale-site rows stay assertable —
// the page routes Job Functions, Special Forest Products and Scale Sites all through this one
// component, and the labels are the point of those sections.
vi.mock('@/components/Form/TableResource', () => ({
  default: ({ content, headers }: {
    content?: { content?: Array<Record<string, unknown> & { id: string }> };
    headers?: Array<{ key: string }>;
  }) => (
    <table>
      <tbody>
        {(content?.content ?? []).map((row) => (
          <tr key={row.id}>
            {(headers ?? []).map((header) => (
              <td key={header.key}>{String(row[header.key] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const baseDetail = {
  scalerAuthorizationId: 4001,
  scalerLicenceNo: '8437',
  orgUnitNo: 1234,
  districtWideInd: 'Y',
  authorizationEffectiveDate: '2026-01-01',
  authorizationExpiryDate: '2026-12-31',
  cancellationDate: null,
  cancellationReasonTxt: null,
  status: 'Active',
  letterExists: false,
  jobFunctions: ['P'],
  authForestProducts: [],
  scaleSites: [],
  conditions: [],
};

/**
 * The page calls `useQueryClient` to drop the cached authorization lists after a delete, so it
 * needs a QueryClientProvider ancestor or the hook throws. `retry: false` keeps failure paths from
 * waiting on the default retry backoff.
 */
const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ScalerAuthorizationViewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const field = (id: string) => document.getElementById(id) as HTMLInputElement;
// Regex, not an exact name: the shared core Button appends a TrashCan icon whose SVG
// <title> joins the accessible name ("Delete Trash can").
const deleteButton = () => screen.getByRole('button', { name: /delete/i });
const letterButton = () => screen.getByRole('button', { name: /letter/i });

describe('ScalerAuthorizationViewPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  // An administrator, because Edit/Delete/Create Letter are wrapped in PermissionGate: with
  // `user: undefined` they render nothing and every assertion below fails on a missing button.
  const authValue = (): AuthContextType => ({
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  /** Renders with `detail` loaded, and waits for the record to paint. */
  const renderView = async (detail: Record<string, unknown> = baseDetail) => {
    mockGetScalerAuthorization.mockResolvedValue(detail);
    renderPage();
    await waitFor(() => expect(field('authorization-number')).toBeInTheDocument());
  };

  beforeEach(() => {
    vi.unstubAllGlobals();
    mockParams.scalerAuthorizationId = '4001';
    mockNavigate.mockReset();
    mockGetScalerAuthorization.mockReset();
    mockDeleteScalerAuthorization.mockReset();
    mockDeleteScalerAuthorization.mockResolvedValue(undefined);
    mockGetScalerAuthorizationLetter.mockReset();
    mockGetRegionDistrictLov.mockReset();
    mockGetRegionDistrictLov.mockResolvedValue([{ code: '1234', description: 'Cariboo' }]);
    mockGetStaticLov.mockReset();
    mockGetStaticLov.mockImplementation(async ({ tableKey }: { tableKey: string }) =>
      tableKey === 'SCALE_METHOD_TYPE_CODE'
        ? [
            { code: 'P', description: 'Piece Scaling' },
            { code: 'S', description: 'Special Forest Products' },
          ]
        : [{ code: 'SHAKE', description: 'Shake Blocks' }],
    );
    mockGetScalerSummary.mockReset();
    mockGetScalerSummary.mockResolvedValue({ orgUnitName: 'Summary Org' });
    mockGetScalerTombstone.mockReset();
    mockGetScalerTombstone.mockResolvedValue({
      clientName: 'Tremblay',
      legalFirstName: 'Alex',
      regionName: 'Cariboo Region',
      districtName: 'Quesnel District',
    });
    mockUseAuth.mockReturnValue(authValue());
  });

  it('renders the record with the district and job-function codes resolved to labels', async () => {
    await renderView();

    expect(field('authorized-scaler-licence')).toHaveValue('8437');
    expect(field('authorization-number')).toHaveValue('4001');
    expect(field('effective-date')).toHaveValue('2026-01-01');
    expect(field('expiry-date')).toHaveValue('2026-12-31');
    expect(field('status')).toHaveValue('Active');

    // orgUnitNo 1234 resolved through the region/district LOV, not shown raw.
    expect(field('reg-dist')).toHaveValue('Cariboo');
    expect(field('district-wide')).toHaveValue('Yes');

    // Job function code 'P' resolved through SCALE_METHOD_TYPE_CODE.
    await waitFor(() => expect(screen.getByText('Piece Scaling')).toBeInTheDocument());
  });

  it('fills the scaler header from the tombstone', async () => {
    await renderView();

    await waitFor(() => expect(field('authorized-scaler-name')).toHaveValue('Tremblay, Alex'));
    expect(field('authorized-scaler-region')).toHaveValue('Cariboo Region');
    expect(field('authorized-scaler-district')).toHaveValue('Quesnel District');
  });

  it('falls back to the scaler summary org unit when the tombstone has no region or district', async () => {
    mockGetScalerTombstone.mockResolvedValue({ clientName: 'Tremblay', legalFirstName: 'Alex' });

    await renderView();

    await waitFor(() => expect(field('authorized-scaler-region')).toHaveValue('Summary Org'));
    expect(field('authorized-scaler-district')).toHaveValue('Summary Org');
  });

  it('renders the Scale Sites and Special Forest Products sections when District Wide is No', async () => {
    await renderView({
      ...baseDetail,
      districtWideInd: 'N',
      authForestProducts: ['SHAKE'],
      scaleSites: [{ scaleSiteIdNmbr: 'A12345', siteName: 'Quesnel Yard' }],
    });

    expect(field('district-wide')).toHaveValue('No');
    await waitFor(() => expect(screen.getByText('Scale Sites')).toBeInTheDocument());
    expect(screen.getByText('A12345')).toBeInTheDocument();
    expect(screen.getByText('Quesnel Yard')).toBeInTheDocument();
    // Forest product code resolved through SCALE_PRODUCT_CODE.
    expect(screen.getByText('Shake Blocks')).toBeInTheDocument();
  });

  it('hides the Scale Sites section for a district-wide authorization', async () => {
    await renderView();

    expect(screen.queryByText('Scale Sites')).not.toBeInTheDocument();
  });

  it('routes to the letter page when no letter exists yet', async () => {
    await renderView();

    expect(letterButton()).toHaveTextContent('Create Letter');
    fireEvent.click(letterButton());

    expect(mockNavigate).toHaveBeenCalledWith('/scaler-authorizations/4001/letter');
    expect(mockGetScalerAuthorizationLetter).not.toHaveBeenCalled();
  });

  // Letter-issued arm — E2E defers this (UC-SCA-003 coverage gap #2: no obtainable
  // letterExists=true record). Reachable here because the record is a fixture.
  it('downloads the stored letter instead of navigating when a letter exists', async () => {
    mockGetScalerAuthorizationLetter.mockResolvedValue({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'letter-4001.pdf',
    });

    await renderView({ ...baseDetail, letterExists: true });

    expect(letterButton()).toHaveTextContent('View Letter');
    fireEvent.click(letterButton());

    await waitFor(() => expect(mockGetScalerAuthorizationLetter).toHaveBeenCalledWith(4001, 'token'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // The letter request is responseType:'blob', so a failure arrives with a Blob body that has to be
  // read before the server's message can be shown. The page previously used the synchronous
  // extractor here and fell back to a generic string.
  it('surfaces the server message from a blob error body', async () => {
    mockGetScalerAuthorizationLetter.mockRejectedValue({
      response: {
        data: new Blob([JSON.stringify({ code: 'SCS-409', message: 'The letter is being regenerated.' })], {
          type: 'application/json',
        }),
      },
    });

    await renderView({ ...baseDetail, letterExists: true });

    fireEvent.click(letterButton());

    expect(await screen.findByText('The letter is being regenerated.')).toBeInTheDocument();
  });

  it('surfaces an error when the stored letter cannot be downloaded', async () => {
    mockGetScalerAuthorizationLetter.mockRejectedValue(new Error('Letter service is down.'));

    await renderView({ ...baseDetail, letterExists: true });

    fireEvent.click(letterButton());

    expect(await screen.findByText('Letter service is down.')).toBeInTheDocument();
    // The transient "downloading" banner is cleared in the finally block.
    await waitFor(() => expect(screen.queryByText(/please wait while the letter is downloaded/i)).not.toBeInTheDocument());
  });

  // Letter-lock delete guard — E2E defers this (UC-SCA-004 coverage gap #1, same data blocker).
  it('blocks Delete with an alert and never submits when a letter exists', async () => {
    const alertSpy = vi.fn();
    const confirmSpy = vi.fn().mockReturnValue(true);
    vi.stubGlobal('alert', alertSpy);
    vi.stubGlobal('confirm', confirmSpy);

    await renderView({ ...baseDetail, letterExists: true });

    fireEvent.click(deleteButton());

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toContain('cannot be deleted');
    // The alert short-circuits ahead of the confirm and the request.
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mockDeleteScalerAuthorization).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('deletes and returns to the scaler authorizations tab when confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

    await renderView();

    fireEvent.click(deleteButton());

    await waitFor(() => expect(mockDeleteScalerAuthorization).toHaveBeenCalledWith(4001, 'token'));
    expect(mockNavigate).toHaveBeenCalledWith('/scalers/view/8437?tab=authorizations');
  });

  it('falls back to history when the deleted record carries no licence', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

    await renderView({ ...baseDetail, scalerLicenceNo: '' });

    fireEvent.click(deleteButton());

    await waitFor(() => expect(mockDeleteScalerAuthorization).toHaveBeenCalledWith(4001, 'token'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('skips the delete when the confirm dialog is cancelled', async () => {
    const confirmSpy = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirmSpy);

    await renderView();

    fireEvent.click(deleteButton());

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteScalerAuthorization).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('surfaces the server message when the delete is rejected', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    mockDeleteScalerAuthorization.mockRejectedValue({
      response: { data: { message: 'Authorization is referenced by a check scale.' } },
    });

    await renderView();

    fireEvent.click(deleteButton());

    expect(await screen.findByText('Authorization is referenced by a check scale.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('reports an invalid route id without fetching the record', async () => {
    mockParams.scalerAuthorizationId = 'not-a-number';

    renderPage();

    expect(await screen.findByText('Invalid ID')).toBeInTheDocument();
    expect(mockGetScalerAuthorization).not.toHaveBeenCalled();
  });

  it('reports a load failure', async () => {
    mockGetScalerAuthorization.mockRejectedValue(new Error('Could not reach the server.'));

    renderPage();

    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
