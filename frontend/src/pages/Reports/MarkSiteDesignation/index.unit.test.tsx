import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import MarkSiteDesignationReport from './index';

beforeEach(() => {
  resetApiMock();
});

const renderPage = () => renderWithProviders(<MarkSiteDesignationReport />);
const runReport = async () =>
  userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

describe('Mark Site Designation report', () => {
  it('renders the report parameters and output options', () => {
    const { container } = renderPage();

    expect(controlById(container, 'reg-dist')).toBeInTheDocument();
    expect(controlById(container, 'file-format')).toBeInTheDocument();
    expect(controlById(container, 'email-recipient')).toBeInTheDocument();
  });

  it("caps each mark / site value at legacy's 12 characters", () => {
    const { container } = renderPage();

    // Under /timber-marks/exists' 20-character cap too, so an over-long mark can't come back as a 400.
    expect(controlById(container, 'specific-values')).toHaveAttribute('maxlength', '12');
  });

  it('offers a preview choice', () => {
    const { container } = renderPage();

    expect(controlById(container, 'preview-yes')).toBeInTheDocument();
    expect(controlById(container, 'preview-no')).toBeInTheDocument();
  });

  it('renders the effective and expiry date ranges', () => {
    const { container } = renderPage();

    expect(controlById(container, 'effective-from')).toBeInTheDocument();
    expect(controlById(container, 'effective-to')).toBeInTheDocument();
    expect(controlById(container, 'expiry-from')).toBeInTheDocument();
    expect(controlById(container, 'expiry-to')).toBeInTheDocument();
  });

  it('keeps a typed email recipient', () => {
    const { container } = renderPage();

    const email = controlById(container, 'email-recipient');
    fireEvent.change(email, { target: { value: 'someone@gov.bc.ca' } });

    expect(email).toHaveValue('someone@gov.bc.ca');
  });

  it('clears entered parameters on reset', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'email-recipient'), {
      target: { value: 'someone@gov.bc.ca' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(controlById(container, 'email-recipient')).toHaveValue(''));
  });

  // The district is optional here: with none chosen the report runs for all districts.
  it('runs the report for all districts when none is chosen', async () => {
    apiMock.reports.submitMarkSiteDesignationReport.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'report.pdf' });
    renderPage();

    await runReport();

    await waitFor(() => expect(apiMock.reports.submitMarkSiteDesignationReport).toHaveBeenCalled());
    expect(apiMock.reports.submitMarkSiteDesignationReport.mock.calls[0][0]).toMatchObject({ regDist: 'ALL' });
  });

  it('shows the report heading', () => {
    renderPage();

    expect(screen.getAllByText(/Mark Site Designation Report/i).length).toBeGreaterThan(0);
  });
});
