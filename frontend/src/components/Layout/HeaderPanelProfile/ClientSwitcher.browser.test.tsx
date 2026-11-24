import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  ActiveClientContext,
  type ActiveClientContextType,
} from '@/context/activeClient/ActiveClientContext';

import ClientSwitcher from './ClientSwitcher';

const renderSwitcher = (overrides: Partial<ActiveClientContextType> = {}) => {
  const setActiveClient = vi.fn();
  const value: ActiveClientContextType = {
    clientNumbers: ['00001074', '00002000', '00003111'],
    activeClient: '00001074',
    setActiveClient,
    canSwitch: true,
    ...overrides,
  };

  render(
    <ActiveClientContext.Provider value={value}>
      <ClientSwitcher />
    </ActiveClientContext.Provider>,
  );

  return { setActiveClient };
};

describe('ClientSwitcher', () => {
  it('lists every client the user is entitled to, with the active one selected', async () => {
    renderSwitcher();

    const trigger = screen.getByRole('combobox', { name: /active client/i });
    // Vitest 5 made toHaveTextContent an exact match; the trigger also renders the
    // Carbon dropdown's 'Open menu' label, so this is the substring assertion.
    expect(trigger).toMatchTextContent('00001074');

    await userEvent.click(trigger);

    for (const clientNumber of ['00001074', '00002000', '00003111']) {
      expect(screen.getByRole('option', { name: clientNumber })).toBeInTheDocument();
    }
  });

  it('switches to the client the user picks', async () => {
    const { setActiveClient } = renderSwitcher();

    await userEvent.click(screen.getByRole('combobox', { name: /active client/i }));
    await userEvent.click(screen.getByRole('option', { name: '00003111' }));

    expect(setActiveClient).toHaveBeenCalledWith('00003111');
  });

  it('says how many clients are available and what switching affects', () => {
    renderSwitcher();

    expect(screen.getByText(/3 clients available/i)).toBeInTheDocument();
    expect(screen.getByText(/limited to the selected client/i)).toBeInTheDocument();
  });

  /**
   * The common case. A user with one client has no decision to make, so the control would only add
   * noise to the profile panel — and an internal user has no client scope at all.
   */
  it('renders nothing when there is no choice to make', () => {
    const { container } = render(
      <ActiveClientContext.Provider
        value={{
          clientNumbers: ['00001074'],
          activeClient: '00001074',
          setActiveClient: vi.fn(),
          canSwitch: false,
        }}
      >
        <ClientSwitcher />
      </ActiveClientContext.Provider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an internal user with no client scope', () => {
    const { container } = render(
      <ActiveClientContext.Provider
        value={{
          clientNumbers: [],
          activeClient: undefined,
          setActiveClient: vi.fn(),
          canSwitch: false,
        }}
      >
        <ClientSwitcher />
      </ActiveClientContext.Provider>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
