import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';

import MarkSiteDesignationReportPage from './index';

const mockSubmit = vi.fn();
const mockSearchScaleSites = vi.fn();
const mockTimberMarkExists = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: () => Promise.resolve('token') }),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    reports: {
      submitMarkSiteDesignationReport: (...args: unknown[]) => mockSubmit(...args),
    },
    lov: {
      getStaticLov: () => Promise.resolve([]),
    },
    scaleSites: {
      searchScaleSites: (...args: unknown[]) => mockSearchScaleSites(...args),
    },
    timberMarks: {
      timberMarkExists: (...args: unknown[]) => mockTimberMarkExists(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/RegDistSelect', () => ({
  default: () => <div data-testid="reg-dist" />,
}));

// MultiValueInput is intentionally NOT mocked so its invalid-pill / error rendering is exercised.

const addSiteMark = (value: string) => {
  const input = document.getElementById('specific-values') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

const clickSend = () => fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

describe('MarkSiteDesignationReportPage site/mark validation', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockSearchScaleSites.mockReset();
    mockTimberMarkExists.mockReset();
    mockSubmit.mockResolvedValue({ blob: new Blob(['x']), filename: 'report.pdf' });
  });

  afterEach(() => {
    cleanup();
  });

  it('flags a value that is neither a scale site nor a timber mark and does not submit', async () => {
    mockSearchScaleSites.mockResolvedValue([]);
    mockTimberMarkExists.mockResolvedValue(false);

    render(<MarkSiteDesignationReportPage />);
    addSiteMark('bogus');
    clickSend();

    await waitFor(() => {
      expect(
        screen.getByText('A Site nor Timbermark for bogus exist in the system.'),
      ).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(document.querySelector('.multi-value-input__pill--invalid')).not.toBeNull();
  });

  it('accepts a value that exists as a scale site and does not query marks', async () => {
    mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '123' }]);
    mockTimberMarkExists.mockResolvedValue(false);

    render(<MarkSiteDesignationReportPage />);
    addSiteMark('123');
    clickSend();

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
    // Site matched, so the mark lookup is short-circuited (legacy OR order).
    expect(mockTimberMarkExists).not.toHaveBeenCalled();
  });

  it('does not treat a partial site-search hit as an exact match (legacy exact read)', async () => {
    // Entering "12" partially matches "120"; that must NOT count as a site, so it falls through to
    // the mark lookup, and with no mark either the value is flagged.
    mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '120' }]);
    mockTimberMarkExists.mockResolvedValue(false);

    render(<MarkSiteDesignationReportPage />);
    addSiteMark('12');
    clickSend();

    await waitFor(() => {
      expect(
        screen.getByText('A Site nor Timbermark for 12 exist in the system.'),
      ).toBeInTheDocument();
    });
    expect(mockTimberMarkExists).toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('reports a validation failure (not a report failure) when a lookup throws', async () => {
    mockSearchScaleSites.mockRejectedValue(new Error('boom')); // lookup itself could not run

    render(<MarkSiteDesignationReportPage />);
    addSiteMark('123');
    clickSend();

    await waitFor(() => {
      expect(
        screen.getByText('Unable to verify the entered sites and marks. Please try again.'),
      ).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('accepts a value that exists only as a timber mark', async () => {
    mockSearchScaleSites.mockResolvedValue([]);
    mockTimberMarkExists.mockResolvedValue(true);

    render(<MarkSiteDesignationReportPage />);
    addSiteMark('ABC123');
    clickSend();

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByText('A Site nor Timbermark for ABC123 exist in the system.'),
    ).not.toBeInTheDocument();
  });
});
