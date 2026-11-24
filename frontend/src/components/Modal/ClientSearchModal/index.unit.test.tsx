import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import ClientSearchModal from './index';

const onRequestClose = vi.fn();

const setup = (open: boolean, props: Record<string, unknown> = {}) =>
  renderWithProviders(<ClientSearchModal open={open} onRequestClose={onRequestClose} {...props} />);

let outerHidden: HTMLElement;
let outerPlain: HTMLElement;

beforeEach(() => {
  resetApiMock();
  // Two pre-existing Carbon modals from a hosting page: one already marked, one not.
  outerHidden = document.createElement('div');
  outerHidden.className = 'cds--modal';
  outerHidden.setAttribute('aria-hidden', 'false');
  outerPlain = document.createElement('div');
  outerPlain.className = 'cds--modal-container';
  document.body.append(outerHidden, outerPlain);
});
afterEach(() => {
  outerHidden.remove();
  outerPlain.remove();
  document.body.classList.remove('scs--modal-stack-open');
});

describe('ClientSearchModal', () => {
  it('renders the client query with the default heading, portaled to the body', () => {
    setup(true);

    expect(screen.getAllByText('Queries - Clients').length).toBeGreaterThan(0);
    expect(document.body.classList.contains('scs--modal-stack-open')).toBe(true);
  });

  it('takes a custom heading', () => {
    setup(true, { modalHeading: 'Pick a client' });

    expect(screen.getAllByText('Pick a client').length).toBeGreaterThan(0);
  });

  it('hides the modals behind it while open and restores them on close', () => {
    const { rerender } = setup(true);

    expect(outerHidden.getAttribute('aria-hidden')).toBe('true');
    expect(outerPlain.getAttribute('aria-hidden')).toBe('true');
    expect((outerPlain as unknown as { inert: boolean }).inert).toBe(true);

    rerender(<ClientSearchModal open={false} onRequestClose={onRequestClose} />);

    expect(outerHidden.getAttribute('aria-hidden')).toBe('false');
    expect(outerPlain.hasAttribute('aria-hidden')).toBe(false);
    expect(document.body.classList.contains('scs--modal-stack-open')).toBe(false);
  });

  it('touches nothing while closed', () => {
    setup(false);

    expect(outerPlain.hasAttribute('aria-hidden')).toBe(false);
    expect(document.body.classList.contains('scs--modal-stack-open')).toBe(false);
  });
});
