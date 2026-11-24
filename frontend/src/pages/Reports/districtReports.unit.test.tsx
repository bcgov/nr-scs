import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';
import API from '@/services/APIs';

import DistrictCheckScalePerformancePage from './DistrictCheckScalePerformance';
import DistrictSiteInspectionPerformancePage from './DistrictSiteInspectionPerformance';
import ScalingAdministrationPage from './ScalingAdministration';

/**
 * These three screens are thin wrappers over RegDistDateRangeReport. What matters per screen is
 * the heading it shows, the endpoint it posts to, and whether its date window is required —
 * exactly the parameters the shared component takes.
 */
beforeEach(() => {
  // Each test spies on the same API method; without a reset the call counts accumulate and a
  // "should not submit" assertion sees the previous test's call.
  vi.restoreAllMocks();
  // RegDistSelect fetches its options on mount; stub it so the suite makes no network attempt.
  vi.spyOn(API.lov, 'getRegionDistrictRollupLov').mockResolvedValue([] as never);
  vi.spyOn(API.lov, 'getRegionDistrictLov').mockResolvedValue([] as never);
});

const stubDownload = (method: keyof typeof API.reports) =>
  vi
    .spyOn(API.reports, method as never)
    .mockResolvedValue({ blob: new Blob(['x']), filename: 'r.pdf' } as never);

const setDate = (label: string, value: string) => {
  const input = screen.getByLabelText(new RegExp(`^${label}`));
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe('District Check Scale Performance', () => {
  it('renders its own title and posts to its own endpoint', async () => {
    const submit = stubDownload('submitDistrictCheckScalePerformanceReport');
    renderWithProviders(<DistrictCheckScalePerformancePage />);

    expect(screen.getByText('District Check Scale Performance')).toBeInTheDocument();

    setDate('From Date', '2026-01-01');
    setDate('To Date', '2026-02-01');
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });

  it('requires the date window', async () => {
    const submit = stubDownload('submitDistrictCheckScalePerformanceReport');
    renderWithProviders(<DistrictCheckScalePerformancePage />);

    expect(screen.getByLabelText(/^From Date \*/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(submit).not.toHaveBeenCalled());
  });
});

describe('District Site Inspection Performance', () => {
  it('renders its own title and posts to its own endpoint', async () => {
    const submit = stubDownload('submitDistrictSiteInspectionPerformanceReport');
    renderWithProviders(<DistrictSiteInspectionPerformancePage />);

    expect(screen.getByText('District Site Inspection Performance')).toBeInTheDocument();

    setDate('From Date', '2026-01-01');
    setDate('To Date', '2026-02-01');
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });
});

describe('Scaling Administration', () => {
  it('keeps its descriptive subtitle', () => {
    stubDownload('submitScalingAdministrationReport');
    renderWithProviders(<ScalingAdministrationPage />);

    expect(screen.getByText('Scaling Administration Report')).toBeInTheDocument();
    expect(
      screen.getByText(/This report shows the number of authorizations, appointments and MSD's/),
    ).toBeInTheDocument();
  });

  it('leaves the window optional — it sends with no dates at all', async () => {
    const submit = stubDownload('submitScalingAdministrationReport');
    renderWithProviders(<ScalingAdministrationPage />);

    expect(screen.queryByLabelText(/^From Date \*/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0][0]).toMatchObject({ fromDate: undefined, toDate: undefined });
  });
});
