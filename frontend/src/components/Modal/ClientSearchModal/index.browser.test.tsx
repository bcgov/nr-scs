import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import ClientSearchModal from './index';

// Keep the heavy real search page out of this test — we only care about event propagation.
vi.mock('@/pages/Queries/Client', () => ({
  default: () => <input aria-label="Company Name" />,
}));

describe('ClientSearchModal nested-modal propagation', () => {
  /**
   * The modal is portaled to document.body but stays a React descendant of whatever modal
   * opened it. React synthetic events bubble the React tree across portals, so a click on a
   * field inside must NOT reach the outer modal's click-outside handler (stand-in: the outer
   * div's onClick) — otherwise the outer modal dismisses and both modals close.
   */
  it('does not bubble inner-field clicks up to the surrounding (outer) modal', async () => {
    const outerClick = vi.fn();
    const onRequestClose = vi.fn();

    render(
      <div onClick={outerClick}>
        <ClientSearchModal open onRequestClose={onRequestClose} />
      </div>,
    );

    await userEvent.click(screen.getByLabelText('Company Name'));

    // Neither the outer modal nor this modal's own dismiss should fire from an in-field click.
    expect(outerClick).not.toHaveBeenCalled();
    expect(onRequestClose).not.toHaveBeenCalled();
    // Inner modal stays open.
    expect(screen.getByLabelText('Company Name')).toBeTruthy();
  });
});
