import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';
import API from '@/services/APIs';
import type { ScaleSiteAuthorizationDetail } from '@/services/scaleSiteAuthorizations.service';

import ScaleSiteAuthorizationsTab from './ScaleSiteAuthorizationsTab';

const authorization = {
  scaleSiteAuthorizationId: 900,
  authorizationEffectiveDate: '2026-01-01',
  authorizationExpiryDate: '2026-12-31',
  cancellationDate: null,
  cancellationReasonTxt: null,
  status: 'Active',
  letterExists: false,
} as ScaleSiteAuthorizationDetail;

const stubList = (rows: ScaleSiteAuthorizationDetail[]) =>
  vi.spyOn(API.scaleSiteAuthorizations, 'listScaleSiteAuthorizations').mockResolvedValue(rows);

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ScaleSiteAuthorizationsTab', () => {
  it('renders the scale site column set — cancellation columns, no authorized sites', async () => {
    stubList([authorization]);

    renderWithProviders(<ScaleSiteAuthorizationsTab isActive scaleSiteIdNmbr="12345" />);

    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Scale site authorizations' })).toBeInTheDocument(),
    );
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual([
      'Authorization #',
      'Effective Date',
      'Expiry Date',
      'Canceled Date',
      'Cancellation Reason',
      'Status',
      'Authorization Letter',
    ]);
  });

  it('does not fetch until the tab is active', () => {
    const list = stubList([authorization]);

    renderWithProviders(<ScaleSiteAuthorizationsTab isActive={false} scaleSiteIdNmbr="12345" />);

    expect(list).not.toHaveBeenCalled();
  });

  it('surfaces a load failure', async () => {
    vi.spyOn(API.scaleSiteAuthorizations, 'listScaleSiteAuthorizations').mockRejectedValue(
      new Error('down'),
    );

    renderWithProviders(<ScaleSiteAuthorizationsTab isActive scaleSiteIdNmbr="12345" />);

    expect(await screen.findByText('Could not load authorizations')).toBeInTheDocument();
  });

  it('shows the empty state for a site with no authorizations', async () => {
    stubList([]);

    renderWithProviders(<ScaleSiteAuthorizationsTab isActive scaleSiteIdNmbr="12345" />);

    expect(await screen.findByText('No authorizations found')).toBeInTheDocument();
  });

  it('links the authorization to the scale site authorization view', async () => {
    stubList([authorization]);

    renderWithProviders(<ScaleSiteAuthorizationsTab isActive scaleSiteIdNmbr="12345" />);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: '900' })).toHaveAttribute(
        'href',
        '/scale-site-authorizations/view/900',
      ),
    );
  });
});
