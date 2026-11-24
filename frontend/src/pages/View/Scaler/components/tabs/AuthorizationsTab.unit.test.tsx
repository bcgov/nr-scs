import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';
import API from '@/services/APIs';
import type { ScalerAuthorizationListItem } from '@/services/scalerAuthorizations.service';

import AuthorizationsTab from './AuthorizationsTab';

const authorization: ScalerAuthorizationListItem = {
  scalerAuthorizationId: 501,
  authorizationEffectiveDate: '2026-01-01',
  authorizationExpiryDate: '2026-12-31',
  districtWideInd: 'Y',
  orgUnitNo: 12,
  authorizedSites: [],
  status: 'Active',
  letterExists: true,
};

const stubList = (rows: ScalerAuthorizationListItem[]) =>
  vi.spyOn(API.scalerAuthorizations, 'listScalerAuthorizations').mockResolvedValue(rows);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(API.lov, 'getRegionDistrictLov').mockResolvedValue([] as never);
});

describe('AuthorizationsTab', () => {
  it('renders the scaler authorization columns once loaded', async () => {
    stubList([authorization]);

    renderWithProviders(<AuthorizationsTab isActive scalerLicenceNo="A1234" />);

    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Scaler authorizations' })).toBeInTheDocument(),
    );
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual([
      'Authorization #',
      'Effective Date',
      'Expiry Date',
      'Authorized Sites',
      'District Wide?',
      'Authorized District',
      'Status',
      'Authorization Letter',
    ]);
  });

  it('does not fetch until the tab is active', () => {
    const list = stubList([authorization]);

    renderWithProviders(<AuthorizationsTab isActive={false} scalerLicenceNo="A1234" />);

    expect(list).not.toHaveBeenCalled();
  });

  it('does not fetch without a licence number', () => {
    const list = stubList([authorization]);

    renderWithProviders(<AuthorizationsTab isActive scalerLicenceNo="   " />);

    expect(list).not.toHaveBeenCalled();
  });

  it('surfaces a load failure instead of an empty table', async () => {
    vi.spyOn(API.scalerAuthorizations, 'listScalerAuthorizations').mockRejectedValue(
      new Error('authorizations service down'),
    );

    renderWithProviders(<AuthorizationsTab isActive scalerLicenceNo="A1234" />);

    expect(await screen.findByText('Could not load authorizations')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the empty state when the scaler has no authorizations', async () => {
    stubList([]);

    renderWithProviders(<AuthorizationsTab isActive scalerLicenceNo="A1234" />);

    expect(await screen.findByText('No authorizations found')).toBeInTheDocument();
  });

  it('links the authorization number to its view page', async () => {
    stubList([authorization]);

    renderWithProviders(<AuthorizationsTab isActive scalerLicenceNo="A1234" />);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: '501' })).toHaveAttribute(
        'href',
        '/scaler-authorizations/view/501',
      ),
    );
  });
});
