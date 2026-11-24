import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';

import MarkSiteDesignationReportPage from './index';

const mockSubmit = vi.fn();

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
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/RegDistSelect', () => ({
  default: () => <div data-testid="reg-dist" />,
}));

vi.mock('@/components/core/MultiValueInput', () => ({
  default: () => <div data-testid="multi-value" />,
}));

vi.mock('@/components/core/DateInput', () => ({
  default: ({ id }: { id: string }) => <input id={id} />,
}));

/**
 * The Reports > Mark Site Designation page had no test. Its shared ReportPage email/preview validation runs
 * client-side before any request — since Jasper generation is env-blocked on the deployed WAR, this
 * client-side path is exactly what a unit test should lock (and it needs no backend).
 */
describe('MarkSiteDesignationReportPage', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the report parameters screen', async () => {
    render(<MarkSiteDesignationReportPage />);
    await waitFor(() => {
      expect(screen.getByText('Mark Site Designation Report')).toBeInTheDocument();
    });
  });

  it('requires an email recipient when Preview Report is No, and does not submit', async () => {
    render(<MarkSiteDesignationReportPage />);

    fireEvent.click(document.querySelector('label[for="preview-no"]') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

    await waitFor(() => {
      expect(
        screen.getByText('If Preview Report has been set to No then the Email Recipient is required.'),
      ).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('rejects an invalid email recipient and does not submit', async () => {
    render(<MarkSiteDesignationReportPage />);

    fireEvent.change(document.getElementById('email-recipient') as HTMLInputElement, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

    await waitFor(() => {
      expect(screen.getByText('Email Recipient must be a valid email address.')).toBeInTheDocument();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
