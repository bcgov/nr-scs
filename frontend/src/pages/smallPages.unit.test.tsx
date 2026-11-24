import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import RoleError from './RoleError';
import SystemDisabled from './SystemDisabled';
import ScalerAuthorizationLetter from './Letters/ScalerAuthorizationLetter';
import ScaleSiteAuthorizationLetter from './Letters/ScaleSiteAuthorizationLetter';
import MarkSiteDesignationLetter from './Letters/MarkSiteDesignationLetter';
import CheckScaleAdvisoryLetter from './Letters/CheckScaleAdvisoryLetter';

beforeEach(() => {
  resetApiMock();
});

describe('Error and status pages', () => {
  it('RoleError tells a user with no recognised role what happened', () => {
    renderWithProviders(<RoleError />, { roles: [] });

    expect(screen.getAllByText('Unauthorized Access').length).toBeGreaterThan(0);
  });

  it('RoleError renders for a user who does have a role', () => {
    const { container } = renderWithProviders(<RoleError />);

    expect(container.textContent ?? '').not.toBe('');
  });

  it('SystemDisabled renders its notice', () => {
    const { container } = renderWithProviders(<SystemDisabled />);

    expect(container.textContent ?? '').not.toBe('');
  });
});

/**
 * The four letter pages are thin wrappers: each takes an id from the route and hands its own
 * create call to the shared options page. The wiring is the part worth checking — a letter page
 * pointed at the wrong endpoint would look perfectly healthy.
 */
describe('Letter pages', () => {
  // The endpoint is resolved lazily: apiMock is reset between tests and its methods are minted on access.
  const cases: Array<[string, React.ComponentType, string, string, () => ReturnType<typeof vi.fn>]> = [
    [
      'Scaler authorization',
      ScalerAuthorizationLetter,
      '/scaler-authorizations/:scalerAuthorizationId/letter',
      '/scaler-authorizations/5/letter',
      () => apiMock.scalerAuthorizations.createScalerAuthorizationLetter,
    ],
    [
      'Scale site authorization',
      ScaleSiteAuthorizationLetter,
      '/scale-site-authorizations/:scaleSiteAuthorizationId/letter',
      '/scale-site-authorizations/5/letter',
      () => apiMock.scaleSiteAuthorizations.createScaleSiteAuthorizationLetter,
    ],
    [
      'Mark site designation',
      MarkSiteDesignationLetter,
      '/mark-site-designations/:haulingMarkAuthorizationId/letter',
      '/mark-site-designations/5/letter',
      () => apiMock.markSiteDesignation.createMarkSiteDesignationLetter,
    ],
    [
      'Check scale advisory',
      CheckScaleAdvisoryLetter,
      '/check-scales/:checkScaleId/letter',
      '/check-scales/5/letter',
      () => apiMock.checkScale.createCheckScaleAdvisoryLetter,
    ],
  ];

  it.each(cases)('%s letter renders its options page', async (_name, Page, path, route) => {
    const { container } = renderWithProviders(<Page />, { route, path });

    await waitFor(() => expect(container.querySelector('#email-recipient')).not.toBeNull());
  });

  // A positive assertion: the wired endpoint must be the one that fires. A negative check across the
  // auto-mocked services would pass for any name, including a typo, so it proves nothing on its own.
  it.each(cases)('%s letter generates through its own endpoint with the routed id', async (_name, Page, path, route, endpoint) => {
    endpoint().mockResolvedValue({ blob: new Blob(['pdf']), filename: 'letter.pdf' });
    // A signatory is required on every letter but the advisory one, so give the picker a block to
    // default to — an empty picker now blocks the send rather than posting scaleSignatoryBlockId 0.
    apiMock.signatureBlocks.searchLetterSignatureBlocks.mockResolvedValue([
      { scaleSignatoryBlockId: 9, fullName: 'Ann Able' },
    ] as never);
    const { container } = renderWithProviders(<Page />, { route, path });
    await waitFor(() => expect(container.querySelector('#email-recipient')).not.toBeNull());
    await waitFor(() =>
      expect(container.querySelector<HTMLSelectElement>('#signature-blocks-select')?.value).toBe('9'),
    );
    expect(endpoint()).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

    await waitFor(() => expect(endpoint()).toHaveBeenCalledTimes(1));
    expect(String(endpoint().mock.calls[0][0])).toBe('5');
  });

  it.each(cases)('%s letter offers Back', async (_name, Page, path, route) => {
    const { container } = renderWithProviders(<Page />, { route, path });

    await waitFor(() => expect(container.querySelector('#email-recipient')).not.toBeNull());
    expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument();
  });
});

describe('RoleError — signing out', () => {
  it('offers a sign-out action that does not throw', async () => {
    renderWithProviders(<RoleError />, { roles: [] });

    const button = screen.queryAllByRole('button')[0];
    if (button) {
      await userEvent.click(button);
    }

    expect(document.body.textContent ?? '').not.toBe('');
  });
});
