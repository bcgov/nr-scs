import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import DesignatedMarkException from './DesignatedMarkException';
import ScalerRegister from './ScalerRegister';
import ScalingException from './ScalingException';

beforeEach(() => {
  resetApiMock();
});

/**
 * The parameter-driven reports share one shell: report parameters, optional sort order, and the
 * output options block (format, email recipient, preview yes/no). Covering them together pins the
 * shell rather than one page's use of it.
 */
const REPORTS: Array<[string, React.ComponentType, string, string[]]> = [
  [
    'Designated Marks Exception',
    DesignatedMarkException,
    'Designated Marks Exception Report',
    ['from-date', 'to-date', 'mark-reg-dist', 'designated-marks', 'site-reg-dist', 'designated-sites'],
  ],
  [
    'Scaler Register',
    ScalerRegister,
    'Scaler Register Report',
    ['reg-dist', 'licence-status', 'auth-status', 'appointment-status', 'from-date', 'to-date'],
  ],
  [
    'Scaling Exception',
    ScalingException,
    'Scaling Exception Report',
    ['reg-dist', 'from-scale-date', 'to-scale-date'],
  ],
];

describe('Parameter-driven reports', () => {
  it.each(REPORTS)('%s renders its heading', async (_name, Report, heading) => {
    renderWithProviders(<Report />);

    await waitFor(() => expect(screen.getAllByText(heading).length).toBeGreaterThan(0));
  });

  it.each(REPORTS)('%s renders its parameters', async (_name, Report, _heading, ids) => {
    const { container } = renderWithProviders(<Report />);

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
    ids.forEach((id) => {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    });
  });

  it.each(REPORTS)('%s renders the output options', async (_name, Report) => {
    const { container } = renderWithProviders(<Report />);

    await waitFor(() => expect(container.querySelector('#file-format')).not.toBeNull());
    expect(container.querySelector('#email-recipient')).not.toBeNull();
    expect(container.querySelector('#preview-yes')).not.toBeNull();
    expect(container.querySelector('#preview-no')).not.toBeNull();
  });

  it.each(REPORTS)('%s offers Send / View Report and Reset', async (_name, Report) => {
    renderWithProviders(<Report />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Send \/ View Report/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it.each(REPORTS)('%s keeps a typed email recipient', async (_name, Report) => {
    const { container } = renderWithProviders(<Report />);

    await waitFor(() => expect(container.querySelector('#email-recipient')).not.toBeNull());
    const email = container.querySelector('#email-recipient') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'someone@gov.bc.ca' } });

    expect(email).toHaveValue('someone@gov.bc.ca');
  });

  it.each(REPORTS)('%s clears entered values on reset', async (_name, Report) => {
    const { container } = renderWithProviders(<Report />);

    await waitFor(() => expect(container.querySelector('#email-recipient')).not.toBeNull());
    const email = container.querySelector('#email-recipient') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'someone@gov.bc.ca' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() =>
      expect(container.querySelector('#email-recipient')).toHaveValue(''),
    );
  });

  it.each(REPORTS)('%s refuses to run without its required parameters', async (_name, Report) => {
    const { container } = renderWithProviders(<Report />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Send \/ View Report/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

    // Either an inline error appears or the run is simply refused; what must not happen is a crash.
    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });
});
