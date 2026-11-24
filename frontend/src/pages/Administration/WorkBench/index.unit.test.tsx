import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import WorkBench from './index';

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
});

const renderPage = () => renderWithProviders(<WorkBench />);

describe('Administration — Work Bench', () => {
  it('renders a section for each kind of expiring authorization', () => {
    renderPage();

    expect(screen.getByText('Expiring Scaler Authorizations')).toBeInTheDocument();
    expect(screen.getByText('Expiring Scale Site Authorizations')).toBeInTheDocument();
    expect(screen.getByText('Expiring Mark Site Designations')).toBeInTheDocument();
  });

  it('queries all three workbenches on load', async () => {
    renderPage();

    await waitFor(() => {
      expect(apiMock.scalerAuthorizations.searchScalerAuthorizations).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(apiMock.scaleSiteAuthorizations.searchScaleSiteAuthorizations).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(apiMock.markSiteDesignation.searchMarkSiteDesignations).toHaveBeenCalled();
    });
  });

  it('shows a scaler authorization that is expiring', async () => {
    apiMock.scalerAuthorizations.searchScalerAuthorizations.mockResolvedValue([
      { scalerAuthorizationId: 1, scalerLicenceNumber: 'S1234', scalerName: 'Jane Smith', expiryDate: '2026-03-01' },
    ]);
    renderPage();

    expect(await screen.findByText('S1234')).toBeInTheDocument();
  });

  it('shows a mark site designation that is expiring', async () => {
    apiMock.markSiteDesignation.searchMarkSiteDesignations.mockResolvedValue([
      { haulingMarkAuthorizationId: 9, timberMark: 'TM9999', expiryDate: '2026-04-01' },
    ]);
    renderPage();

    expect(await screen.findByText('TM9999')).toBeInTheDocument();
  });

  it('renders each section even when every workbench is empty', async () => {
    renderPage();

    await waitFor(() => {
      expect(apiMock.scalerAuthorizations.searchScalerAuthorizations).toHaveBeenCalled();
    });
    expect(screen.getByText('Expiring Scaler Authorizations')).toBeInTheDocument();
  });

  it('keeps the other sections when one workbench query fails', async () => {
    apiMock.scalerAuthorizations.searchScalerAuthorizations.mockRejectedValue(
      new Error('Scaler workbench unavailable.'),
    );
    apiMock.markSiteDesignation.searchMarkSiteDesignations.mockResolvedValue([
      { haulingMarkAuthorizationId: 9, timberMark: 'TM9999' },
    ]);
    renderPage();

    expect(await screen.findByText('TM9999')).toBeInTheDocument();
    expect(screen.getByText('Expiring Scaler Authorizations')).toBeInTheDocument();
  });

  it('shows a scale site authorization that is expiring', async () => {
    apiMock.scaleSiteAuthorizations.searchScaleSiteAuthorizations.mockResolvedValue([
      { scaleSiteAuthorizationId: 3, scaleSiteNumber: 'SS-77', scaleSiteName: 'North Yard', expiryDate: '2026-05-01' },
    ]);
    renderPage();

    expect(await screen.findByText('SS-77')).toBeInTheDocument();
  });
});

