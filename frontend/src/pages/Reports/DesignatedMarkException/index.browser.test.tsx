import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';

import DesignatedMarkExceptionPage from './index';

const mockSubmit = vi.fn();
const mockTimberMarkExists = vi.fn();
const mockSearchScaleSites = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: () => Promise.resolve('token') }),
}));

// Deliberately no `haulMarkAuthorization` service: the mark check must use the HAULING_AUTHORITY lookup
// (`timberMarks`), not the hauling-mark-authorization search it used to — a call to the old one would throw,
// land in the page's catch, and fail these tests (UC-RPT-005 defects #3).
vi.mock('@/services/APIs', () => ({
  default: {
    reports: {
      submitDesignatedMarksExceptionReport: (...args: unknown[]) => mockSubmit(...args),
    },
    timberMarks: {
      timberMarkExists: (...args: unknown[]) => mockTimberMarkExists(...args),
    },
    scaleSites: {
      searchScaleSites: (...args: unknown[]) => mockSearchScaleSites(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/RegDistSelect', () => ({
  default: () => <div data-testid="reg-dist" />,
}));

// DateInput and MultiValueInput are intentionally NOT mocked: the existence checks run through the real
// MultiValueInput so its invalid-pill/error rendering is exercised.

const addValue = (fieldId: string, value: string) => {
  const input = document.getElementById(fieldId) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};
const addMark = (value: string) => addValue('designated-marks', value);
const addSite = (value: string) => addValue('designated-sites', value);

const clickSend = () => fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

describe('DesignatedMarkExceptionPage timber-mark validation', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockTimberMarkExists.mockReset();
    mockSearchScaleSites.mockReset();
    mockSubmit.mockResolvedValue({ blob: new Blob(['x']), filename: 'report.pdf' });
    mockSearchScaleSites.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("caps each mark and site at legacy's 12 characters", () => {
    render(<DesignatedMarkExceptionPage />);

    // Under /timber-marks/exists' 20-character cap too, so an over-long mark can't come back as a 400.
    expect(document.getElementById('designated-marks')).toHaveAttribute('maxlength', '12');
    expect(document.getElementById('designated-sites')).toHaveAttribute('maxlength', '12');
  });

  it('flags a non-existent timber mark and does not submit the report', async () => {
    mockTimberMarkExists.mockResolvedValue(false); // not in HAULING_AUTHORITY -> mark does not exist

    render(<DesignatedMarkExceptionPage />);
    addMark('grsgrd');
    clickSend();

    await waitFor(() => {
      expect(screen.getByText('A Timbermark for grsgrd does not exist in the system.')).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(document.querySelector('.multi-value-input__pill--invalid')).not.toBeNull();
  });

  it('de-duplicates case-variant marks so the "does not exist" message appears once', async () => {
    mockTimberMarkExists.mockResolvedValue(false);

    render(<DesignatedMarkExceptionPage />);
    addMark('abc');
    addMark('ABC'); // same mark, different case
    clickSend();

    await waitFor(() => {
      expect(screen.getByText('A Timbermark for abc does not exist in the system.')).toBeInTheDocument();
    });
    // Collapsed to a single value: one existence lookup, one message (not two space-joined).
    expect(mockTimberMarkExists).toHaveBeenCalledTimes(1);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('reports a validation failure (not a report failure) when a lookup throws', async () => {
    mockTimberMarkExists.mockRejectedValue(new Error('boom')); // lookup itself could not run

    render(<DesignatedMarkExceptionPage />);
    addMark('ABC123');
    clickSend();

    await waitFor(() => {
      expect(screen.getByText('Unable to verify the entered marks and sites. Please try again.')).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits the report when the timber mark exists, designated or not', async () => {
    // A real mark with no hauling-mark authorization (e.g. AB6633) exists for legacy — the lookup is the
    // whole story, nothing else is consulted.
    mockTimberMarkExists.mockResolvedValue(true);

    render(<DesignatedMarkExceptionPage />);
    addMark('AB6633');
    clickSend();

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
    expect(mockTimberMarkExists).toHaveBeenCalledWith('AB6633', 'token');
    expect(screen.queryByText('A Timbermark for AB6633 does not exist in the system.')).not.toBeInTheDocument();
  });
});

describe('DesignatedMarkExceptionPage scale-site validation (legacy doesSiteExist)', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockTimberMarkExists.mockReset();
    mockSearchScaleSites.mockReset();
    mockSubmit.mockResolvedValue({ blob: new Blob(['x']), filename: 'report.pdf' });
  });

  afterEach(() => {
    cleanup();
  });

  it('flags a non-existent scale site and does not submit the report', async () => {
    mockSearchScaleSites.mockResolvedValue([]);

    render(<DesignatedMarkExceptionPage />);
    addSite('ZZZ');
    clickSend();

    await waitFor(() => {
      expect(screen.getByText('A Scale Site for ZZZ does not exist in the system.')).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(document.querySelector('.multi-value-input__pill--invalid')).not.toBeNull();
  });

  it('refuses a partial site-number match, as legacy findBySiteId was exact', async () => {
    // The search endpoint matches partially, so "52" can return site 520; that is not site 52.
    mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '520' }]);

    render(<DesignatedMarkExceptionPage />);
    addSite('52');
    clickSend();

    await waitFor(() => {
      expect(screen.getByText('A Scale Site for 52 does not exist in the system.')).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits the report when the scale site exists', async () => {
    mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '520' }]);

    render(<DesignatedMarkExceptionPage />);
    addSite('520');
    clickSend();

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('flags an unknown mark and an unknown site together in one Send', async () => {
    mockTimberMarkExists.mockResolvedValue(false);
    mockSearchScaleSites.mockResolvedValue([]);

    render(<DesignatedMarkExceptionPage />);
    addMark('A12345');
    addSite('ZZZ');
    clickSend();

    await waitFor(() => {
      expect(screen.getByText('A Timbermark for A12345 does not exist in the system.')).toBeInTheDocument();
      expect(screen.getByText('A Scale Site for ZZZ does not exist in the system.')).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
