import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';

import RegDistDateRangeReport, { type ReportDateRules } from './RegDistDateRangeReport';

const DATE_RULES: ReportDateRules = { required: true, maxYears: 1 };

const baseProps = {
  title: 'District Check Scale Performance',
  subtitle: 'Reports: District Check Scale Performance',
  formClassName: 'district-check-scale-performance-form',
  downloadBaseName: 'District-Check-Scale-Performance',
};

const okSubmit = () =>
  vi.fn().mockResolvedValue({ blob: new Blob(['x']), filename: 'report.pdf' });

const setDate = (label: string, value: string) => {
  const input = screen.getByLabelText(new RegExp(`^${label}`));
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe('RegDistDateRangeReport', () => {
  it('renders the caller title and the Reg/Dist + date-window controls', () => {
    renderWithProviders(<RegDistDateRangeReport {...baseProps} submit={okSubmit()} />);

    expect(screen.getByText('District Check Scale Performance')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Reg \/ Dist/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^From Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^To Date/)).toBeInTheDocument();
  });

  it('marks the dates required only when date rules are supplied', () => {
    const { unmount } = renderWithProviders(
      <RegDistDateRangeReport {...baseProps} dateRules={DATE_RULES} submit={okSubmit()} />,
    );
    expect(screen.getByLabelText(/^From Date \*/)).toBeInTheDocument();
    unmount();

    renderWithProviders(<RegDistDateRangeReport {...baseProps} submit={okSubmit()} />);
    expect(screen.queryByLabelText(/^From Date \*/)).not.toBeInTheDocument();
  });

  it('does not submit when a required window is left blank', async () => {
    const submit = okSubmit();
    renderWithProviders(
      <RegDistDateRangeReport {...baseProps} dateRules={DATE_RULES} submit={submit} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(submit).not.toHaveBeenCalled());
  });

  it('submits the standard payload, defaulting Reg/Dist to ALL', async () => {
    const submit = okSubmit();
    renderWithProviders(
      <RegDistDateRangeReport {...baseProps} dateRules={DATE_RULES} submit={submit} />,
    );

    setDate('From Date', '2026-01-01');
    setDate('To Date', '2026-03-01');
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0][0]).toMatchObject({
      regDist: 'ALL',
      fromDate: '2026-01-01',
      toDate: '2026-03-01',
      outputFormat: 'PDF',
      preview: true,
    });
  });

  it('rejects a window that exceeds the one-year cap', async () => {
    const submit = okSubmit();
    renderWithProviders(
      <RegDistDateRangeReport {...baseProps} dateRules={DATE_RULES} submit={submit} />,
    );

    setDate('From Date', '2020-01-01');
    setDate('To Date', '2026-01-01');
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(submit).not.toHaveBeenCalled());
  });

  it('allows an open-ended window when no rules are given', async () => {
    const submit = okSubmit();
    renderWithProviders(<RegDistDateRangeReport {...baseProps} submit={submit} />);

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0][0]).toMatchObject({ fromDate: undefined, toDate: undefined });
  });

  it('surfaces a submit failure rather than claiming success', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('Report service unavailable'));
    renderWithProviders(<RegDistDateRangeReport {...baseProps} submit={submit} />);

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText('Report service unavailable')).toBeInTheDocument();
  });

  it('clears the entered window on Reset', async () => {
    renderWithProviders(
      <RegDistDateRangeReport {...baseProps} dateRules={DATE_RULES} submit={okSubmit()} />,
    );

    setDate('From Date', '2026-01-01');
    expect(screen.getByLabelText(/^From Date/)).toHaveValue('2026-01-01');

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    await waitFor(() => expect(screen.getByLabelText(/^From Date/)).toHaveValue(''));
  });
});
