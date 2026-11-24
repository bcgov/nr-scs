import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WhoDidIt, { type WhoDidItAudit } from './index';
import * as authModule from '@/context/auth/useAuth';

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(authModule.useAuth);

const asIdirUser = () =>
  mockUseAuth.mockReturnValue({
    user: { userName: 'jdoe', idpProvider: 'IDIR', privileges: {} },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn(),
  } as unknown as ReturnType<typeof authModule.useAuth>);

const openPopup = () => fireEvent.click(screen.getByRole('button', { name: /who did it/i }));

/** Reads the value that sits next to a given label in the audit list. */
const valueForLabel = (label: string): string | null | undefined => {
  const labelCell = screen.getByText(label);
  return labelCell.parentElement?.querySelector<HTMLElement>('.who-did-it__value')?.textContent;
};

describe('WhoDidIt (UC-SYS-005)', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('S01: an IDIR user opens the popup and sees all five audit fields with their values', () => {
    asIdirUser();
    const audit: WhoDidItAudit = {
      entryTimestamp: '2023-10-15 14:30:22',
      entryUserid: 'IDIR\\creator',
      updateTimestamp: '2024-01-02 09:15:00',
      updateUserid: 'IDIR\\editor',
      revisionCount: 4,
    };

    render(<WhoDidIt audit={audit} />);
    openPopup();

    expect(screen.getByText('When Created:')).toBeInTheDocument();
    expect(screen.getByText('Who Created:')).toBeInTheDocument();
    expect(screen.getByText('When Updated:')).toBeInTheDocument();
    expect(screen.getByText('Who Updated:')).toBeInTheDocument();
    expect(screen.getByText('Revision Count:')).toBeInTheDocument();

    expect(screen.getByText('2023-10-15 14:30:22')).toBeInTheDocument();
    expect(screen.getByText('IDIR\\creator')).toBeInTheDocument();
    expect(screen.getByText('2024-01-02 09:15:00')).toBeInTheDocument();
    expect(screen.getByText('IDIR\\editor')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders the ISO instant in Pacific (Vancouver) time as YYYY-MM-DD hh:mm:ss', () => {
    asIdirUser();
    render(
      <WhoDidIt
        audit={{
          entryTimestamp: '2023-10-15T14:30:22.123Z',
          entryUserid: 'SCS',
          revisionCount: null,
        }}
      />,
    );
    openPopup();

    // 14:30:22 UTC on 2023-10-15 is 07:30:22 in Vancouver (PDT, UTC-7).
    expect(valueForLabel('When Created:')).toBe('2023-10-15 07:30:22');
    // A real stored value (even a system id like SCS) is shown as-is.
    expect(valueForLabel('Who Created:')).toBe('SCS');
    // A null revision count is blank, NOT defaulted to 0.
    expect(valueForLabel('Revision Count:')).toBe('');
  });

  it('renders blank (not a default) for every absent field', () => {
    asIdirUser();
    render(<WhoDidIt audit={{}} />);
    openPopup();

    expect(valueForLabel('When Created:')).toBe('');
    expect(valueForLabel('Who Created:')).toBe('');
    expect(valueForLabel('When Updated:')).toBe('');
    expect(valueForLabel('Who Updated:')).toBe('');
    expect(valueForLabel('Revision Count:')).toBe('');
  });

  it('has a Close button at the bottom that dismisses the popup', () => {
    asIdirUser();
    render(<WhoDidIt audit={{ revisionCount: 1 }} />);
    openPopup();

    // The dialog is portaled to <body>, so query the document, not the render container.
    const modal = document.querySelector('.who-did-it-modal');
    expect(modal).toHaveClass('is-visible');

    // The bottom Close button is the footer's primary action (distinct from the header X).
    const closeButton = modal?.querySelector('.cds--modal-footer .cds--btn--primary');
    expect(closeButton).toBeTruthy();
    expect(closeButton).toHaveTextContent('Close');
    fireEvent.click(closeButton as Element);

    expect(modal).not.toHaveClass('is-visible');
  });

  it('renders nothing for a non-IDIR user (legacy gating)', () => {
    mockUseAuth.mockReturnValue({
      user: { userName: 'ext', idpProvider: 'BCEIDBUSINESS', privileges: {} },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
    } as unknown as ReturnType<typeof authModule.useAuth>);

    const { container } = render(<WhoDidIt audit={{ revisionCount: 1 }} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /who did it/i })).not.toBeInTheDocument();
  });
});
