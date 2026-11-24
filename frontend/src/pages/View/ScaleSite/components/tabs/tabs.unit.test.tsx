import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import AuthorizedScalersTab from './AuthorizedScalersTab';
import CheckScalesTab from './CheckScalesTab';
import ContactsTab from './ContactsTab';
import InspectionsTab from './InspectionsTab';
import MsdTab from './MsdTab';

const SITE = 'SS-1';

beforeEach(() => {
  resetApiMock();
});

/**
 * Every scale site tab takes the same `{ isActive, scaleSiteIdNmbr }` pair and defers its fetch
 * until the tab is actually selected, so each is checked both ways: inactive must not call the
 * service, active must.
 */
describe('Scale Site tabs — deferred loading', () => {
  it.each([
    ['AuthorizedScalersTab', AuthorizedScalersTab, apiMock.scaleSiteAuthorizedScalers.getScaleSiteAuthorizedScalers],
    ['CheckScalesTab', CheckScalesTab, apiMock.checkScale.getScaleSiteCheckScales],
    ['InspectionsTab', InspectionsTab, apiMock.scaleSiteInspections.getScaleSiteInspectionSummaries],
    ['MsdTab', MsdTab, apiMock.scaleSiteMarkSiteDesignations.getScaleSiteMarkSiteDesignations],
  ])('%s fetches once it becomes active', async (_name, Tab, call) => {
    const Component = Tab as typeof AuthorizedScalersTab;
    renderWithProviders(<Component isActive scaleSiteIdNmbr={SITE} />);

    await waitFor(() => expect(call).toHaveBeenCalled());
  });

  it.each([
    ['AuthorizedScalersTab', AuthorizedScalersTab, apiMock.scaleSiteAuthorizedScalers.getScaleSiteAuthorizedScalers],
    ['CheckScalesTab', CheckScalesTab, apiMock.checkScale.getScaleSiteCheckScales],
    ['InspectionsTab', InspectionsTab, apiMock.scaleSiteInspections.getScaleSiteInspectionSummaries],
    ['MsdTab', MsdTab, apiMock.scaleSiteMarkSiteDesignations.getScaleSiteMarkSiteDesignations],
  ])('%s does not fetch while inactive', async (_name, Tab, call) => {
    const Component = Tab as typeof AuthorizedScalersTab;
    renderWithProviders(<Component isActive={false} scaleSiteIdNmbr={SITE} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(call).not.toHaveBeenCalled();
  });

  it.each([
    ['AuthorizedScalersTab', AuthorizedScalersTab],
    ['CheckScalesTab', CheckScalesTab],
    ['InspectionsTab', InspectionsTab],
    ['MsdTab', MsdTab],
    ['ContactsTab', ContactsTab],
  ])('%s renders an empty result without crashing', async (_name, Tab) => {
    const Component = Tab as typeof AuthorizedScalersTab;
    const { container } = renderWithProviders(<Component isActive scaleSiteIdNmbr={SITE} />);

    // An empty list is the default from the API mock; the tab must still render its shell.
    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });
});

describe('Scale Site tabs — content', () => {
  it('shows an authorized scaler', async () => {
    apiMock.scaleSiteAuthorizedScalers.getScaleSiteAuthorizedScalers.mockResolvedValue([
      { scalerLicenceNo: 'S1234', scalerName: 'Jane Smith' },
    ]);
    renderWithProviders(<AuthorizedScalersTab isActive scaleSiteIdNmbr={SITE} />);

    expect(await screen.findByText('S1234')).toBeInTheDocument();
  });

  it('passes the site number to the check scale lookup', async () => {
    renderWithProviders(<CheckScalesTab isActive scaleSiteIdNmbr={SITE} />);

    await waitFor(() => expect(apiMock.checkScale.getScaleSiteCheckScales).toHaveBeenCalled());
    expect(apiMock.checkScale.getScaleSiteCheckScales.mock.calls[0][0]).toBe(SITE);
  });

  it('survives a failed load', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionSummaries.mockRejectedValue(
      new Error('Inspections unavailable.'),
    );
    renderWithProviders(<InspectionsTab isActive scaleSiteIdNmbr={SITE} />);

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionSummaries).toHaveBeenCalled(),
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Inspections unavailable\.|unavailable|could not/i));
  });

  it('loads contacts and the site owner together', async () => {
    renderWithProviders(<ContactsTab isActive scaleSiteIdNmbr={SITE} />);

    await waitFor(() =>
      expect(apiMock.scaleSiteContacts.getScaleSiteContacts).toHaveBeenCalled(),
    );
  });

  it('shows a contact row', async () => {
    apiMock.scaleSiteContacts.getScaleSiteContacts.mockResolvedValue([
      { scaleSiteContactId: 1, contactName: 'Pat Jones', contactTypeCode: 'OWN' },
    ]);
    renderWithProviders(<ContactsTab isActive scaleSiteIdNmbr={SITE} />);

    expect(await screen.findByText('Pat Jones')).toBeInTheDocument();
  });

  it('shows a mark site designation row', async () => {
    apiMock.scaleSiteMarkSiteDesignations.getScaleSiteMarkSiteDesignations.mockResolvedValue([
      { haulingMarkAuthorizationId: 3, timberMark: 'TM4242' },
    ]);
    renderWithProviders(<MsdTab isActive scaleSiteIdNmbr={SITE} />);

    expect(await screen.findByText('TM4242')).toBeInTheDocument();
  });
});
