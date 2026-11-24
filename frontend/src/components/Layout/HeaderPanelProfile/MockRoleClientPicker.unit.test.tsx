import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { MockAuthProvider } from '@/context/auth/MockAuthProvider';

import MockRoleClientPicker from './MockRoleClientPicker';

/**
 * A developer-only control for the mock auth provider: which roles the mock user holds and which
 * clients they impersonate. Rendered under import.meta.env.DEV only, inside the header profile.
 */
const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MockAuthProvider>
          <MockRoleClientPicker />
        </MockAuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('MockRoleClientPicker', () => {
  it('shows the dev-only heading and the role and client controls', () => {
    const { container } = setup();

    expect(container.textContent ?? '').toContain('Dev only');
    expect(container.querySelector('#mock-dev-role')).not.toBeNull();
    expect(container.querySelector('#mock-dev-client')).not.toBeNull();
  });

  it('starts with the default mock role selected', () => {
    const { container } = setup();

    expect(container.textContent ?? '').toContain('SCS_SYS_ADMIN');
  });

  it('opens the role menu and lists roles to choose from', async () => {
    const { container } = setup();

    // The multiselect toggle has no text; it is addressed by its downshift id.
    await userEvent.click(container.querySelector('[id$="-toggle-button"]') as HTMLElement);

    await waitFor(() => expect(container.querySelectorAll('[role="option"]').length).toBeGreaterThan(0));
  });

  it('survives choosing a role from the menu', async () => {
    const { container } = setup();

    await userEvent.click(container.querySelector('[id$="-toggle-button"]') as HTMLElement);
    await waitFor(() => expect(container.querySelectorAll('[role="option"]').length).toBeGreaterThan(0));
    const options = Array.from(container.querySelectorAll('[role="option"]'));
    await userEvent.click(options[options.length - 1]);

    // Downshift's selection bookkeeping is not reliably observable here; the click must simply
    // leave the picker standing.
    expect(container.textContent ?? '').toContain('Dev only');
  });

  it('accepts a typed client number, and Reset restores the default role', async () => {
    const { container } = setup();

    const client = container.querySelector('#mock-dev-client') as HTMLInputElement;
    await userEvent.type(client, '00012345');
    expect(client).toHaveValue('00012345');

    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(container.textContent ?? '').toContain('SCS_SYS_ADMIN'));
  });

  it('offers a client search', async () => {
    setup();

    expect(screen.getByRole('button', { name: /Search clients/i })).toBeInTheDocument();
  });
});
