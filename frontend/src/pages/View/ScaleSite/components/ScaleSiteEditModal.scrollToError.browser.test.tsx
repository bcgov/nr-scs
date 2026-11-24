import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';

/**
 * Pins the scoping question raised in PR review of the scroll-to-error branch: `scrollToError()`
 * uses a document-wide selector (`document.querySelector('[class*="--invalid"]')`), so in principle
 * an invalid control elsewhere on the page — earlier in document order — could win over a modal's
 * own first error and scroll the user away from the dialog.
 *
 * It doesn't happen here because both Edit modals (`ScaleSiteEditModal`, `ScalerEditModal`) render
 * inside the Summary tab, which is the FIRST `<TabPanel>` in document order, and Carbon's `Modal`
 * renders inline (no portal) — so the modal's own error always precedes any later-tab form's error.
 * This test locks that invariant in: even with a decoy invalid control placed AFTER the modal in the
 * DOM, the scroll target stays inside the dialog. If someone later moves the modal below other form
 * content, this fails.
 */

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: async () => 'tok' }),
}));

// Covers both ScaleSiteEditModal's site-type LOV and the nested DistrictSelect's region/district LOV.
vi.mock('@/hooks/useLovOptions', () => ({
  useLovOptions: () => ({
    data: [{ code: 'A', description: 'Option A' }],
    error: null,
    isLoading: false,
  }),
}));

vi.mock('@/services/APIs', () => ({
  BackendApiConfig: { BASE: '/api' },
  default: {
    scaleSites: { updateScaleSite: vi.fn() },
    lov: { getScaleMethodTypeLov: vi.fn() },
  },
}));

import ScaleSiteEditModal from './ScaleSiteEditModal';

// siteName intentionally empty so the required "Scale Site Name" field is the first invalid control.
const summary = { scaleSiteIdNmbr: 'SS-1', siteName: '' } as never;

const renderModal = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ScaleSiteEditModal open onClose={vi.fn()} summary={summary} />
    </QueryClientProvider>,
  );
};

describe('ScaleSiteEditModal — scroll-to-error stays inside the dialog', () => {
  let scrollMock: ReturnType<typeof vi.spyOn>;
  let decoy: HTMLElement | undefined;

  beforeEach(() => {
    scrollMock = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  });

  afterEach(() => {
    decoy?.remove();
    decoy = undefined;
    vi.restoreAllMocks();
  });

  it('scrolls to the modal’s own first error, not a later-in-document invalid control', async () => {
    const { getByText } = renderModal();

    // A competing invalid control appended to <body> AFTER the modal, so it is LATER in document
    // order. The document-wide selector must still pick the modal's (earlier) error, not this one.
    decoy = document.createElement('div');
    decoy.className = 'cds--text-input cds--text-input--invalid';
    decoy.innerHTML = '<input id="decoy-invalid" />';
    document.body.append(decoy);

    fireEvent.click(getByText('Save Record'));

    await waitFor(() => expect(scrollMock).toHaveBeenCalledTimes(1));

    const scrolled = scrollMock.mock.instances[0] as HTMLElement;
    const modal = document.querySelector('.cds--modal');
    expect(modal).not.toBeNull();
    // The scroll target is inside the dialog…
    expect(modal?.contains(scrolled)).toBe(true);
    // …and is the site-name field's invalid wrapper, not the decoy outside the modal.
    expect(scrolled).toBe(document.getElementById('scale-site-name')?.closest('.cds--text-input--invalid'));
    expect(scrolled).not.toBe(decoy);
  });
});