describe('Administration — Work Bench actions', () => {
  const scalerRow = { scalerAuthorizationId: 1, scalerLicenceNumber: 'S1234', scalerName: 'Jane Smith', expiryDate: '2026-03-01' };
  const rowFor = async (text: string) => {
    const cell = await screen.findByText(text);
    return cell.closest('tr') as HTMLElement;
  };

  // Removing asks for confirmation first; the harness declines by default, so accept it here and
  // cover the declined path explicitly below.
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('removes nothing when the confirmation is declined', async () => {
    confirmSpy.mockReturnValue(false);
    apiMock.scalerAuthorizations.searchScalerAuthorizations.mockResolvedValue([scalerRow]);
    renderPage();

    const row = await rowFor('S1234');
    await userEvent.click(within(row).getByRole('button', { name: /Remove$/i }));

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to remove this record from the list?');
    expect(apiMock.scalerAuthorizations.removeScalerAuthorizationFromWorkbench).not.toHaveBeenCalled();
    expect(screen.getByText('S1234')).toBeInTheDocument();
  });

  it('removes an expiring scaler authorization from the queue and says so', async () => {
    apiMock.scalerAuthorizations.searchScalerAuthorizations.mockResolvedValue([scalerRow]);
    apiMock.scalerAuthorizations.removeScalerAuthorizationFromWorkbench.mockResolvedValue(undefined);
    renderPage();

    const row = await rowFor('S1234');
    await userEvent.click(within(row).getByRole('button', { name: /Remove$/i }));

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.removeScalerAuthorizationFromWorkbench).toHaveBeenCalledWith(1, expect.anything()),
    );
    expect((await screen.findAllByText('Removed from list.')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText('S1234')).not.toBeInTheDocument());
  });

  it('keeps the row and reports when a remove fails', async () => {
    apiMock.scalerAuthorizations.searchScalerAuthorizations.mockResolvedValue([scalerRow]);
    apiMock.scalerAuthorizations.removeScalerAuthorizationFromWorkbench.mockRejectedValue(new Error('Locked.'));
    renderPage();

    const row = await rowFor('S1234');
    await userEvent.click(within(row).getByRole('button', { name: /Remove$/i }));

    expect((await screen.findAllByText('Remove failed.')).length).toBeGreaterThan(0);
    expect(screen.getByText('S1234')).toBeInTheDocument();
  });

  it('renews a scaler authorization and opens the new record', async () => {
    apiMock.scalerAuthorizations.searchScalerAuthorizations.mockResolvedValue([scalerRow]);
    apiMock.scalerAuthorizations.renewScalerAuthorization.mockResolvedValue({ newAuthorizationId: 42 });
    renderPage();

    const row = await rowFor('S1234');
    await userEvent.click(within(row).getByRole('button', { name: /^Add$/i }));

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.renewScalerAuthorization).toHaveBeenCalledWith(1, expect.anything()),
    );
    expect(navigate).toHaveBeenCalledWith('/scaler-authorizations/view/42');
  });

  it('treats a renewal that returns no new id as a failure rather than navigating nowhere', async () => {
    apiMock.scalerAuthorizations.searchScalerAuthorizations.mockResolvedValue([scalerRow]);
    apiMock.scalerAuthorizations.renewScalerAuthorization.mockResolvedValue({});
    renderPage();

    const row = await rowFor('S1234');
    await userEvent.click(within(row).getByRole('button', { name: /^Add$/i }));

    expect((await screen.findAllByText('Renew failed.')).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes a mark site designation renewal to its query-string view', async () => {
    apiMock.markSiteDesignation.searchMarkSiteDesignations.mockResolvedValue([
      { haulingMarkAuthorizationId: 9, timberMark: 'TM9999', expiryDate: '2026-04-01' },
    ]);
    apiMock.markSiteDesignation.renewMarkSiteDesignation.mockResolvedValue({ newAuthorizationId: 77 });
    renderPage();

    const row = await rowFor('TM9999');
    await userEvent.click(within(row).getByRole('button', { name: /^Add$/i }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/mark-site-designations/view?haulingMarkAuthorizationId=77'),
    );
  });

  it('removes a scale site authorization through its own endpoint', async () => {
    apiMock.scaleSiteAuthorizations.searchScaleSiteAuthorizations.mockResolvedValue([
      { scaleSiteAuthorizationId: 3, scaleSiteNumber: 'SS-77', scaleSiteName: 'North Yard', expiryDate: '2026-05-01' },
    ]);
    apiMock.scaleSiteAuthorizations.removeScaleSiteAuthorizationFromWorkbench.mockResolvedValue(undefined);
    renderPage();

    const row = await rowFor('SS-77');
    await userEvent.click(within(row).getByRole('button', { name: /Remove$/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteAuthorizations.removeScaleSiteAuthorizationFromWorkbench).toHaveBeenCalledWith(3, expect.anything()),
    );
    expect(apiMock.scalerAuthorizations.removeScalerAuthorizationFromWorkbench).not.toHaveBeenCalled();
  });
});
