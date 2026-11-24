import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import Landing from './Landing';
import ViewScaler from './View/Scaler';
import ViewScaleSite from './View/ScaleSite';
import SoftwareTab from './View/ScaleSite/components/tabs/SoftwareTab';
import ScaleSiteEditModal from './View/ScaleSite/components/ScaleSiteEditModal';
import ViewScaleSiteInspection from './View/ScaleSiteInspection';

beforeEach(() => {
  resetApiMock();
});

describe('Landing', () => {
  it('renders', async () => {
    const { container } = renderWithProviders(<Landing />);

    await waitFor(() => expect(container.querySelector('.landing-grid-container')).not.toBeNull());
  });

  it('asks for the welcome summary', async () => {
    renderWithProviders(<Landing />);

    await waitFor(() => expect(apiMock.welcome.getWelcomeSummary).toHaveBeenCalled());
  });

  it('survives a failed welcome load', async () => {
    apiMock.welcome.getWelcomeSummary.mockRejectedValue(new Error('Welcome unavailable.'));
    renderWithProviders(<Landing />);

    await waitFor(() => expect(apiMock.welcome.getWelcomeSummary).toHaveBeenCalled());
    await waitFor(() => expect(document.body.textContent).toMatch(/Welcome unavailable\.|unavailable|could not/i));
  });
});

describe('View Scaler shell', () => {
  const renderPage = () =>
    renderWithProviders(<ViewScaler />, {
      route: '/scalers/S1234',
      path: '/scalers/:scalerLicenceNo',
    });

  beforeEach(() => {
    apiMock.scalers.getScalerSummary.mockResolvedValue({
      scalerLicenceNo: 'S1234',
      legalFirstName: 'Jane',
      legalLastName: 'Smith',
    });
    apiMock.scalers.getScalerTombstone.mockResolvedValue({ scalerLicenceNo: 'S1234' });
  });

  it('loads the scaler summary named in the route', async () => {
    renderPage();

    await waitFor(() => expect(apiMock.scalers.getScalerSummary).toHaveBeenCalled());
    expect(apiMock.scalers.getScalerSummary.mock.calls[0][0]).toBe('S1234');
  });

  it('shows the record heading', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Scaler Record').length).toBeGreaterThan(0));
  });

  it('survives a failed summary load', async () => {
    apiMock.scalers.getScalerSummary.mockRejectedValue(new Error('Scaler not available.'));
    renderPage();

    await waitFor(() => expect(apiMock.scalers.getScalerSummary).toHaveBeenCalled());
    await waitFor(() => expect(document.body.textContent).toMatch(/Scaler not available\.|not available|could not/i));
  });
});

describe('View Scale Site shell', () => {
  const renderPage = () =>
    renderWithProviders(<ViewScaleSite />, {
      route: '/scale-sites/SS-1',
      path: '/scale-sites/:scaleSiteIdNmbr',
    });

  beforeEach(() => {
    apiMock.scaleSites.getScaleSiteSummary.mockResolvedValue({
      scaleSiteIdNmbr: 'SS-1',
      siteName: 'North Yard',
    });
    apiMock.scaleSites.getScaleSiteTombstone.mockResolvedValue({ scaleSiteIdNmbr: 'SS-1' });
  });

  it('loads the scale site summary named in the route', async () => {
    renderPage();

    await waitFor(() => expect(apiMock.scaleSites.getScaleSiteSummary).toHaveBeenCalled());
    expect(apiMock.scaleSites.getScaleSiteSummary.mock.calls[0][0]).toBe('SS-1');
  });

  it('shows the record heading', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('Scale Site Record').length).toBeGreaterThan(0),
    );
  });

  it('survives a failed summary load', async () => {
    apiMock.scaleSites.getScaleSiteSummary.mockRejectedValue(new Error('Site not available.'));
    renderPage();

    await waitFor(() => expect(apiMock.scaleSites.getScaleSiteSummary).toHaveBeenCalled());
    await waitFor(() => expect(document.body.textContent).toMatch(/Site not available\.|not available|could not/i));
  });
});

describe('SoftwareTab', () => {
  it('fetches once active', async () => {
    renderWithProviders(<SoftwareTab isActive scaleSiteIdNmbr="SS-1" />);

    await waitFor(() =>
      expect(apiMock.scaleSiteSoftware.getScaleSiteSoftware).toHaveBeenCalled(),
    );
  });

  it('does not fetch while inactive', async () => {
    renderWithProviders(<SoftwareTab isActive={false} scaleSiteIdNmbr="SS-1" />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(apiMock.scaleSiteSoftware.getScaleSiteSoftware).not.toHaveBeenCalled();
  });

  it('renders an empty result without crashing', async () => {
    const { container } = renderWithProviders(<SoftwareTab isActive scaleSiteIdNmbr="SS-1" />);

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('shows a software row', async () => {
    apiMock.scaleSiteSoftware.getScaleSiteSoftware.mockResolvedValue([
      { softwareName: 'ScaleCalc', versionNumber: '2.1' },
    ]);
    const { container } = renderWithProviders(<SoftwareTab isActive scaleSiteIdNmbr="SS-1" />);

    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0));
  });
});

describe('ScaleSiteEditModal', () => {
  const summary = { scaleSiteIdNmbr: 'SS-1', siteName: 'North Yard' } as never;
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([{ code: 'A', description: 'Option A' }]);
  });

  it('renders when open', async () => {
    const { container } = renderWithProviders(
      <ScaleSiteEditModal open onClose={onClose} summary={summary} />,
    );

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('updates nothing merely by opening', async () => {
    renderWithProviders(<ScaleSiteEditModal open onClose={onClose} summary={summary} />);

    await waitFor(() => expect(document.body.textContent ?? '').not.toBe(''));
    expect(apiMock.scaleSites.updateScaleSite).not.toHaveBeenCalled();
  });

  it('updates nothing while closed', async () => {
    renderWithProviders(
      <ScaleSiteEditModal open={false} onClose={onClose} summary={summary} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(apiMock.scaleSites.updateScaleSite).not.toHaveBeenCalled();
  });
});

describe('View Scale Site Inspection', () => {
  const renderPage = () =>
    renderWithProviders(<ViewScaleSiteInspection />, {
      route: '/scale-sites/SS-1/inspections/7',
      path: '/scale-sites/:scaleSiteIdNmbr/inspections/:inspectionId',
    });

  beforeEach(() => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionDetail.mockResolvedValue({
      inspectionId: 7,
      scaleSiteIdNmbr: 'SS-1',
      inspectionDate: '2026-01-01',
      questions: [],
    });
  });

  it('loads the inspection named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionDetail).toHaveBeenCalled(),
    );
  });

  it('renders the loaded inspection', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('deletes nothing without confirmation', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionDetail).toHaveBeenCalled(),
    );
    expect(apiMock.scaleSiteInspections.deleteScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('survives a failed load', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionDetail.mockRejectedValue(
      new Error('Inspection not available.'),
    );
    renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionDetail).toHaveBeenCalled(),
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Inspection not available\.|not available|could not/i));
  });
});
