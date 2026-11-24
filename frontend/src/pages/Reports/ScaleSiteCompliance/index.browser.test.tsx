import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';
import { PageTitleProvider } from '@/context/pageTitle/PageTitleProvider';

import ScaleSiteCompliancePage from './index';

const mockSubmit = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    reports: {
      submitScaleSiteComplianceReport: (...args: unknown[]) => mockSubmit(...args),
    },
  },
}));

const renderAt = (path: string) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <PageTitleProvider>
        <Routes>
          <Route
            path="/reports/scale-site-compliance/:inspectionId"
            element={<ScaleSiteCompliancePage />}
          />
        </Routes>
      </PageTitleProvider>
    </MemoryRouter>,
  );
};

describe('ScaleSiteCompliancePage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const authContext = (): AuthContextType => ({
    user: undefined,
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  beforeEach(() => {
    mockSubmit.mockReset();
    mockSubmit.mockResolvedValue({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'compliance.pdf',
    });
    mockUseAuth.mockReturnValue(authContext());
  });

  it('renders an error state and no form when the inspection id is not numeric (AC-7)', async () => {
    renderAt('/reports/scale-site-compliance/not-a-number');

    expect(
      await screen.findByText('A valid site inspection is required to generate this report.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send / View Report' })).not.toBeInTheDocument();
  });

  it('submits with the numeric inspection id and preview=Yes (AC-1)', async () => {
    renderAt('/reports/scale-site-compliance/123');

    fireEvent.click(await screen.findByRole('button', { name: 'Send / View Report' }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    const payload = mockSubmit.mock.calls[0][0];
    expect(payload.inspectionId).toBe(123);
    expect(payload.preview).toBe(true);
    expect(payload.outputFormat).toBe('PDF');
  });

  it('requires an email when preview is No and does not submit (AC-4)', async () => {
    renderAt('/reports/scale-site-compliance/123');

    fireEvent.click(await screen.findByLabelText('No'));
    fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

    expect(
      await screen.findByText(
        'If Preview Report has been set to No then the Email Recipient is required.',
      ),
    ).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
